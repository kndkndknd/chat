import { cmdStateType } from "../types/global";

export const pickupStreamTarget = (
  states: cmdStateType,
  stream: string,
  from?: string
) => {
  console.log("states.stream.target", states.stream.target[stream]);
  if (states.stream.target[stream].length > 0) {
    // from以外のtargetがあればFromを除外した配列を返し、fromがなければtarget全体を返す
    // const targetArr =
    //   from === undefined
    //     ? states.stream.target[stream]
    //     : states.stream.target[stream].filter((id) => {
    //         console.log("from", from);
    //         console.log("id", id);
    //         return id === from;
    //       });
    // console.log("filtered targetArr", targetArr);

    // const testArr = states.stream.target[stream].filter((id) => {
    //   return id !== from;
    // });
    // console.log("testArr", testArr);
    const targetArr = states.stream.target[stream];

    // fromを除外した結果targetがなくなればfromを返す、あればtargetの中からランダムに返す
    if (targetArr.length > 0) {
      const targetId = targetArr[Math.floor(Math.random() * targetArr.length)];
      console.log("targetId", targetId);
      return targetId;
    } else {
      console.log("from");
      return from;
    }
  } else {
    // targetがなければランダムに返す
    console.log("random");
    return states.client[Math.floor(Math.random() * states.client.length)];
  }
};
