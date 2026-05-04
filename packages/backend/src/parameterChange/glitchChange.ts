import { glitchState } from "../state";
import { stringEmit } from "../socket/ioEmit";

export const glitchChange = (arg) => {
  if (arg && arg.property) {
    glitchState.glitch[arg.property] = !glitchState.glitch[arg.property];
    // io.emit('stringsFromServer',{strings: 'GLITCH: ' + String(glitchState.glitch[arg.source]), timeout: true})
    // console.log(arg.property, glitchState.glitch);
    // console.log(
    //   `GLITCH ${arg.property}: ${glitchState.glitch[arg.property]}`
    // );
    stringEmit(
      `GLITCH ${arg.property}: ${glitchState.glitch[arg.property]}`,
      true
      // state
    );
  } else {
    let flag = false;
    if (Object.values(glitchState.glitch).includes(false)) {
      flag = true;
    }
    for (let target in glitchState.glitch) {
      glitchState.glitch[target] = flag;
    }
    // io.emit('stringsFromServer',{strings: 'GLITCH: ' + String(glitchState.glitch.CHAT), timeout: true})
    stringEmit("GLITCH: " + String(glitchState.glitch.CHAT), true);
  }
};
