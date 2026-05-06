import SocketIO from "socket.io";
import dotenv from "dotenv";
import path from "path";
import { cmdList, streamList, parameterList, streamsRedis } from "../data";
import { pushStateStream } from "../stream/pushStateStream";

const dotenvPath = path.resolve(__dirname, "../../../../.env");
dotenv.config({ path: dotenvPath });

const ipaddress = process.env.DB_HOST;
console.log("IP Address:", ipaddress);

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
      console.log(body);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
};

const pushStream = async (streamArray: Array<streamInterface>) => {
  const type = "FIND";
  await streamsRedis.initKey(type);
  await streamsRedis.clear(type);

  for (const element of streamArray) {
    const audio = new Uint8Array(
      [...atob(element.audio)].map((c) => c.charCodeAt(0))
    ).buffer;
    await streamsRedis.push(type, {
      source: type,
      audio,
      video: element.video,
      bufferSize: 8192,
      duration: 8192 / 44100,
    });
  }
  const entry = await streamsRedis.get(type, 0);
  console.log(entry?.audio);
  streamList.push(type);
  pushStateStream(type);
};
