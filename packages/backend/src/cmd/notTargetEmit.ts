import { ioState } from "../state/states/ioState";

export const notTargetEmit = (
  targetId: string | string[],
  idArr: string[],
) => {
  idArr.forEach((id) => {
    console.log("erasePrint", id);
    if (Array.isArray(targetId)) {
      if (!targetId.includes(id)) ioState?.io.to(id).emit("erasePrintFromServer");
    } else {
      if (id !== targetId) ioState?.io.to(id).emit("erasePrintFromServer");
    }
  });
};
