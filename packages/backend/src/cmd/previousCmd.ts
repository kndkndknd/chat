import { previousState } from "../state";
import { cmdEmit } from "./cmdEmit";
import { sinewaveEmit } from "./sinewaveEmit";
import { emitChatReq } from "../stream/chat/emitChatReq";
import { emitStream } from "../stream/emitStream";

export const previousCmd = () => {
  console.log("previous sinewave", previousState.sinewave);
  console.log("previous cmd", previousState.cmd);
  console.log("previous stream", previousState.stream);
  for (let cmd in previousState.cmd) {
    previousState.cmd[cmd].forEach((target) => {
      cmdEmit(cmd, target);
    });
  }
  for (let stream in previousState.stream) {
    if (previousState.stream[stream]) {
      if (stream === "CHAT") {
        console.log("chat previous");
        emitChatReq();
      } else {
        emitStream(stream);
      }
    }
  }
  for (let target in previousState.sinewave) {
    console.log(previousState.sinewave[target]);
    sinewaveEmit(previousState.sinewave[target], target);
  }
};
