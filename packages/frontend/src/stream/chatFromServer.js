import { streamChunk, quantizeState } from "../state";
import { streamPlay } from "./streamPlay";
import { showImage } from "../canvasEvent";
export const chatFromServer = (data, socket) => {
    // console.log("chatFromServer");
    if (quantizeState.flag && quantizeState.stream.includes("CHAT")) {
        const chunk = {
            source: "CHAT",
            audio: data.audio,
            video: data.video,
            sampleRate: data.sampleRate,
            glitch: data.glitch,
            bufferSize: data.bufferSize,
            duration: data.duration,
        };
        // data.source = "CHAT";
        streamChunk.CHAT = chunk;
    }
    else {
        if (data.floating === undefined || !data.floating) {
            streamPlay("CHAT", socket, data);
        }
        else {
            // const position = positionFloatingImage(data.target);
            showImage(data.video, data.position);
        }
    }
};
