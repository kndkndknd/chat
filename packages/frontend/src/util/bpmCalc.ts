export function millisecondsPerBar(bpm: number): number {
  const beatsPerMinute = bpm;
  const millisecondsPerMinute = 60000;
  const millisecondsPerBar = (4 * millisecondsPerMinute) / beatsPerMinute;
  return millisecondsPerBar;
}

export function secondsPerEighthNote(bpm: number): number {
  const beatsPerMinute = bpm;
  const millisecondsPerMinute = 60000;
  const millisecondsPerEighthNote = millisecondsPerMinute / beatsPerMinute / 2;
  const secondsPerEighthNote = millisecondsPerEighthNote / 1000;
  return secondsPerEighthNote;
}

export const millisecondsPerBeat = (bpm: number) => {
  if (bpm <= 0) {
    throw new Error("BPM must be greater than 0");
  }
  return 60000 / bpm;
};
