import { arduinoStateType } from "../../../../../types";
import { createPersistedState } from "../../redis/stateRedis";

export const arduinoState = createPersistedState<arduinoStateType>("arduinoState", {
  host: "localhost",
  port: 5050,
  connected: false,
  relay: "off",
});
