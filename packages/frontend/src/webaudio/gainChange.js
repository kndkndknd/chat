import { contextState, gainState } from "../state";
export const gainChange = (data) => {
    const currentTime = contextState.audioContext.currentTime;
    gainState.masterGain.gain.setTargetAtTime(data.MASTER, currentTime, 0);
    gainState.simulateMaxGain = data.SIMULATE;
    gainState.chatGain.gain.setTargetAtTime(data.CHAT, currentTime, 0);
    gainState.glitchGain.gain.setTargetAtTime(data.GLITCH, currentTime, 0);
};
