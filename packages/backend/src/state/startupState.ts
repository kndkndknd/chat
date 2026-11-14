import { currentState } from "./states/currentState";
import { previousState } from "./states/previousState";

/**
 * 再起動直後に、前回プロセスの再生状態を引き継がないようにする。
 *
 * currentState.stream が true のまま復元されると、最初の CHAT が
 * 「開始」ではなく「停止」として扱われる。RECORD / WHOLE も同様に
 * 前回のセッションを前提とした状態なので false に戻す。
 */
export const resetRuntimeStreamState = (): void => {
  for (const stream of Object.keys(currentState.stream)) {
    currentState.stream[stream] = false;
  }
  currentState.RECORD = false;
  currentState.WHOLE = false;

  // PREVIOUS で再起動前のストリームを復元しないようにする。
  for (const stream of Object.keys(previousState.stream)) {
    previousState.stream[stream] = false;
  }
  previousState.RECORD = false;
};
