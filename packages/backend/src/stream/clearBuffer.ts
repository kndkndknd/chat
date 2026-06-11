import { streamsRedis } from "../data";

export const clearBuffer = async (source?: string) => {
  if (source === "BUFFER" || source === undefined) {
    const keys = await streamsRedis.getAllKeys();
    for (const stream of keys) {
      if (
        stream !== "CHAT" &&
        stream !== "EMPTY" &&
        stream !== "KICK" &&
        stream !== "SNARE" &&
        stream !== "HAT"
      ) {
        await streamsRedis.clear(stream);
      }
    }
  } else if (await streamsRedis.hasKey(source)) {
    await streamsRedis.clear(source);
  }
};
