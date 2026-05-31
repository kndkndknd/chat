import { SocketFacade } from "./socket/SocketFacade";
import {
  flagState,
  sensorState,
  timelapseState,
  torchState,
  audioWorkletState,
  streamState,
} from "./state";
import { initAudio } from "./webaudio";
import {
  initVideo,
  initVideoStream,
  textPrint,
  erasePrint,
} from "./canvasEvent";
import { initAudioStream } from "./stream";
import { getAcceleration } from "./sensor";
import { getGPSPosition } from "./gps";
import { accelarateOsc, gpsOsc, feedback } from "./webaudio";
import { chatWorklet } from "./audioWorklet/chatWorklet";
import { initGainUI } from "./ui/gainUI";
// import { initRecordButton } from "./recording";
// import { toggleRecording } from "./recording";

// counterbalance: 加速度(重力なし)X/Y/ZのRMSをfeedbackGainに反映する際のスケール係数。
// RMSは概ね0〜十数の範囲になり得るため、gain(0〜2程度)に収まるよう縮小する。調整可能。
const COUNTERBALANCE_GAIN_SCALE = 0.1;
// feedbackGain更新時のフェード時定数(秒)。500ms間隔での値の変化を滑らかにする。
const COUNTERBALANCE_FADE = 0.3;

