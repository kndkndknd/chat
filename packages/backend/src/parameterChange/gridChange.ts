import { bpmState } from "../state";
import { stringEmit } from "../socket/ioEmit";

export const gridChange = (arg, io) => {
  if (arg && arg.property) {
    if (arg.property !== "TRUE" && arg.property !== "FALSE") {
      let averageFlag = 0;
      for (const client in bpmState) {
        if (bpmState[client].stream[arg.property] !== undefined) {
          averageFlag += bpmState[client].stream[arg.property].gridFlag ? 1 : 0;
        }
      }
      if (averageFlag > Object.keys(bpmState).length / 2) {
        for (const client in bpmState) {
          if (bpmState[client].stream[arg.property] !== undefined) {
            bpmState[client].stream[arg.property].gridFlag = false;
          }
        }
      } else {
        for (const client in bpmState) {
          if (bpmState[client].stream[arg.property] !== undefined) {
            bpmState[client].stream[arg.property].gridFlag = true;
          }
        }
      }
      stringEmit(
        io,
        "GRID: " +
          String(
            bpmState[Object.keys(bpmState)[0]].stream[arg.property].gridFlag
          ) +
          "(" +
          arg.property +
          ")"
        // state
      );
    } else {
      const flag = arg.property === "TRUE" ? true : false;
      for (const client in bpmState) {
        for (const stream in bpmState[client].stream) {
          bpmState[client].stream[stream].gridFlag = flag;
        }
      }
      stringEmit(
        io,
        "GRID: " + arg.property
        // state
      );
    }

    // streamState.grid[arg.property] = !streamState.grid[arg.property];
    // io.emit('stringsFromServer',{strings: 'GRID: ' + String(streamState.grid[arg.property]) + '(' + arg.property + ')', timeout: true})
  } else {
    // let flag = false;
    // if (Object.values(streamState.grid).includes(false)) {
    //   flag = true;
    // }
    // for (let target in streamState.grid) {
    //   streamState.grid[target] = flag;
    // }
    // // io.emit('stringsFromServer',{strings: 'GRID: ' + String(streamState.grid.CHAT), timeout: true})
    // stringEmit(io, "GRID: " + String(streamState.grid.CHAT));
    let averageFlag = 0;
    let denominator = 0;
    for (const client in bpmState) {
      for (const stream in bpmState[client].stream) {
        denominator++;
        averageFlag += bpmState[client].stream[stream].gridFlag ? 1 : 0;
      }
    }
    if (averageFlag > denominator / 2) {
      for (const client in bpmState) {
        for (const stream in bpmState[client].stream) {
          bpmState[client].stream[stream].gridFlag = false;
        }
      }
    } else {
      for (const client in bpmState) {
        for (const stream in bpmState[client].stream) {
          bpmState[client].stream[stream].gridFlag = true;
        }
      }
    }
    stringEmit(
      io,
      "GRID: " +
        String(bpmState[Object.keys(bpmState)[0]].stream.CHAT.gridFlag),
      true
    );
  }
};
