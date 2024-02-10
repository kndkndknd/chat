import { streams } from "../states";

export const clearBuffer = (source?: string) => {
  if(source === "BUFFER" || source === undefined){
    for(let stream in streams){
      if(stream !== "CHAT" && stream !== "EMPTY" && stream !== "KICK" && stream !== "SNARE" && stream !== "HAT")){
        streams[key].audio = [];
        streams[key].video = [];
      }
    }
  } else if(streamList.includes(source)){
    streams[stringArr[1]].audio = [];
    streams[stringArr[1]].video = [];
  }
}
