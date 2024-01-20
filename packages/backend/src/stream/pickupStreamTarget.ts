import { cmdStateType } from "../types/global";

export const pickupStreamTarget = (
  states: cmdStateType,
  stream: string,
  from?: string
) => {
  if (states.stream.target[stream].length > 0) {
    // from以外のtargetがあればFromを除外した配列を返し、fromがなければtarget全体を返す
    const targetArr =
      from === undefined
        ? states.stream.target[stream]
        : states.stream.target[stream].filter((id) => {
            id !== from;
          });
    // fromを除外した結果targetがなくなればfromを返す、あればtargetの中からランダムに返す
    if (targetArr.length > 0) {
      const targetId = targetArr[Math.floor(Math.random() * targetArr.length)];
      return targetId;
    } else {
      return from;
    }
  } else {
    // targetがなければランダムに返す
    return states.client[Math.floor(Math.random() * states.client.length)];
  }
};
