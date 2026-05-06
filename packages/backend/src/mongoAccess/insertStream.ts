import dotenv from "dotenv";
import path from "path";

import { streamsRedis } from "../data";
import { stringEmit } from "../socket/ioEmit";

const dotenvPath = path.resolve(__dirname, "../../../../.env");
dotenv.config({ path: dotenvPath });

const ipaddress = process.env.DB_HOST;
console.log("IP Address:", ipaddress);

export const insertStream = async (
  type: string,
  place: string,
  date: string
) => {
  try {
    console.log(ipaddress);
    const buffLen = await streamsRedis.getLength(type);

    for (let index = 0; index < buffLen; index++) {
      await setTimeout(async () => {
        const entry = await streamsRedis.get(type, index);
        const audioStr = btoa(String.fromCharCode(...new Uint8Array(entry.audio)));
        await postStream(type, entry.video, audioStr, place, date);
      }, 1000);
    }

    stringEmit("INSERT DONE", true);
  } catch (error) {
    console.log(error);
    stringEmit("INSERT ERROR", true);
  }
};

const postStream = async (
  type: string,
  video: string,
  audio: string,
  place: string,
  date: string
) => {
  const body = {
    type: type,
    video: video,
    audio: audio,
    location: place,
    name: date,
  };
  const options = {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const res = await fetch("http://" + ipaddress + ":3030/insert", options);
    if (res.body != null) {
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(value);
          return;
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
};
