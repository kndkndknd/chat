import { currentState, cmdState } from "../state";
import { pushStateStream } from "./pushStateStream";
import { broadcastEmit, targetEmit } from "../webSocket";

export const recordEmit = (option?: {target?: string, source?: string}) => {
  const { target, source } = option || {};
  console.log("record target", target);
  // if (!currentState.RECORD) {
  currentState.RECORD = true;
  let recordSource = "PLAYBACK";
  if (source && source !== undefined) {
    recordSource = source;
    pushStateStream(source);
  }
  
  if (target && target !== undefined) {
    console.log(`target: ${target}`);
    targetEmit(target, {
      type: "streamReq",
      payload: {
        record: true,
        source: recordSource,
        timeout: 10000,
      },
    });
  } else {
    console.log("all");
    broadcastEmit({
      type: "streamReq",
      payload: {
        record: true,
        source: recordSource,
        timeout: 10000,
      },
    });
  }
  if (cmdState.VOICE.length > 0) {
    cmdState.VOICE.forEach((element) => {
      //          io.to(element).emit('voiceFromServer', 'RECORD')
      targetEmit(element, {
        type: "voice",
        payload: {
          text: "RECORD",
          lang: cmdState.voiceLang,
        },
      });
    });
  }
  //     setTimeout(() => {
  //       currentState.RECORD = false;
  //     }, 10000);
  //   } else {
  //     currentState.RECORD = false;
  //   }
};

// export const recordAsOtherEmit = (source: string, target?: string) => {
//   console.log("target", target);
//   if (!currentState.RECORD) {
//     console.log(`start record as ${source}`);
//     currentState.RECORD = true;
//     pushStateStream(source);
//     if (target && target !== undefined) {
//       console.log(`target: ${target}`);
//       targetEmit(target, {
//         type: "streamReq",
//         payload: {
//           record: true,
//           source: source,
//           timeout: 10000,
//         },
//       });
//       //
//     } else {
//       console.log("all");
//       broadcastEmit({
//         type: "streamReq",
//         payload: {
//           record: true,
//           source: source,
//           timeout: 10000,
//         },
//       });
//     }
//     if (cmdState.VOICE.length > 0) {
//       cmdState.VOICE.forEach((element) => {
//         //          io.to(element).emit('voiceFromServer', 'RECORD')
//         targetEmit(element, {
//           type: "voice",
//           payload: {
//             text: "RECORD",
//             lang: cmdState.voiceLang,
//           },
//         });
//       });
//     }
//   } else {
//     console.log(`stop record as ${source}`);
//     currentState.RECORD = false;
//   }
// };
