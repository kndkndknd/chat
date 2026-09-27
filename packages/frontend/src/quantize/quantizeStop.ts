import { quantizeState } from "../state";

export const quantizeStop = () => {
  clearInterval(quantizeState.interval);
  quantizeState.interval = null;
  quantizeState.intervalFlag = false;
  for (const stream of Object.keys(quantizeState.stream)) {
    quantizeState.stream[stream].flag = false;
  }
  return quantizeState;
};
