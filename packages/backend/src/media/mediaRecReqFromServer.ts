import { ioState } from "../state/states/ioState";
import { clientState } from "../state";

export const mediaRecReqFromServer = () => {
  const idArr = Object.keys(clientState.client);
  idArr.forEach((id) => {
    ioState?.io.to(id).emit("mediaRecReqFromServer");
  });
};
