import { webStateType } from "../../../../../types";
import { createPersistedState } from "../../redis/stateRedis";

export const webState = createPersistedState<webStateType>("webState", {
  flag: false,
  type: "websocket",
  url: "ws://chat.knd.cloud/ws/",
});
