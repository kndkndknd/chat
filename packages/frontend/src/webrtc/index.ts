import { textPrint } from "../canvasEvent";
import { webRtcFrontState } from "../state";

export const initRtpPeerConnection = (
  io,
  localStream: MediaStream,
  peers: string[]
): void => {
  if (!webRtcFrontState.isInitialized) {
    console.log("initRtpPeerConnection");
    webRtcFrontState.peerConnection = new RTCPeerConnection();
    webRtcFrontState.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("New ICE candidate: ", event.candidate);
        io.emit("iceCandidateFromClient", event.candidate);
      }
    };

    // remote streamの受信時動作
    webRtcFrontState.remoteVideo = document.getElementById(
      "remoteVideo"
    ) as HTMLVideoElement;
    webRtcFrontState.peerConnection.ontrack = (event) => {
      console.log("Remote track received: ", event.streams[0]);
      if (webRtcFrontState.remoteVideo) {
        webRtcFrontState.remoteVideo.srcObject = event.streams[0];
        // webRtcFrontState.remoteVideo.play();
      }
    };

    // local streamをpeer connectionに追加
    localStream.getTracks().forEach((track) => {
      webRtcFrontState.peerConnection?.addTrack(track, localStream);
    });

    webRtcFrontState.peers = peers;
    webRtcFrontState.isInitialized = true;
  } else {
    console.log("RtpPeerConnection already initialized");
  }
};

export const receiveIceCandidate = async (candidate): Promise<void> => {
  if (!webRtcFrontState.isCandidated) {
    console.log("receiveIceCandidate");
    try {
      await webRtcFrontState.peerConnection?.addIceCandidate(candidate);
      console.log("ICE candidate added: ", candidate);
      webRtcFrontState.isCandidated = true;
    } catch (error) {
      console.error("Error adding received ICE candidate", error);
      textPrint("Error adding received ICE candidate");
    }
  } else {
    console.log("ICE candidate already added");
  }
};

export const createOffer = async (io): Promise<void> => {
  console.log("createOffer");
  const offer = await webRtcFrontState.peerConnection?.createOffer();
  if (offer) {
    await webRtcFrontState.peerConnection?.setLocalDescription(offer);
    console.log("Local description set with offer: ", offer);
    io.emit("offerFromClient", offer);
  } else {
    textPrint("Offer creation failed");
  }
};

export const receiveOffer = async (
  socket,
  data: {
    offer: RTCSessionDescriptionInit;
    sourceId: string;
  }
): Promise<void> => {
  console.log("reseiveOffer");
  try {
    await webRtcFrontState.peerConnection?.setRemoteDescription(data.offer);
    const answer = await webRtcFrontState.peerConnection?.createAnswer();
    if (answer) {
      await webRtcFrontState.peerConnection?.setLocalDescription(answer);
      console.log("Local description set with answer: ", answer);
      socket.emit("answerFromClient", {
        answer: webRtcFrontState.peerConnection?.localDescription,
        targetId: data.sourceId,
      });
      textPrint("Answer created and sent");
    } else {
      textPrint("Answer creation failed");
    }
  } catch (error) {
    textPrint("Error setting remote description from offer");
    console.error("Error setting remote description from offer", error);
  }
};

export const createAnswer = async (io): Promise<void> => {
  console.log("createAnswer");
  const answer = await webRtcFrontState.peerConnection?.createAnswer();
  try {
    if (answer) {
      await webRtcFrontState.peerConnection?.setLocalDescription(answer);
      console.log("Local description set with answer: ", answer);
      await io.emit(
        "answerFromClient",
        webRtcFrontState.peerConnection?.localDescription
      );
    } else {
      textPrint("Answer creation failed");
    }
  } catch (error) {
    textPrint("Error creating or setting local description for answer");
    console.error(
      "Error creating or setting local description for answer",
      error
    );
  }
};

export const receiveAnswer = async (
  answer: RTCSessionDescription
): Promise<void> => {
  console.log("reseiveAnswer", answer);
  await webRtcFrontState.peerConnection?.setRemoteDescription(answer);
};
