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

    // const targetArr = states.stream.target[stream];
    let targetArr =
      stream === "CHAT"
        ? states.stream.target[stream].filter((id) => {
            console.log(id !== from);
            return id !== from;
          })
        : states.stream.target[stream];
    console.log("from", from);
    // console.log("testArr", testArr);
    // const targetArr = states.stream.target[stream];

    // fromを除外した結果targetがなくなればfromを返す、あればtargetの中からランダムに返す
    if (targetArr.length > 0) {
      if (states.arduino.connected) {
        console.log("push arduino");
        targetArr = [...targetArr, ...targetArr];
        targetArr.push("arduino");
      }
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
    let targetArr = states.client;
    if (states.arduino.connected) {
      targetArr = [...targetArr, ...targetArr, ...targetArr];
      console.log("push arduino");
      targetArr.push("arduino");
    }

    return targetArr[Math.floor(Math.random() * targetArr.length)];
  }
};
