import { clientState } from "./../../state";
import { stringEmit } from "../../socket/ioEmit";

export const numPaSwitch = (target: string) => {
  let textPrint = "";
  // switch cmdClient
  if (
    clientState.cmdClient.includes(target) &&
    !clientState.paCmdClient.includes(target)
  ) {
    clientState.paCmdClient.push(target);
    clientState.cmdClient.splice(clientState.cmdClient.indexOf(target))
    textPrint = `${target} set PA client`;
  } else if (
    !clientState.cmdClient.includes(target) &&
    clientState.paCmdClient.includes(target)
  ) {
    clientState.cmdClient.push(target);
    clientState.paCmdClient.splice(clientState.paCmdClient.indexOf(target))
    textPrint = `${target} set client`;
  } else if (
    !clientState.cmdClient.includes(target) &&
    !clientState.paCmdClient.includes(target)
  ) {
    clientState.cmdClient.push(target);
    textPrint = `${target} set client`;
  } else {
    clientState.cmdClient.splice(clientState.cmdClient.indexOf(target))
    textPrint = `${target} set PA client`;
  }
  // switch streamClient
  if (
    clientState.streamClient.includes(target) &&
    !clientState.paStreamClient.includes(target)
  ) {
    clientState.paStreamClient.push(target);
    clientState.streamClient.splice(clientState.streamClient.indexOf(target))
  } else if (
    !clientState.streamClient.includes(target) &&
    clientState.paStreamClient.includes(target)
  ) {
    clientState.streamClient.push(target);
    clientState.paStreamClient.splice(clientState.paStreamClient.indexOf(target))
  } else if (
    !clientState.streamClient.includes(target) &&
    !clientState.paStreamClient.includes(target)
  ) {
    clientState.streamClient.push(target);
  } else {
    clientState.streamClient.splice(clientState.streamClient.indexOf(target))
  }

  stringEmit(textPrint);
  console.log('cmdClient', clientState.cmdClient)
  console.log('paCmdClient', clientState.paCmdClient)
  console.log('streamClient', clientState.streamClient)
  console.log('paStreamClient', clientState.paStreamClient)
};
