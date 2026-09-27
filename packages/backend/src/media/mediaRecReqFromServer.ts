import { clientState } from "../state";
import { mediaRecReqEmit } from "../socket/ioEmit";

export const mediaRecReqFromServer = () => {
  const idArr = Object.keys(clientState.client);
  idArr.forEach((id) => {
    mediaRecReqEmit(undefined, id);
  });
};
