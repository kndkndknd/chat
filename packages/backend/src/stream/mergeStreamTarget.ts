import { streamStateType } from "../../../../types";

export function mergeStreamTarget(streamState: streamStateType): Array<string> {
  const merged = Object.values(streamState.target).flat();
  return [...new Set(merged)];
}
