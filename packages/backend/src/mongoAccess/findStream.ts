import SocketIO from "socket.io";
import dotenv from "dotenv";
import { cmdList, streamList, parameterList, states, streams } from "../states";
// import { stringEmit } from "../socket/ioEmit.js";
import { pushStateStream } from "../stream/pushStateStream";

dotenv.config();

const ipaddress = process.env.DB_HOST;

interface streamInterface {
  _id: string;
  type: string;
  audio: string;
  video: string;
  location: string;
}

export const findStream = async (
  key: string,
  value: string = "UNDEFINED",
  io: SocketIO.Server
) => {
  const queryParams = new URLSearchParams({
    name: "20230527",
    type: "PLAYBACK",
    location: "ftarri",
  });
  const res = fetch(`http://${ipaddress}:3030/find?${queryParams}`)
    .then((response) => response.body)
    .then((body) => {
      // const reader = body?.getReader();
      console.log(body);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
  // .then(response => {
  //   const reader = response.body.getReader();

  // // })
  // const resBody = <ReadableStream<Uint8Array>>res.body;
  // const reader = resBody.pipeThrough(new TextDecoderStream()).getReader();
  // let i = 1;
  // let str = "";
  // const result: Array<streamInterface> = JSON.parse(str);
  // while (true) {
  //   const { done, value } = await reader.read();
  //   if (done) {
  //     const
  //     // const audio = new Float32Array(result[0].audio.buffer);
  //     // pushStream(result);
  //     // console.log(result[0].audio)
  //     console.log(i);
  //     return;
  //   }
  //   str = str + value;
  //   i++;
  // }

  //  console.log(res.length)

  // return res
};

const pushStream = (streamArray: Array<streamInterface>) => {
  const type = "FIND";
  // const type = streamArray[0].type
  streams[type] = {
    audio: [],
    video: [],
    index: [],
    bufferSize: 8192,
  };
  streamArray.forEach((element: streamInterface, index: number) => {
    /*
    console.log(element.audio)
    console.log(element.audio.buffer)
    const audio = new Float32Array(element.audio.buffer)
    */
    const audio = new Uint8Array(
      [...atob(element.audio)].map((c) => c.charCodeAt(0))
    ).buffer;
    console.log(audio);

    streams[type].audio.push(audio);
    streams[type].video.push(element.video);
    streams[type].index.push(index);
  });
  console.log(streams[type].audio[0]);
  streamList.push(type);
  pushStateStream(type, states);
};
