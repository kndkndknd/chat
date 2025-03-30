import { oscState, gainState } from "../state";
export const bass = (flag, gain) => {
    if (flag) {
        const freq = setBassNote();
        console.log(freq);
        oscState.bassOsc.frequency.setValueAtTime(freq, 0);
        gainState.bassGain.gain.setValueAtTime(gain, 0);
    }
    else {
        gainState.bassGain.gain.setValueAtTime(0, 0);
    }
};
const setBassNote = () => {
    let random = Math.random();
    // let note = ''
    let freq = 55;
    const bassNote = [
        { note: "A", freq: 55, probability: 0.45 },
        { note: "C", freq: 65.406, probability: 0.5 },
        { note: "D", freq: 73.416, probability: 0.7 },
        { note: "E", freq: 82.407, probability: 0.85 },
        { note: "G", freq: 97.999, probability: 0.9 },
        { note: "A", freq: 110, probability: 1 },
    ];
    // randomがbassNoteの各要素のprobabilityより小さい場合、その要素のfreqを返す
    for (let i = 0; i < bassNote.length; i++) {
        if (random < bassNote[i].probability) {
            freq = bassNote[i].freq;
            break;
        }
    }
    return freq;
};
