import { streamState } from "../state";
import { stringEmit } from "../socket/ioEmit";

export const randomStreamOrder = () => {
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
