import { flagStateType } from "../../../../../types";
import { createPersistedState } from "../../redis/stateRedis";

export const flagState = createPersistedState<flagStateType>("flagState", {
  clockMode: false,
  emoji: false,
  timer: true,
  vosk: true,
  scenario: true,
});
