import { streams } from "../states.js";

export const clearBuffer = (source?: string) => {
  if (source === "BUFFER" || source === undefined) {
    for (let stream in streams) {
      if (
        stream !== "CHAT" &&
        stream !== "EMPTY" &&
        stream !== "KICK" &&
        stream !== "SNARE" &&
        stream !== "HAT"
      ) {
        streams[stream].audio = [];
        streams[stream].video = [];
      }
    }
  } else if (Object.keys(streams).includes(source)) {
    streams[source].audio = [];
    streams[source].video = [];
  }
};
