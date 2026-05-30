import { execStream } from "../execStream";
import { clientState } from "../../state";

export const splitPlaybackWithIndex = (index: number) => {
  const randomClientId = Object.keys(clientState.client)[Math.floor(Math.random() * Object.keys(clientState.client).length)];
  execStream("PLAYBACK", randomClientId, index);
};
