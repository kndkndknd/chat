import { erasePrintEmit } from "../socket/ioEmit";

export const notTargetEmit = (
  targetId: string | string[],
  idArr: string[],
) => {
  idArr.forEach((id) => {
    console.log("erasePrint", id);
    if (Array.isArray(targetId)) {
      if (!targetId.includes(id)) erasePrintEmit(id);
    } else {
      if (id !== targetId) erasePrintEmit(id);
    }
  });
};
