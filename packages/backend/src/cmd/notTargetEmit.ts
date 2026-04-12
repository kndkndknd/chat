import { targetEmit } from "../webSocket";

export const notTargetEmit = (targetId: string, idArr: string[]) => {
  idArr.forEach((id) => {
    console.log("erasePrint", id);

    if (id !== targetId) {
      // io.to(id).emit("erasePrintFromServer");
      targetEmit(id, {
        type: "string",
        payload: { strings: "", timeout: false },
      });
    }
  });
};
