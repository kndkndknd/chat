import { createPersistedState } from "../../redis/stateRedis";

export const hlsState = createPersistedState<string[]>("hlsState", []);