export const initialize = async (
  socket: SocketFacade,
): Promise<MediaStream | null> => {
  // ): Promise<void> => {
  erasePrint();

  // URLが /counterbalance を含む場合は加速度センサーを有効にし、
  // 加速度RMSをfeedbackGainへ反映するモードにする。
  flagState.counterbalanceFlag =
    window.location.pathname.includes("counterbalance");
  await initVideo();
  await initAudio();

  const SUPPORTS_MEDIA_DEVICES = "mediaDevices" in navigator;
  const SUPPORTED_CONSTRAINTS =
    navigator.mediaDevices.getSupportedConstraints();
  console.log("SUPPORTED_CONSTRAINTS:", SUPPORTED_CONSTRAINTS);
  const torchSupported = "torch" in SUPPORTED_CONSTRAINTS;
  torchState.isSupported = torchSupported;
  if (SUPPORTS_MEDIA_DEVICES && navigator.mediaDevices.getUserMedia) {

    const devices = await navigator.mediaDevices.enumerateDevices();
    /*
    const cameras = devices.filter((device) => device.kind === "videoinput");
    if (cameras.length === 0) {
      throw "No camera found on this device.";
    }
    //    const camera = cameras[cameras.length - 1]
    const camera = cameras[0];
    */
    const mics = devices.filter((device) => device.kind === "audioinput");
    console.log(mics);
    console.log("mic length", mics.length);
    // if(window.location.pathname.includes("pi")){

    // }
    /*
    const mic = mics.filter((element)=>{
      if(element.label.includes("Microphone Array")){
        console.log(element.label)
        return element
      }
    })[0]
    console.log(mics)
    console.log(mic)
    */
    const audioOption = window.location.pathname.includes("pi")
      ? {
          sampleRate: { ideal: 44100 },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          deviceId: mics[2].deviceId,
        }
      : {
          sampleRate: { ideal: 44100 },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        };

    // streamState.stream = !flagState.isMobile
    // const stream = !flagState.isMobile ?
    const stream = await navigator.mediaDevices.getUserMedia({
      // 通話をスムーズにするため、取得段階で解像度と fps を絞る。
      // 送信元 (Raspberry Pi 等) のエンコード負荷と帯域を下げるのが狙い。
      // 360p/20fps を上限とし、非対応ならブラウザが近い値にフォールバックする。
      video: {
        width: { ideal: 640, max: 640 },
        height: { ideal: 360, max: 360 },
        frameRate: { ideal: 20, max: 20 },
        //facingMode: 'environment'
        // deviceId: camera.deviceId,
        // facingMode: ['user', 'environment'],
      },
      audio: audioOption,
    });
    // : await navigator.mediaDevices.getUserMedia({
    //     video: {
    //       facingMode: "environment",
    //       torch: true,
    //     },
    //     audio: audioOption,
    //   });
    await initAudioStream(stream);
    await initVideoStream(stream);
    // await initAudioStream(streamState.stream);
    // await initVideoStream(streamState.stream);
    // await console.log(stream);
    await chatWorklet(stream, socket);
    await initGainUI();
    await textPrint("initialized", { timeout: true });
    await socket.emit("connectFromClient", {
      clientMode:
        window.location.pathname.includes("noStream") ||
        window.location.pathname.includes("nostream")
          ? "noStream"
          : "client",
      urlPathName: window.location.pathname,
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: sensorState.isMobile,
    });

    // chat_sync ピアがまだ起動していなければ CALL と同等の起動を促す。
    // backend 側で冪等にチェックされるため複数クライアントから同時に呼ばれても安全。
    socket.emit("ensureWebRtcFromClient");

    if (sensorState.isMobile || flagState.counterbalanceFlag) {
      sensorState.sensorTimeIntervalId = window.setInterval(() => {
        // counterbalance: 重力を除いた加速度のX/Y/ZからRMSを算出し、
        // 係数でスケールしてfeedbackGainへ反映する。
        if (flagState.counterbalanceFlag) {
          getAcceleration(false)
            .then((acceleration) => {
              sensorState.accelerationData.x = acceleration.x;
              sensorState.accelerationData.y = acceleration.y;
              sensorState.accelerationData.z = acceleration.z;
              sensorState.accelerationData.timestamp = acceleration.timestamp;
              const rms = Math.sqrt(
                (Math.pow(acceleration.x, 2) +
                  Math.pow(acceleration.y, 2) +
                  Math.pow(acceleration.z, 2)) /
                  3,
              );
              feedback(true, COUNTERBALANCE_FADE, rms * COUNTERBALANCE_GAIN_SCALE);
            })
            .catch((error) => {
              console.error("counterbalance加速度の取得に失敗:", error);
            });
        }
        if (sensorState.isMobile) {
          getAcceleration()
            .then((acceleration) => {
              sensorState.accelerationData.x = acceleration.x;
              sensorState.accelerationData.y = acceleration.y;
              sensorState.accelerationData.z = acceleration.z;
              sensorState.accelerationData.timestamp = acceleration.timestamp;
            })
            .catch((error) => {
              console.error("加速度センサーの取得に失敗:", error);
            });
        }
        if (flagState.gpsFlag) {
          getGPSPosition()
            .then((position) => {
              sensorState.gpsPosition.latitude = position.latitude;
              sensorState.gpsPosition.longitude = position.longitude;
            })
            .catch((error) => {
              console.error("GPS位置情報の取得に失敗:", error);
            });
          const frequency =
            20 +
            440 *
              Math.sqrt(
                Math.pow(
                  sensorState.gpsPosition.latitude -
                    sensorState.gpsPosition.originlat,
                  2,
                ) +
                  Math.pow(
                    sensorState.gpsPosition.longitude -
                      sensorState.gpsPosition.originlng,
                    2,
                  ),
              );
          gpsOsc(true, frequency, 0, 1, 1);
          textPrint(String(frequency) + "Hz");
        } else {
          gpsOsc(false, 440, 0, 1, 1);
        }
        if (flagState.accelarateFlag) {
          const frequency =
            20 +
            20 *
              Math.sqrt(
                Math.pow(sensorState.accelerationData.x, 2) +
                  Math.pow(sensorState.accelerationData.y, 2) +
                  Math.pow(sensorState.accelerationData.z, 2),
              );
          accelarateOsc(true, frequency, 0, 1, 1);
          textPrint(String(frequency) + "Hz");
        } else {
          accelarateOsc(false, 440, 0, 1, 1);
        }
      }, 500);
    } else {
      console.log("GPSまたは加速度センサーがサポートされていません");
    }

    flagState.start = true;
    // initRecordButton(stream);
    // 注: ここで startChunkedRecording を呼ぶと MediaRecorder が CALL 前から
    //     動き出し、CALL 時点で MediaRecorder は mid-stream (EBML 無し) になる。
    //     ffmpeg が EBML を見つけられず probe 失敗するため、MediaRecorder の起動は
    //     bufferRecReqFromServer ハンドラ (CALL 経由) に任せる。
    // streamFlag.timelapse = true;
    timelapseState.flag = true;
    // timelapseState.trriger = false;
    audioWorkletState.chat.flag.TIMELAPSE = false;
    timelapseState.setIntervalId = window.setInterval(() => {
      if (timelapseState.flag) {
        audioWorkletState.chat.flag.TIMELAPSE = true;
      }
    }, 60000);
    // await toggleRecording(stream);


    return stream;
  } else {
    // "not support navigator.mediaDevices.getUserMedia";
    return null;
  }
};
