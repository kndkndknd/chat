import { uploadParams } from "../../states"


export const lengthPattern = (duration: number, stringArr: Array<string>) => {
  const lengthArr: Array<{t: string, ss?: string}> = [{t: uploadParams.t}]
  switch (stringArr.length) {
    case 4:
      if (stringArr[3].includes(":")) {
        let timeArr = stringArr[3].split(":");
        if (timeArr.length === 3) {
          lengthArr[0].t = stringArr[3]
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
      }
      break;
  }

  if(duration < 20) {
    lengthArr[0].t = String(duration)
  }

  if(duration > 60 && lengthArr[0].ss === undefined) {

  }

  return lengthArr
}