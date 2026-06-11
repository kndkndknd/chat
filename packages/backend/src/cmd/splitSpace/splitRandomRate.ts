import { sampleRateState } from "../../state";
import { stringEmit } from "../../socket/ioEmit";

export const splitRandomRate = (stringArr: string[]) => {
  if (stringArr[1] === "RATE") {
    // SAMPLERATEのランダマイズ
    console.log("random rate");
    if (stringArr.length === 2) {
      for (let key in sampleRateState.randomrate) {
        sampleRateState.randomrate[key] = !sampleRateState.randomrate[key];
      }
      // io.emit('stringsFromServer',{strings: 'SAMPLERATE RANDOM: ' + String(sampleRateState.randomrate.CHAT), timeout: true})
      stringEmit(
        "SAMPLERATE RANDOM: " + String(sampleRateState.randomrate.CHAT)
        // state
      );
    } else if (
      stringArr.length === 3 &&
      Object.keys(sampleRateState.randomrate).includes(stringArr[2])
    ) {
      sampleRateState.randomrate[stringArr[2]] =
        !sampleRateState.randomrate[stringArr[2]];
      //io.emit('stringsFromServer',{strings: 'SAMPLERATE RANDOM(' + stringArr[2] + '): ' + String(sampleRateState.randomrate[stringArr[2]]), timeout: true})
      stringEmit(
        "SAMPLERATE RANDOM(" +
          stringArr[2] +
          "): " +
          String(sampleRateState.randomrate[stringArr[2]])
        // state
      );
    } else if (stringArr.length === 3 && stringArr[2].includes("-")) {
      const rateRangeArr = stringArr[2].split("-");
      // rateRangeArrが2つの数字で構成されているか確認
      if (
        rateRangeArr.length === 2 &&
        rateRangeArr.every((item) => {
          return !isNaN(Number(item));
        })
      ) {
        if (
          Number(rateRangeArr[0]) >= 4000 &&
          Number(rateRangeArr[1]) <= 132300
        ) {
          for (let key in sampleRateState.randomraterange) {
            sampleRateState.randomraterange[key].min = Number(rateRangeArr[0]);
            sampleRateState.randomraterange[key].max = Number(rateRangeArr[1]);
          }
          stringEmit(
            "SAMPLERATE RANDOM RATE RANGE: " +
              String(rateRangeArr[0]) +
              "-" +
              String(rateRangeArr[1]) +
              "Hz"
          );
        } else {
          stringEmit("OUT RATE RANGE: 4000-132300", true);
        }
      }
    } else if (
      stringArr.length === 3 &&
      (stringArr[2] === "TRUE" || stringArr[2] === "FALSE")
    ) {
      const boolValue = stringArr[2] === "TRUE" ? true : false;
      for (let key in sampleRateState.randomrate) {
        sampleRateState.randomrate[key] = boolValue;
      }
      stringEmit("SAMPLERATE RANDOM: " + String(boolValue));
    } else if (
      stringArr.length === 4 &&
      Object.keys(sampleRateState.randomrate).includes(stringArr[2])
    ) {
      const rateRangeArr = stringArr[3].split("-");
      if (
        rateRangeArr.length === 2 &&
        rateRangeArr.every((item) => {
          return !isNaN(Number(item));
        })
      ) {
        sampleRateState.randomraterange[stringArr[2]].min = Number(
          rateRangeArr[0]
        );
        sampleRateState.randomraterange[stringArr[2]].max = Number(
          rateRangeArr[1]
        );
        stringEmit(
          "SAMPLERATE RANDOM RATE RANGE(" +
            stringArr[2] +
            "): " +
            String(rateRangeArr[0]) +
            "-" +
            String(rateRangeArr[1]) +
            "Hz"
        );
      } else if (stringArr[3] === "TRUE" || stringArr[3] === "FALSE") {
        const boolValue = stringArr[3] === "TRUE" ? true : false;
        sampleRateState.randomrate[stringArr[2]] = boolValue;
        stringEmit(
          "SAMPLERATE RANDOM(" + stringArr[2] + "): " + String(boolValue)
        );
      }
    } else if (stringArr.length === 3 && stringArr[2] === "NOTE") {
      for (let key in sampleRateState.randomratenote) {
        sampleRateState.randomratenote[key] =
          !sampleRateState.randomratenote[key];
      }
      // io.emit('stringsFromServer',{strings: 'SAMPLERATE RANDOM: ' + String(sampleRateState.randomrate.CHAT), timeout: true})
      stringEmit(
        "SAMPLERATE RANDOM(NOTE): " +
          String(sampleRateState.randomratenote.CHAT)
        // state
      );
    }
    console.log(sampleRateState.randomrate);
  }
};
