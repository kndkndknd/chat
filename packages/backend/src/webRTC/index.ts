import { webRtcServerState, clientState } from "../state";
import { stringEmit } from "../socket/ioEmit";
import { targetEmit } from "../webSocket";

export const joinOrLeave = (type: "JOIN" | "LEAVE", id: string): void => {
  if (clientState.client[id]?.snowLeopard) {
    stringEmit("Snow Leopard client cannot join room.", true, id);
    return;
  }
  const room = webRtcServerState.rooms.get(webRtcServerState.roomId);
  if (type === "JOIN") {
    if (!webRtcServerState.rooms.has(webRtcServerState.roomId)) {
      webRtcServerState.rooms.set(webRtcServerState.roomId, {
        members: new Set<string>(),
      });
    }
    room?.members.add(id);
    // const peers = Array.from(room?.members || []);
    webRtcServerState.member.push(id);
    // io.to(id).emit("candidateReqFromServer", webRtcServerState.member);
    targetEmit(id, {
      type: "webrtc",
      payload: {
        type: "candidateReq",
        member: webRtcServerState.member,
      },
    });
    // Notify existing members about the new member
    webRtcServerState.member.forEach((memberId) => {
      if (memberId !== id) {
        // io.to(memberId).emit("joinInfoFromServer", id);
        targetEmit(memberId, {
          type: "webrtc",
          payload: {
            type: "joinInfo",
            id,
          },
        });
      }
    });
  } else if (type === "LEAVE") {
    const room = webRtcServerState.rooms.get(webRtcServerState.roomId);
    room?.members.delete(id);
    if (
      webRtcServerState.rooms.get(webRtcServerState.roomId)?.members.size === 0
    ) {
      webRtcServerState.rooms.delete(webRtcServerState.roomId);
    }
    webRtcServerState.member = webRtcServerState.member.filter(
      (element) => element !== id,
    );
    webRtcServerState.member.forEach((memberId) => {
      targetEmit(memberId, {
        type: "webrtc",
        payload: {
          type: "leaveInfo",
          id,
        },
      });
      // io.to(memberId).emit("leaveInfoFromServer", id);
    });
  }
  console.log("member: ", webRtcServerState.member);
};

export const offerReq = (id: string): void => {
  console.log("offer Req " + id);
  // io.to(id).emit("offerRequestFromServer");
  targetEmit(id, {
    type: "webrtc",
    payload: {
      type: "offerReq",
    },
  });
};

export const answerReq = (id: string): void => {
  console.log("answer Req " + id);
  // io.to(id).emit("answerReqFromServer");
  targetEmit(id, {
    type: "webrtc",
    payload: {
      type: "answerReq",
    },
  });
};

export const iceCandidateEmit = (
  candidate: RTCIceCandidateInit,
  id: string,
): void => {
  console.log("iceCandidateEmit to members except ", id);
  webRtcServerState.member.forEach((memberId) => {
    if (memberId !== id) {
      // io.to(memberId).emit("iceCandidateFromServer", candidate);
      targetEmit(memberId, {
        type: "webrtc",
        payload: {
          type: "iceCandidate",
          candidate,
        },
      });
    }
  });
  // webRtcServerState.rooms
  //   .get(webRtcServerState.roomId)
  //   ?.members.forEach((memberId) => {
  //     if (memberId !== id) {
  //       io.to(memberId).emit("iceCandidateFromServer", candidate);
  //     }
  //   });
};

export const offerEmit = (
  offer: RTCSessionDescriptionInit,
  id: string,
): void => {
  console.log("offerEmit to members except ", id);
  webRtcServerState.member.forEach((memberId) => {
    if (memberId !== id) {
      // io.to(memberId).emit("offerFromServer", { offer, sourceId: id });
      targetEmit(memberId, {
        type: "webrtc",
        payload: {
          type: "offer",
          offer,
          sourceId: id,
        },
      });
    }
  });
  // webRtcServerState.rooms
  //   .get(webRtcServerState.roomId)
  //   ?.members.forEach((memberId) => {
  //     if (memberId !== id) {
  //       io.to(memberId).emit("offerFromServer", offer);
  //     }
  //   });
};

export const answerEmit = (
  answer: RTCSessionDescription,
  targetId: string,
): void => {
  console.log("answerEmit to ", targetId);
  if (webRtcServerState.member.includes(targetId)) {
    // io.to(targetId).emit("answerFromServer", answer);
    targetEmit(targetId, {
      type: "webrtc",
      payload: {
        type: "answer",
        answer,
      },
    });
  }
  // webRtcServerState.member.forEach((memberId) => {
  //   if (memberId !== id) {
  //     io.to(memberId).emit("answerFromServer", answer);
  //   }
  // });
  // webRtcServerState.rooms
  //   .get(webRtcServerState.roomId)
  //   ?.members.forEach((memberId) => {
  //     if (memberId !== id) {
  //       io.to(memberId).emit("answerFromServer", answer);
  //     }
  //   });
};
