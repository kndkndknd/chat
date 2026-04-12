import { clear } from "console";
import { streamState } from "../../state"
import { emitTimelapse } from "./emitTimelapse";

export const timelapseInterval = (flag: boolean = true) => {
  if (!flag) {
    console.log("stop timelapse interval");
    clearInterval(streamState.timelapseInterval);
    streamState.timelapseInterval = null;
    return
  }
  console.log("start timelapse interval");
  if (streamState.timelapseInterval) {
    clearInterval(streamState.timelapseInterval);
    streamState.timelapseInterval = null;
  }
  streamState.timelapseInterval = setInterval(() => {
    emitTimelapse(true);
    console.log("Timelapse interval emitted");
  }, streamState.timelapseIntervalValue);
}
