export const webAudioState = {
    audioContext: null,
    osc: {
        osc: null,
        whitenoiseOsc: null,
        bassOsc: null,
        clickOsc: null,
        simlateOsc: null,
        threeOsc: null,
    },
    gain: {
        masterGain: null,
        chatGain: null,
        oscGain: null,
        feedbackGain: null,
        whitenoiseGain: null,
        bassGain: null,
        clickGain: null,
        simlateGain: null,
        glitchGain: null,
        feedbackReverveGain: null,
        threeGain: null,
    },
    scriptPocessor: {
        whitenoiseNose: null,
        javascriptnode: null,
    },
    convolver: {
        convolver: null,
        feedbackReverve: null,
    },
};
