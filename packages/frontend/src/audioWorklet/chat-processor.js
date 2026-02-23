const DEFAULT_BUFFER_SIZE = 8192;
class ChatProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        Object.defineProperty(this, "bufferLengthState", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "targetFrames", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "writeIndex", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "buffer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bufferIndex", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bufferSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.bufferSize = DEFAULT_BUFFER_SIZE;
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
        // const initState = options?.processorOptions?.initialBufferLengthState ?? 8; // デフォルト8
        // this.bufferLengthState = Math.max(1, initState | 0);
        // this.targetFrames = 128 * this.bufferLengthState;
        // this.buffer = new Float32Array(this.targetFrames);
        this.port.onmessage = (event) => {
            const { type, payload } = event.data ?? {};
            if (type === "updateBufferLengthState") {
                const next = Math.max(1, Number(payload) | 0);
                if (next !== this.bufferLengthState) {
                    this.bufferLengthState = next;
                    this.targetFrames = 128 * this.bufferLengthState;
                    // 途中の残量は破棄し、新サイズでバッファを再割当
                    this.writeIndex = 0;
                    this.buffer = new Float32Array(this.targetFrames);
                    this.port.postMessage({
                        type: "log",
                        payload: `bufferLengthState -> ${this.bufferLengthState} (targetFrames=${this.targetFrames})`,
                    });
                }
            }
            else if (type === "setBufferSize") {
                const newSize = payload;
                if (!Number.isInteger(newSize) || newSize < 128) {
                    this.port.postMessage({
                        type: "error",
                        payload: `Invalid buffer size: ${newSize}. Must be integer >= 128.`,
                    });
                    return;
                }
                this.bufferSize = newSize;
                this.buffer = new Float32Array(this.bufferSize);
                this.bufferIndex = 0;
                this.port.postMessage({
                    type: "log",
                    payload: `Buffer size updated to ${this.bufferSize} frames.`,
                });
            }
        };
    }
    /**
     * 複数チャネルが来る環境向け：平均してモノラル化
     */
    // private mixToMono(input: Float32Array[]): Float32Array {
    //   if (input.length === 0) return new Float32Array(128);
    //   if (input.length === 1) return input[0];
    //   const out = new Float32Array(128);
    //   const chs = input.length;
    //   for (let i = 0; i < 128; i++) {
    //     let sum = 0;
    //     for (let ch = 0; ch < chs; ch++) sum += input[ch][i] || 0;
    //     out[i] = sum / chs;
    //   }
    //   return out;
    // }
    process(inputs, _outputs, _parameters) {
        const input = inputs[0];
        if (!input || input.length === 0)
            return true;
        const channelData = input[0];
        for (let i = 0; i < channelData.length; i++) {
            this.buffer[this.bufferIndex++] = channelData[i];
            if (this.bufferIndex >= this.bufferSize) {
                const transferBuffer = this.buffer.buffer.slice(0);
                this.port.postMessage({ type: "buffer", payload: transferBuffer }, [
                    transferBuffer,
                ]);
                //     this.port.postMessage({ type: "buffer", payload: transferable }, [
                //       transferable,
                //     ]);
                this.buffer = new Float32Array(this.bufferSize);
                this.bufferIndex = 0;
            }
        }
        // inputs[0] が最初のノード入力（各チャネルの 128 サンプル）
        // const inputChannels = inputs[0];
        // if (!inputChannels || inputChannels.length === 0) {
        //   return true; // サイレンスでも継続
        // }
        // const mono128 = this.mixToMono(inputChannels);
        // // 書き込みループ：ターゲット長に達したら送信
        // let srcOffset = 0;
        // while (srcOffset < mono128.length) {
        //   const remainInChunk = this.targetFrames - this.writeIndex;
        //   const toCopy = Math.min(remainInChunk, mono128.length - srcOffset);
        //   this.buffer.set(
        //     mono128.subarray(srcOffset, srcOffset + toCopy),
        //     this.writeIndex,
        //   );
        //   this.writeIndex += toCopy;
        //   srcOffset += toCopy;
        //   if (this.writeIndex >= this.targetFrames) {
        //     // 転送用コピーを作らず、所有権移転（Transfer）でコスト削減
        //     const transferable = this.buffer.buffer; // ArrayBuffer
        //     this.port.postMessage({ type: "buffer", payload: transferable }, [
        //       transferable,
        //     ]);
        //     // 新しいバッファを割り当て直して継続（古い Float32Array は移転済み）
        //     this.buffer = new Float32Array(this.targetFrames);
        //     this.writeIndex = 0;
        //   }
        // }
        // true で継続
        return true;
    }
}
registerProcessor("chat-processor", ChatProcessor);
