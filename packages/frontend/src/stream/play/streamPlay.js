import { playAudioStream } from "./playAudioStream";
import { chatReq } from "../chatReq";
import { showImage, textPrint, erasePrint } from "../../canvasEvent";
import { flagState } from "../../state";
export const streamPlay = (type, socket, stream, cinemaFlag) => {
    // if (!frontState.quantize.flag) {
    // console.log("chatFromServer");
    // console.log("socket.id(socket.on): " + String(socket.id));
    // console.log(stream.audio);
    playAudioStream(stream.audio, stream.sampleRate, stream.glitch, stream.bufferSize, stream.filter);
    if (stream.video) {
        showImage(stream.video);
        if (type === "STREAM" && cinemaFlag !== undefined && cinemaFlag) {
            setTimeout(() => {
                erasePrint();
            }, 300);
        }
    }
    else if (stream.source !== undefined) {
        textPrint(stream.source.toLowerCase());
    }
    if (flagState.recLatency) {
        setTimeout(() => {
            if (type === "CHAT") {
                chatReq(String(socket.id));
            }
            else {
                socket.emit("streamReqFromClient", stream.source);
            }
        }, (stream.bufferSize / stream.sampleRate) * 1000);
    }
    else {
        if (type === "CHAT") {
            chatReq(String(socket.id));
        }
        else {
            socket.emit("streamReqFromClient", stream.source);
        }
    }
};
