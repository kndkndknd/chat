class WhiteNoiseProcessor extends AudioWorkletProcessor {
  private gain: number = 0.5;

  static get parameterDescriptors() {
    return [
      {
        name: "gain",
        defaultValue: 0.5,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: "a-rate",
      },
    ];
  }

  process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean {
    const output = outputs[0];
    const gainParam = parameters["gain"];

    for (let channel = 0; channel < output.length; channel++) {
      const outputChannel = output[channel];
      for (let i = 0; i < outputChannel.length; i++) {
        const gain = gainParam.length > 1 ? gainParam[i] : gainParam[0];
        // ホワイトノイズ: -1.0 〜 1.0 の一様乱数
        outputChannel[i] = (Math.random() * 2 - 1) * gain;
      }
    }

    return true; // falseを返すとノードが自動停止する
  }
}

registerProcessor("white-noise-processor", WhiteNoiseProcessor);
