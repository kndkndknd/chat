export const getLengthFromBPM = (bpm: number) => {
  if (bpm <= 0) {
    throw new Error("BPM must be greater than 0");
  }
  return 60000 / bpm;
};
