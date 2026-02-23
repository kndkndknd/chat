export const modulationByBPM = (
  baseFrequency: number,
  bpm: number,
  cmdClient: string[]
): number[] => {
  if (bpm <= 0) {
    throw new Error("BPM must be greater than zero");
  }
  // if (cmdClient.length < 2) {
  //   throw new Error("cmdClient must have at least 2 elements");
  // }
  const modulationPeriodMs = 60000 / bpm;

  return cmdClient.map((client, index) => {
    if (index === 0) {
      return baseFrequency;
    } else {
      return calculateModulationFrequency(
        baseFrequency,
        modulationPeriodMs * index,
        index % 2 === 0 ? true : false
      );
    }
  });
};

function calculateModulationFrequency(
  frequency1: number,
  modulationPeriodMs: number,
  plusminus: boolean
): number {
  if (modulationPeriodMs <= 0) {
    throw new Error("Modulation period must be greater than zero");
  }

  // モジュレーション周波数を計算
  const modulationFrequency = 1000 / modulationPeriodMs;

  if (plusminus) {
    return frequency1 + modulationFrequency;
  } else {
    return frequency1 - modulationFrequency;
  }
}
