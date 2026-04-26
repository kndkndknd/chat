import { sampleRateState } from "../state";
import { stringEmit } from "../socket/ioEmit";

export const sampleRateChange = (arg, io) => {
  let sampleRate = 44100;
  if (arg && isFinite(Number(arg.value))) {
    if(arg.value < 4000 || arg.value > 132300){ 
      stringEmit(
      io,
      "out of range",
      // state
      );
      return;
    }
    sampleRate = arg.value;
  } else {
    const sampleArr = Object.values(sampleRateState.sampleRate);
    const sum = sampleArr.reduce((accumulator, currentValue) => {
      return accumulator + currentValue;
    });
    const average = sum / sampleArr.length;
    if (average < 11025 || average >= 88200) {
      sampleRate = 11025;
    } else if (average < 22050) {
      sampleRate = 22050;
    } else if (average < 44100) {
      sampleRate = 44100;
    } else {
      sampleRate = 88200;
    }
  }
  if (arg && arg.property) {
    // console.log("hit source");
    sampleRateState.sampleRate[arg.property] = sampleRate;
    // io.emit('stringsFromServer',{strings: 'SampleRate: ' + String(sampleRateState.sampleRate[arg.source]) + 'Hz', timeout: true})
    stringEmit(
      io,
      "SampleRate: " + String(sampleRateState.sampleRate[arg.property]) + "Hz"
      // state
    );
  } else {
    console.log(arg);
    for (let target in sampleRateState.sampleRate) {
      sampleRateState.sampleRate[target] = sampleRate;
    }
    // io.emit('stringsFromServer',{strings: 'SampleRate: ' + String(sampleRateState.sampleRate.CHAT) + 'Hz', timeout: true})
    stringEmit(
      io,
      "SampleRate: " + String(sampleRateState.sampleRate.CHAT) + "Hz"
      // state
    );
  }
};
