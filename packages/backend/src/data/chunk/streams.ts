import { streamsRedis, chatsRedis } from "../../redis/streamsRedis";

export const initStreams = async () => {
  await streamsRedis.initDefaultKeys();
};

export { streamsRedis, chatsRedis };
