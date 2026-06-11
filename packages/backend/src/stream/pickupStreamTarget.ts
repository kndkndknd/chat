import { streamState, clientState } from "../state";

export const pickupStreamTarget = (stream: string, from?: string): string => {
  console.log("streamState.target", streamState.target[stream]);
  if (
    streamState.target[stream] !== undefined &&
    streamState.target[stream].length > 1
  ) {
    // from以外のtargetがあればFromを除外した配列を返し、fromがなければtarget全体を返す
    // const targetArr =
    //   from === undefined
    //     ? streamState.target[stream]
    //     : streamState.target[stream].filter((id) => {
    //         console.log("from", from);
    //         console.log("id", id);
    //         return id === from;
    //       });
    // console.log("filtered targetArr", targetArr);

    // const targetArr = streamState.target[stream];
    let targetArr =
      stream === "CHAT"
        ? streamState.target[stream].filter((id) => {
            console.log(id !== from);
            return id !== from;
          })
        : streamState.target[stream];
    console.log("from", from);
    // console.log("testArr", testArr);
    // const targetArr = streamState.target[stream];
    console.log("targetArr(target ari)", targetArr);
    // fromを除外した結果targetがなくなればfromを返す、あればtargetの中からランダムに返す
    if (targetArr.length > 0) {
      // if (states.arduino.connected) {
      //   console.log("push arduino");
      //   targetArr = [...targetArr, ...targetArr];
      //   targetArr.push("arduino");
      // }
      const targetId = targetArr[Math.floor(Math.random() * targetArr.length)];
      console.log("targetId", targetId);
      return targetId;
    } else {
      console.log("from");
      return from;
    }
  } else if (
    streamState.target[stream] !== undefined &&
    streamState.target[stream].length === 1
  ) {
    console.log(stream, "targetArr(1)", streamState.target[stream]);
    return streamState.target[stream][0];
  } else {
    // targetがなければランダムに返す（CHAT以外かつfromが指定されていればそれを優先）
    console.log("random");
    if (from !== undefined && stream !== "CHAT") return from;
    let targetArr = clientState.streamClient;
    console.log("targetArr", targetArr);
    // if (states.arduino.connected) {
    //   targetArr = [...targetArr, ...targetArr, ...targetArr];
    //   console.log("push arduino");
    //   targetArr.push("arduino");
    // }

    return targetArr.length > 0 ? targetArr[Math.floor(Math.random() * targetArr.length)] : "";
  }
};

export const pickupPaStreamTarget = (): string => {
  console.log('pa')
  return clientState.paStreamClient.length > 0 ? clientState.paStreamClient[Math.floor(Math.random() * clientState.paStreamClient.length)] : "";
}
