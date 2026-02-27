import * as Vosk from "vosk-browser";
import { io } from "socket.io-client";

import { socketState } from "../state";
import { textPrint, canvasSizing, erasePrint } from "../canvasEvent";
import { speechVoice } from "../voice";
import { text } from "stream/consumers";

socketState.socket = io();
socketState.socketId = socketState.socket.id;

const voskState = {
  text: "",
  interval: 0,
  intervalValue: 60000,
  recognitionFlag: true,
  voiceFlag: true,
  clicked: false,
  lang: "en-US",
  startTime: 0,
  // lang: "fr-FR", // フランス語のモデルを使用
};

let model = null;
const cnvs = <HTMLCanvasElement>document.getElementById("cnvs");
const ctx = <CanvasRenderingContext2D>cnvs.getContext("2d");

// 初期化処理
async function init() {
  // 権限取得のための素振り
  const s = await navigator.mediaDevices.getUserMedia({
    video: false,
    audio: true,
  });
  s.getTracks().forEach((t) => t.stop());

  // マイク列挙処理
  const select = document.getElementById("micSelect");
  navigator.mediaDevices.enumerateDevices().then((devices) => {
    devices.filter((d) => d.kind === "audioinput").forEach((d) => {});
  });
  // 同一ディレクトリの model.tar.gz を（Webから）読み込む。
  // model = await Vosk.createModel("model/vosk-model-small-en-us-0.15.tar.gz");
  model = await Vosk.createModel(
    // "../voskModel/vosk-model-en-us-0.22-lgraph.tar.gz"
    "../voskModel/vosk-model-small-fr-0.22.tar.gz",
    // "../voskModel/vosk-model-small-ja-0.22.tar.gz" // 日本語モデルを使用
  );

  // ボタン有効化
  // document.getElementById('start').disabled = false
  voskState.clicked = true;
}

// ボタンの処理
async function start() {
  // document.getElementById('start').disabled = true
  // console.log("debug");

  const recognizer = new model.KaldiRecognizer(44100);

  // 文章確定時はtextPrintを更新
  recognizer.on("result", (event) => {
    if (voskState.recognitionFlag) {
      voskState.text = voskState.text + " " + event.result.text;
      textPrint(voskState.text);
    }
    /*
    const p = document.createElement('p')
    p.innerText = event.result.text
    result.append(p)
    */
  });

  // 部分的結果はspanでリアルタイム表示してみる
  recognizer.on("partialresult", (event) => {
    /*
    if(event.result.partial.length > 0) {
      textPrint(event.result.partial, ctx, cnvs)
      setTimeout(() => {
        textPrint(result, ctx, cnvs)
      },500)
    }
    */
    /*
    if(voiceFlag) {
      const uttr = new SpeechSynthesisUtterance();
      //    uttr.lang = 'en-US';
          uttr.text = result
          // 英語に対応しているvoiceを設定
      speechSynthesis.speak(uttr);
      result = ''
      voiceFlag = false
      setTimeout (() => {
        voiceFlag = true
      }, 20000)
    }
    */
  });

  // 選択されたマイクをオープン
  const stream = await navigator.mediaDevices.getUserMedia({
    video: false,
    audio: true,
  });

  // WebAudioでノードをつなぐ
  const audioContext = new AudioContext();

  // AudioWorkletにするのも複雑なんでdeprecatedだけどサンプル通りScriptProcessorNodeで実装
  // 言語バインディングによって異なるが、JavaScriptバインディングは AudioBuffer を受け取るので
  // ScriptProcessorNode が一番簡単。f32-plannerでも受け取ってくれる
  const recognizerNode = audioContext.createScriptProcessor(4096, 1, 1);
  recognizerNode.onaudioprocess = (event) => {
    try {
      // 認識エンジンに突っ込む
      recognizer.acceptWaveform(event.inputBuffer);
      // outputをゼロフィル（無音化）しておく
      // 何もしなくても無音かも
      event.outputBuffer.getChannelData(0).fill(0);
    } catch (err) {
      console.error(err);
    }
  };

  // destinationまでつながないと動かないような・・・？
  const sourceNode = audioContext.createMediaStreamSource(stream);
  sourceNode.connect(recognizerNode).connect(audioContext.destination);

  voskState.interval = window.setInterval(() => {
    voskInterval();
    // voskState.startTime = Date.now();
    // if (voskState.voiceFlag && voskState.text.length > 0) {
    //   initAndSpeak(voskState.text);
    // }
    // voskState.text = "";
  }, voskState.intervalValue);
}

