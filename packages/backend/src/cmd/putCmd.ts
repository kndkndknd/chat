import SocketIO from "socket.io";
import { switchOneshot } from "../arduinoAccess/arduinoAccess";
// import { time } from "console";
import { clientState, arduinoState } from "../state";

export const putCmd = (
  io: SocketIO.Server,
  idArr: Array<string>,
  cmd: {
    cmd: string;
    value?: number;
    flag?: boolean;
    fade?: number;
    portament?: number;
    gain?: number;
  }
) => {
  console.log('idArr', idArr);
  idArr.forEach((id) => {
    io.to(id).emit("cmdFromServer", cmd);
    console.log(id);
    if (
      clientState.client[id] !== undefined &&
      clientState.client[id].urlPathName.includes("pi") &&
      arduinoState.connected
    ) {
      let timeout = cmd.cmd === "CLICK" || cmd.cmd === "STOP" ? 100 : 500;
      const result = switchOneshot(timeout);
      console.log("putCmd: switchOneshot", result);
    }
  });
  /*
  if(state.cmd.VOICE.length > 0) {
    state.cmd.VOICE.forEach((element) => {
      io.to(element).emit('voiceFromServer', cmd.cmd)
    })
  }
  */
};
