import { execStreamPreparation } from "../execStreamPreparation";
import { clientState } from "../../state";

export const splitPlaybackWithIndex = (index: number) => {
  const candidates = Object.keys(clientState.client).filter(
    (id) => clientState.client[id].stream === true,
  );
  const randomClientId =
    candidates[Math.floor(Math.random() * candidates.length)];
  execStreamPreparation(
    "PLAYBACK",
    randomClientId,
    index,
    undefined,
    undefined,
    randomClientId,
  );
};