function initAndSpeak(text: string) {
  // 音声のロードを待ってから話す
  const loadVoices = () =>
    new Promise<SpeechSynthesisVoice[]>((resolve) => {
      const voices = speechSynthesis.getVoices();
      if (voices.length) {
        resolve(voices);
      } else {
        speechSynthesis.onvoiceschanged = () => {
          resolve(speechSynthesis.getVoices());
        };
      }
    });

  loadVoices().then((voices) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const frenchVoice = voices.find((voice) => voice.lang.startsWith("fr"));
    const japaneseVoice = voices.find((voice) => voice.lang.startsWith("ja"));

    if (frenchVoice) {
      utterance.voice = frenchVoice;
    } else {
      console.warn(
        "フランス語の音声が見つかりません。デフォルト音声を使用します。",
      );
    }
    utterance.lang = "fr-FR";

    // if (japaneseVoice) {
    //   utterance.voice = japaneseVoice;
    // } else {
    //   console.warn(
    //     "日本語の音声が見つかりません。デフォルト音声を使用します。"
    //   );
    // }
    // utterance.lang = "ja-JP";

    speechSynthesis.speak(utterance);
  });
}

const clickWrapper = () => {
  if (!voskState.clicked) {
    init();
    textPrint("initialized. click screen once more");
  } else {
    start();
    textPrint("voice recognition start...", {
      timeout: true,
      timeoutDuration: 1000,
    });
    // setTimeout(() => {
    //   erasePrint();
    // }, 1000);
  }
};

canvasSizing();

console.log("debug");
const button = document.getElementById("wrapper");

button.addEventListener("click", clickWrapper);

textPrint("click screen 2 time");

socketState.socket.on("voskCtrlFromServer", (data) => {
  if (data.type === "flag") {
    voskState.voiceFlag = data.flag;
    voskState.recognitionFlag = data.flag;
    if (voskState.voiceFlag) {
      textPrint("voice recognition start", {
        timeout: true,
        timeoutDuration: 1000,
      });
    } else {
      textPrint("voice recognition stop", {
        timeout: true,
        timeoutDuration: 1000,
      });
      voskState.text = "";
    }
  } else if (data.type === "interval change") {
    textPrint(`interval changed to ${data.value} sec`, {
      timeout: true,
      timeoutDuration: 1000,
    });
    voskState.intervalValue = data.value * 1000;
    const now = Date.now();
    // 既存のインターバルをクリア
    if (voskState.interval) {
      clearInterval(voskState.interval);
    }
    setTimeout(
      () => {
        initAndSpeak(voskState.text);
        voskState.text = "";
        voskState.interval = window.setInterval(() => {
          voskInterval();
        }, voskState.intervalValue);
      },
      data.value - (now - voskState.startTime),
    );
    textPrint(`interval changed to ${voskState.intervalValue} ms`, {
      timeout: true,
      timeoutDuration: 1000,
    });
  }
  // setTimeout(() => {
  //   erasePrint();
  // }, 1000);
});

socketState.socket.on("voskCallFromServer", () => {
  voskState.startTime = Date.now();
  const wait = voskState.text.length * 300;
  voskState.recognitionFlag = false;
  if (voskState.voiceFlag && voskState.text.length > 0) {
    initAndSpeak(voskState.text);
    voskState.text = "";
    setTimeout(() => {
      erasePrint();
    }, 1000);
  }
  setTimeout(() => {
    voskState.recognitionFlag = true;
  }, wait);
});

const voskInterval = () => {
  console.log("voskInterval called");
  voskState.startTime = Date.now();
  const wait = voskState.text.length * 300;
  voskState.recognitionFlag = false;
  if (voskState.voiceFlag && voskState.text.length > 0) {
    initAndSpeak(voskState.text);
    setTimeout(() => {
      erasePrint();
    }, wait);
  }
  voskState.text = "";
  setTimeout(() => {
    voskState.recognitionFlag = true;
  }, wait);
};
