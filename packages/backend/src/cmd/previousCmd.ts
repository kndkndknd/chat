import { previousState } from "../state";
import { execCmd } from "./execCmd";
import { execStream } from "../stream/execStream";
import { execSinewave } from "./execSinewave";
import { chatPreparation } from "../stream/chatPreparation";

export const previousCmd = () => {
  console.log("previous sinewave", previousState.sinewave);
  console.log("previous cmd", previousState.cmd);
  console.log("previous stream", previousState.stream);
  for (let cmd in previousState.cmd) {
    previousState.cmd[cmd].forEach((target) => {
      execCmd(cmd, target);
    });
  }
  for (let stream in previousState.stream) {
    if (previousState.stream[stream]) {
      if (stream === "CHAT") {
        console.log("chat previous");
        chatPreparation();
      } else {
        execStream(stream);
      }
    }
  }
  for (let target in previousState.sinewave) {
    console.log(previousState.sinewave[target]);
    execSinewave(previousState.sinewave[target], target);
  }
};
