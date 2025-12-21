import { streamState, torchState } from "../state";
import { textPrint, erasePrint } from "../canvasEvent";
import { AnyARecord } from "node:dns";

export const initTorch = () => {
  streamState.videoTrack = streamState.stream.getVideoTracks()[0];
};

export const torchToggle = async (flag: boolean): Promise<void> => {
  if (!streamState.videoTrack) return;
  try {
    const capabilities = streamState.videoTrack.getCapabilities();
    if ("torch" in capabilities) {
      await streamState.videoTrack.applyConstraints({
        advanced: [{ torch: flag } as any],
      });
    } else {
      torchState.isSupported = false;
      textPrint("Torch is not supported on this device");
      setTimeout(() => {
        erasePrint();
      }, 500);
      return;
    }
  } catch (e) {
    textPrint("Cannot access video track for torch control");
    setTimeout(() => {
      erasePrint();
    }, 500);
  }
  // console.log("track length:", streamState.stream?.getVideoTracks().length);
  // try {
  //   streamState.stream?.getVideoTracks().forEach((track) => {
  //     track.applyConstraints({ advanced: [{ torch: flag }] });
  //   });
  // } catch (e) {
  //   torchState.isSupported = false;
  //   console.log("Torch is not supported on this device", e);
  // }
};

export const startBlink = (bpm: number) => {
  let isOn = false;
  torchState.torchIntervalId = window.setInterval(async () => {
    isOn = !isOn;
    await torchToggle(isOn);
  }, (60 / bpm) * 1000);
};

export const stopBlink = async (): Promise<void> => {
  if (torchState.torchIntervalId !== null) {
    clearInterval(torchState.torchIntervalId);
    torchState.torchIntervalId = null;
  }
  await torchToggle(false);
};

// export const torchBlink = (flag: boolean, bpm: number) => {
//   if (flag) {
//     if (torchState.torchIntervalId !== null) {
//       clearInterval(torchState.torchIntervalId);
//     }
//     const interval = (60 / bpm) * 1000;
//     torchState.torchIntervalDuration =
//       torchState.torchIntervalDuration > interval / 2
//         ? interval / 2
//         : torchState.torchIntervalDuration;
//     torchState.torchIntervalId = window.setInterval(() => {
//       torchToggle(true);
//       setTimeout(() => {
//         torchToggle(false);
//       }, torchState.torchIntervalDuration);
//     }, torchState.torchIntervalDuration) as unknown as number;
//     torchState.torchOn = true;
//     torchState.torchInterval = interval;
//     torchState.torchMode = "blink";
//   } else {
//     if (torchState.torchIntervalId !== null) {
//       clearInterval(torchState.torchIntervalId);
//     }
//     torchState.torchOn = false;
//     torchToggle(false);
//   }
// };
