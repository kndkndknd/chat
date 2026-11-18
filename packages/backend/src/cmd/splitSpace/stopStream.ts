import { currentState, previousState } from "../../state";
import { streamList } from "../../data/list/streamList";
import { clearLoop } from "../../stream/loop/clearLoop";

export const stopStream = (source?) => {
  if(source && streamList.includes(source)) {
    previousState.stream[source] = currentState.stream[source];
    currentState.stream[source] = false;
    clearLoop(source);
  } else {
    console.log("all stream stop");
    previousState.stream = currentState.stream;
    Object.keys(currentState.stream).forEach(
      (key) => (currentState.stream[key] = false)
    );
    clearLoop();
  }

};
