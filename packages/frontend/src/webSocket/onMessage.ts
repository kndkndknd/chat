import { webSocketType, initSocketType, cmdSocketType, stringSocketType, streamReqSocketType, streamSocketType} from "../../../../types";
import { initId } from "./initId";
import { cmdMessage } from "../cmd/cmdMessage";
import { stringMessage } from "./stringMessage";
import { streamMessage } from "../stream/streamMessage"
import { streamReqMessage } from "../stream/streamReqMessage";
import { stopCmd } from "../cmd/stopCmd";

export const onMessage = ({type, payload}: webSocketType) => {
  console.log("onMessage", type, payload);
  if (type === "connect") {
    initId({type, payload} as initSocketType);
  } else if (type === "string") {
    stringMessage({type, payload} as stringSocketType);
  } else if (type === "stop") {
    stopCmd(payload.fadeOutVal);
  } else if (type === "cmd") {
    cmdMessage({type, payload} as cmdSocketType);
  } else if (type === "stream") {
    streamMessage({type, payload} as streamSocketType);
  } else if (type === "streamReq") {
    streamReqMessage({type, payload} as streamReqSocketType);
  }
};
