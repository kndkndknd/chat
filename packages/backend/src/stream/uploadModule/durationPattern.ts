import { uploadParams } from "../../states.js";

export const durationPattern = (duration: number, stringArr: Array<string>) => {
  const lengthArr: Array<{ t: string; ss?: string }> = [
    { t: uploadParams.t, ss: uploadParams.ss },
  ];
  switch (stringArr.length) {
    case 4:
      if (stringArr[3].includes(":")) {
        let timeArr = stringArr[3].split(":");
        if (timeArr.length === 3) {
          lengthArr[0].t = stringArr[3];
        } else if (timeArr.length === 2) {
          lengthArr[0].t = "00:" + stringArr[3];
        }
      }
    // breakないため、4の場合も3の処理をする
    case 3:
      if (stringArr[2].includes(":")) {
        let timeArr = stringArr[2].split(":");
        if (timeArr.length === 3) {
          lengthArr[0].ss = stringArr[2];
        } else if (timeArr.length === 2) {
          lengthArr[0].ss = "00:" + stringArr[2];
        }
      } else if (stringArr[2] === "FULL") {
        lengthArr[0].t = String(duration);
        lengthArr[0].ss = "0:00:00";
      }
      break;
  }
  if (lengthArr[0].ss === undefined) {
    lengthArr[0].ss === "0:00:00";
  }

  if (duration < 20) {
    lengthArr[0].t = String(duration);
  }

  if (duration > 60) {
    lengthArr.shift();
    const basisDuration = 20;
    const arrLength = Math.floor(duration / basisDuration) - 1;
    for (let i = 0; i < arrLength; i++) {
      lengthArr.push({
        ss: String(i * basisDuration + Math.random() * basisDuration),
        t: String(Math.random() * basisDuration),
      });
    }
  }

  console.log(lengthArr);
  return lengthArr;
};
