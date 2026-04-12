import { cmdState, clientState } from "../state";
import { stringEmit } from "../socket/ioEmit";
import { notTargetEmit } from "../cmd/notTargetEmit";

export const voiceChange = (arg?: {
  source?: string;
  value?: number;
  property?: string;
}) => {
  if (arg && arg.source) {
    if (arg.value === undefined) {
      let flag = false;
      if (cmdState.VOICE.includes(arg.source)) {
        // sourceが既にVOICEに含まれている場合取り除く
        const arr = [];
        for (let i = 0; i < cmdState.VOICE.length; i++) {
          if (cmdState.VOICE[i] === arg.source) {
            continue;
          } else {
            arr.push(cmdState.VOICE[i]);
          }
        }
        cmdState.VOICE = arr;
        // cmdState.VOICE.filter((id) => {
        // })
        console.log(cmdState.VOICE);
      } else {
        cmdState.VOICE.push(arg.source);
        flag = true;
      }
      // io.emit('stringsFromServer',{strings: 'VOICE: ' + String(flag), timeout: true})
      stringEmit("VOICE: " + String(flag), true, arg.source);
      notTargetEmit(arg.source, Object.keys(clientState.client));
    } else {
      if (arg.value === 0) {
        let filtered: string[] = cmdState.VOICE.filter(
          (element) => element !== arg.source,
        );
        cmdState.VOICE = filtered;
        stringEmit("VOICE: false", true, arg.source);
        notTargetEmit(arg.source, Object.keys(clientState.client));
      } else {
        if (!cmdState.VOICE.includes(arg.source)) {
          cmdState.VOICE.push(arg.source);
        }
        stringEmit("VOICE: true", true, arg.source);
        notTargetEmit(arg.source, Object.keys(clientState.client));
      }
    }
  }
};
