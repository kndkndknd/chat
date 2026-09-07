import { execStreamPreparation } from "../execStreamPreparation";
import { clientState } from "../../state";

export const splitPlaybackWithIndex = (index: number) => {
  const randomClientId = Object.keys(clientState.client)[Math.floor(Math.random() * Object.keys(clientState.client).length)];
  execStreamPreparation("PLAYBACK", randomClientId, index);
};
