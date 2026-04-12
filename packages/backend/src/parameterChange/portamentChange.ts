import { cmdState } from "../state";
import { stringEmit } from "../socket/ioEmit";

export const portamentChange = (arg) => {
  if (arg && arg.value && isFinite(Number(arg.value))) {
    cmdState.PORTAMENT = arg.value;
  } else {
    if (cmdState.PORTAMENT > 0) {
      cmdState.PORTAMENT = 0;
    } else {
      cmdState.PORTAMENT = 5;
    }
  }
  // io.emit('stringsFromServer',{strings: 'PORTAMENT: ' + String(cmdState.PORTAMENT) + 'sec', timeout: true})
  stringEmit("PORTAMENT: " + String(cmdState.PORTAMENT) + "sec");
};
