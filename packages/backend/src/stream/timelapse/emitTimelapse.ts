import { broadcastEmit } from "../../webSocket";

export const emitTimelapse = (flag: boolean = true) => {
  const cmd = flag ? "startReq" : "stopReq";
  broadcastEmit({ type: "streamReq", payload: { source: "TIMELAPSE", cmd: cmd } });
};
