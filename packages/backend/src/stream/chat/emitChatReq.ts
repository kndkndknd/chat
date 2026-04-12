// import { pickupStreamTarget, pickupPaStreamTarget } from "./pickupStreamTarget";
import { pickupTarget } from "../../clientProcess/pickupTarget";
import { currentState, webSocketState } from "../../state";
import { targetEmit } from "../../webSocket";

export const emitChatReq = async () => {
  console.log(currentState.stream.CHAT);
  if (currentState.stream.CHAT) {
    // currentState.stream.CHAT = true;
    const targetId = pickupTarget("CHAT", "STREAM");
    if (targetId[0] === "undefined" || targetId[0] === "") {
      console.log("no target");
      return;
    }
    console.log('target:', targetId);
    targetId.forEach((id) => {
      targetEmit(id, {
        type: "streamReq",
        payload: { source: "CHAT", record: false },
      });
    });
  // } else {
    // currentState.stream.CHAT = false;
  }
};

export const paChatPreparation = async () => {
  if (!currentState.stream.CHAT) {
    // console.log(state.client);
    currentState.stream.CHAT = true;
    // const targetId = pickupPaStreamTarget();
    const targetId = pickupTarget("CHAT", "STREAM", { pa: true });
    if (targetId[0] === "undefined" || targetId[0] === "") {
      console.log("no target");
      return;
    }

    console.log('target:', targetId);
    // if (targetId !== "arduino") {
    targetId.forEach((id) => {
      targetEmit(id, {
        type: "streamReq",
        payload: { source: "CHAT", record: false },
      });
    });
  } else {
    currentState.stream.CHAT = false;
  }
};
