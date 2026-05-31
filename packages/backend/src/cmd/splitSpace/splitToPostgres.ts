import { postStream } from "../../stream/toPostgres";
import { stringEmit } from "../../socket/ioEmit";
import { streamsRedis } from "../../data/chunk/streams";
import { streamList } from "../../data/list/streamList";

export const splitToPostgres = async (
  stringArr: string[],
  arrTypeArr: string[],
) => {
  console.log("splitToPostgres: ", stringArr);
  console.log("arrTypeArr: ", arrTypeArr);
  if (stringArr[0] === "INSERT") {
    if (stringArr[1] === "HELP" || stringArr[1] === "?") {
      stringEmit(`INSERT (STREAM) (PLACE) (YYYMMDD)`, false);
    } else if (streamList.includes(stringArr[1])) {
      const buffLen = await streamsRedis.getLength(stringArr[1]);
      if (
        stringArr.length === 4 &&
        arrTypeArr[3] === "number" &&
        stringArr[3].length === 8
      ) {
        const result = await postStream(
          {
            type: stringArr[1],
            place: stringArr[2],
            date: stringArr[3],
            from: 0,
            to: buffLen,
          },
        );
        stringEmit(`INSERT RESULT: ${result}`, false);
      } else if (
        stringArr.length === 5 &&
        arrTypeArr[3] === "number" &&
        stringArr[3].length === 8 &&
        arrTypeArr[4] === "number" &&
        Number(stringArr[4]) <= buffLen
      ) {
        const result = await postStream(
          {
            type: stringArr[1],
            place: stringArr[2],
            date: stringArr[3],
            from: 0,
            to: Number(stringArr[4]) - 1,
          },
        );
        stringEmit(`INSERT RESULT(${stringArr[4]}): ${result}`, false);
      } else {
        stringEmit(`INSERT (STREAM) (PLACE) (YYYMMDD)`, false);
      }
    }
  } else if (stringArr[0] === "FIND") {
    // findStream("test", "test", io);
  }
};
