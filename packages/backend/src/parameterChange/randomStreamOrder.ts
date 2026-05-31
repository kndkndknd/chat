import { streamState } from "../state";
import { stringEmit } from "../socket/ioEmit";

export const randomStreamOrder = (
) => {
  // if (arg && arg.source) {
  //   streamState.random[arg.source] = !streamState.random[arg.source];
  //   // io.emit('stringsFromServer',{strings: 'RANDOM: ' + String(streamState.random[arg.source]), timeout: true})
  //   stringEmit(
  //     io,
  //     "RANDOM: " + String(streamState.random[arg.source])
  //     // state
  //   );
  // } else {
  let flag = false;
  console.log(Object.values(streamState.random));
  if (Object.values(streamState.random).includes(false)) {
    flag = true;
  }
  for (let target in streamState.random) {
    console.log(target, flag);
    streamState.random[target] = flag;
  }
  //io.emit('stringsFromServer',{strings: 'RANDOM: ' + String(streamState.random.CHAT), timeout: true})
  stringEmit("RANDOM: " + String(streamState.random.CHAT));
  // }
  console.log(streamState.random);
};
