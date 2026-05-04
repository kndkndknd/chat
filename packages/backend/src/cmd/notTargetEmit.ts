import { ioState } from "../state/states/ioState";

export const notTargetEmit = (
  targetId: string,
  idArr: string[],
) => {
  idArr.forEach((id) => {
    console.log("erasePrint", id);
    if (id !== targetId) ioState?.io.to(id).emit("erasePrintFromServer");
  });
};
