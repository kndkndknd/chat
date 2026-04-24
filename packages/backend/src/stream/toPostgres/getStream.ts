import dotenv from "dotenv";
import path from "path";

const dotenvPath = path.resolve(__dirname, "../../../../../.env");

type StreamRecordRaw = {
  type: string;
  video: string;
  audio: string;
  location: string;
  date: string;
};

export type StreamRecord = {
  type: string;
  video: string;
  audio: ArrayBuffer;
  location: string;
  date: string;
};

export const decodeAudio = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

export const getStream = async (venue: string, name?: string): Promise<StreamRecordRaw[]> => {
  dotenv.config({ path: dotenvPath });

  const ipaddress = process.env.DB_HOST;
  console.log("db IP Address:", ipaddress);

  const params = new URLSearchParams({ venue });
  if (name !== undefined) params.append("name", name);

  try {
    const res = await fetch(
      `http://${ipaddress}:3030/chats?${params.toString()}`
    );
    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status}`);
    }
    const data: StreamRecordRaw[] = await res.json();
    return data;
    // return data.map((record) => ({
    //   ...record,
    //   audio: decodeAudio(record.audio),
    // }));
  } catch (error) {
    console.log(error);
    return [];
  }
};
