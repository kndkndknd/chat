import { bpmState, bpmStateDefault } from "../state/states/bpmState";
import { millisecondsPerBeat } from "../util/bpmCalc";

export const gridTimeoutVal = (stream: string, targetId: string): number => {
  const clientBpm = bpmState[targetId];
  if (clientBpm === undefined) {
    return (
      (Math.round(Math.random() * 16) *
        millisecondsPerBeat(bpmStateDefault.bpm)) /
      4
    );
  }
  return (Math.round(Math.random() * 16) *
        millisecondsPerBeat(clientBpm.bpm)) / 4;
};
