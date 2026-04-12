import { formState } from "../../states";
import { receiveEnter } from "../receiveEnter";
import SocketIO from "socket.io";

export const enterFromForm = (string: string, io: SocketIO.Server) => {
  const cmdArr = Object.keys(formState.cmd).filter((key) => {
    return string.includes(key);
  });

  console.log("cmdArr", cmdArr);
  if (cmdArr.length > 0) {
    cmdArr.forEach((cmd) => {
      receiveEnter(formState.cmd[cmd], "form");
    });
  } else {
    return false;
  }

  return true;
};
