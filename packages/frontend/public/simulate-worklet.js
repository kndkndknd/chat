// AudioWorklet processor — collects 8192 samples then posts to main thread
class SimulateProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(8192);
    this._offset = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];
    for (let i = 0; i < channel.length; i++) {
      this._buffer[this._offset++] = channel[i];
      if (this._offset >= this._buffer.length) {
        this.port.postMessage(this._buffer.slice());
        this._offset = 0;
      }
    }
    return true;
  }
}

registerProcessor('simulate-processor', SimulateProcessor);
