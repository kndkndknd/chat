import { streamsRedis } from "../../data/chunk/streams";
import { stringEmit } from "../../socket/ioEmit";

import dotenv from "dotenv";
import path from "path";

const dotenvPath = path.resolve(__dirname, "../../../../../.env");

export const postChunk = async (
  params: {
    type: string;
    place: string;
    date: string;
    index: number;
  },
  ipaddress: string
): Promise<string> => {
  const audioLen = await streamsRedis.getAudioLength(params.type);
  const videoLen = await streamsRedis.getVideoLength(params.type);
  if (audioLen <= params.index && videoLen <= params.index) {
    stringEmit("NO STREAM DATA", false);
    return;
  }
  const audioArray = await streamsRedis.getAudio(params.type, params.index);
  const videoChunk = await streamsRedis.getVideo(params.type, params.index);
  try {
    const audioChunk = btoa(String.fromCharCode(...new Uint8Array(audioArray)));
    const body = {
      type: params.type,
      video: videoChunk,
      audio: audioChunk,
      location: params.place,
      date: params.date,
    };
    const options = {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const res = await fetch(
        "http://" + ipaddress + ":3030/insertStream",
        options
      );
      if (res.body != null) {
        const reader = res.body
          .pipeThrough(new TextDecoderStream())
          .getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            return "SUCCESS";
          }
        }
      }
    } catch (error) {
      console.log(error);
      return "FETCH ERROR";
    }
  } catch (error) {
    console.log(error);
    return "BYTE ERROR";
  }
};

export const postStream = async (
  params: {
    type: string;
    place: string;
    date: string;
    from: number;
    to: number;
  },
): Promise<string> => {
  dotenv.config({ path: dotenvPath });

  const ipaddress = process.env.DB_HOST;
  console.log("db IP Address:", ipaddress);
  const length = params.to - params.from;
  let count = 0;

  for (let index = params.from; index < params.to; index++) {
    const result = await postChunk(
      {
        type: params.type,
        place: params.place,
        date: params.date,
        index: index,
      },
      ipaddress
    );
    if (result === "SUCCESS") count++;
  }
  console.log("Posted count:", count);
  if (count === length) {
    return "SUCCESS";
  }
};
