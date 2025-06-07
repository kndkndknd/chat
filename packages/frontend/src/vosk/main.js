import * as Vosk from "vosk-browser";
import { io } from "socket.io-client";
import { socketState } from "../state";
import { textPrint, canvasSizing } from "../canvasEvent";
import { speechVoice } from "../voice";
socketState.socket = io();
socketState.socketId = socketState.socket.id;
const voskState = {
    text: "",
    interval: 0,
    intervalValue: 180000,
    voiceFlag: true,
    clicked: false,
    lang: "en",
};
let model = null;
const cnvs = document.getElementById("cnvs");
const ctx = cnvs.getContext("2d");
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
        devices.filter((d) => d.kind === "audioinput").forEach((d) => { });
    });
    // 同一ディレクトリの model.tar.gz を（Webから）読み込む。
    // model = await Vosk.createModel("model/vosk-model-small-en-us-0.15.tar.gz");
    model = await Vosk.createModel("../voskModel/vosk-model-en-us-0.22-lgraph.tar.gz");
    // ボタン有効化
    // document.getElementById('start').disabled = false
    voskState.clicked = true;
}
// ボタンの処理
async function start() {
    // document.getElementById('start').disabled = true
    const recognizer = new model.KaldiRecognizer(44100);
    // 文章確定時はtextPrintを更新
    recognizer.on("result", (event) => {
        voskState.text = voskState.text + " " + event.result.text;
        textPrint(voskState.text);
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
        }
        catch (err) {
            console.error(err);
        }
    };
    // destinationまでつながないと動かないような・・・？
    const sourceNode = audioContext.createMediaStreamSource(stream);
    sourceNode.connect(recognizerNode).connect(audioContext.destination);
    voskState.interval = window.setInterval(() => {
        if (voskState.voiceFlag && voskState.text.length > 0) {
            speechVoice({ text: voskState.text, lang: voskState.lang });
        }
        voskState.text = "";
    }, voskState.intervalValue);
}
const clickWrapper = () => {
    if (!voskState.clicked) {
        init();
        textPrint("initialized. click screen once more");
    }
    else {
        start();
        textPrint("voice recognition start...");
    }
};
canvasSizing();
console.log("debug");
const button = document.getElementById("wrapper");
button.addEventListener("click", clickWrapper);
textPrint("click screen 2 time", ctx);
