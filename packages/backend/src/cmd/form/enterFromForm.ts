import { formState } from "../../states";
import { receiveEnter } from "../receiveEnter";
import SocketIO from "socket.io";
// import { playHLS } from "../../stream/hls/playHls";

export const enterFromForm = (string: string, io: SocketIO.Server) => {
  const cmdArr = Object.keys(formState.cmd).filter((key) => {
    return string.includes(key);
  });

  const hlsArr = Object.keys(formState.hls).filter((key) => {
    return string.includes(key);
  });

  console.log("cmdArr", cmdArr);
  console.log("hlsArr", hlsArr);
  if (cmdArr.length > 0) {
    cmdArr.forEach((cmd) => {
      receiveEnter(formState.cmd[cmd], "form", io);
    });
    if (hlsArr.length > 0) {
      hlsArr.forEach((hls) => {
        // playHLS(formState.hls[hls], io);
      });
    }
  } else {
    if (hlsArr.length > 0) {
      hlsArr.forEach((hls) => {
        // playHLS(formState.hls[hls], io);
      });
    } else {
      return false;
    }
  }

  return true;
};
