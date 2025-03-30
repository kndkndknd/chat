import { quantizeState } from "../state";
export const quantizeStop = () => {
    console.log("stop quantize");
    clearInterval(quantizeState.interval);
    return {
        flag: false,
        bar: quantizeState.bar,
        beat: quantizeState.beat,
        stream: [],
        interval: quantizeState.interval,
        timeout: 0,
    };
    // quantizeState.flag = false;
    // quantizeState.currentTime = 0;
    // quantizeState.bar = 0;
    // console.log("quantizeState:", quantizeState);
    // quantizerCurrentTime = 0;
};
