import { streamState } from "../../state";
import { streamsRedis, chatsRedis } from "../../redis/streamsRedis";

export const initStreams = async () => {
  await streamsRedis.initDefaultKeys(streamState.basisBufferSize);
};

export { streamsRedis, chatsRedis };
