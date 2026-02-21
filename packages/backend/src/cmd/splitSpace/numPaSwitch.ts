import { clientState } from "./../../state";
import { stringEmit } from "../../socket/ioEmit";

export const numPaSwitch = (target: string, io) => {
  let textPrint = "";
  if (
    clientState.cmdClient.includes(target) &&
    !clientState.paCmdClient.includes(target)
  ) {
    clientState.paCmdClient.push(target);
    clientState.cmdClient.filter((value) => value === target);
    textPrint = `${target} set PA client`;
  } else if (
    !clientState.cmdClient.includes(target) &&
    clientState.paCmdClient.includes(target)
  ) {
    clientState.cmdClient.push(target);
    clientState.paCmdClient.filter((value) => value === target);
    textPrint = `${target} set client`;
  } else if (
    !clientState.cmdClient.includes(target) &&
    !clientState.paCmdClient.includes(target)
  ) {
    clientState.cmdClient.push(target);
    textPrint = `${target} set client`;
  } else {
    clientState.cmdClient.filter((value) => value === target);
    textPrint = `${target} set PA client`;
  }
  stringEmit(io, textPrint);
};
