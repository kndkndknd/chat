import { stringSocketType } from "../../../../types";
import { erasePrint, textPrint } from "../canvasEvent";
import { canvasState } from "../state";

export const stringMessage = ({type, payload}: stringSocketType) => {
  console.log(payload);
  erasePrint();
  canvasState.stringsClient = payload.string;
  textPrint(canvasState.stringsClient, { timeout: payload.timeout});
};
