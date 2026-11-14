import { clientState, streamState } from "../state";
import {
  pickupPaStreamTarget,
  pickupStreamTarget,
} from "./pickupStreamTarget";

/**
 * ストリームの送出先を決める。
 * 明示 target は PA モードや target 配列より優先する。
 * 明示 target が切断済みの場合は、別端末へフォールバックせず空文字を返す。
 */
export const resolveStreamTarget = (
  source: string,
  from?: string,
  target?: string,
): string => {
  if (target !== undefined && target !== "") {
    if (clientState.client[target]?.stream !== true) {
      console.warn(`[execStream] target is not active: ${target}`);
      return "";
    }
    return target;
  }

  if (streamState.pa[source]) {
    return pickupPaStreamTarget();
  }

  return from === undefined
    ? pickupStreamTarget(source)
    : pickupStreamTarget(source, from);
};
