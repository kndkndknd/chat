
import { buffStateType } from "../../../../types";
import { streams } from "../data/chunk/streams";
import { sampleRateState, streamState, glitchState, currentState } from "../state";
import { pickupTarget } from "../clientProcess/pickupTarget";
import { getStreamBuff } from "./buffer/getStreamBuff";
import { targetEmit } from "../webSocket";

export const emitStream = (source: string, from?: string) => {
  if(!currentState.stream[source]) {
    console.log(`Stream source ${source} is not active. Skipping emit.`);
    return;
  }

  console.log(`Emitting stream for source: ${source}, from: ${from}`);
  const targetId = pickupTarget(source, "STREAM", { from, pa: streamState.pa[source] });
  // const targetId = pickupTargetPaOrNormal(source, from);
  if (targetId.length === 0 || targetId.filter((id) => id !=="undefined").length === 0) {
    console.log("No target for stream emit");
    return;
  }
  const buff = getStreamBuff(source);
  if (buff !== undefined) {
    targetId.forEach((id) => {
      targetEmit(id, { type: "stream", payload: buff });
    });
  } else {
    console.log(`No buffer available for source: ${source}`);
  }
};

