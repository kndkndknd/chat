import { cmdEmit } from "../socket/ioEmit";
import { pickupCmdTarget } from "./pickupCmdTarget";

// SYNTH のワンショット発音。frequency が指定された場合は
// cmdFromServer の value としてフロントへ渡す。
export const execSynth = (frequency?: number, target?: string): void => {
  const cmd: { cmd: string; value?: number } = { cmd: "SYNTH" };
  if (frequency !== undefined && Number.isFinite(frequency) && frequency > 0) {
    cmd.value = frequency;
  }

  const targets =
    target !== undefined && target ? [target] : pickupCmdTarget("SYNTH");
  cmdEmit(targets, cmd);
};
