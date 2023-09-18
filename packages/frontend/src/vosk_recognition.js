import * as Vosk from 'vosk-browser'
import {initVideo, initVideoStream, canvasSizing, textPrint, erasePrint, showImage, playbackCinema} from './imageEvent'
//import {initAudio, initAudioStream, sinewave, whitenoise, feedback, bass, click, chatReq, playAudioStream, stopCmd, recordReq, streamFlag} from './webaudio'
import {keyDown} from './textInput'

//
let model = null;
const cnvs = document.getElementById('cnvs');
const ctx  = cnvs.getContext('2d');
let voiceFlag = true

/*
setInterval(() => {
  result = ''
  textPrint(result, ctx, cnvs)
}, 30000)
*/

let result = ''

// 初期化処理
async function init() {
  // 権限取得のための素振り
  const s = await navigator.mediaDevices.getUserMedia({video: false, audio: true})
  s.getTracks().forEach(t => t.stop())

  // マイク列挙処理
  const select = document.getElementById('micSelect')
  navigator.mediaDevices.enumerateDevices().then(devices => {
    devices.filter(d => d.kind === "audioinput").forEach(d => {
    })
  })
  // 同一ディレクトリの model.tar.gz を（Webから）読み込む。
  console.log('test')
  model = await Vosk.createModel('model/vosk-model-small-en-us-0.15.tar.gz')
  console.log('test2')

  // ボタン有効化
  // document.getElementById('start').disabled = false
  clicked = true
}

// ボタンの処理
async function start() {
  // document.getElementById('start').disabled = true

  const recognizer = new model.KaldiRecognizer(44100)


  // 文章確定時はdivに流し込む
  recognizer.on('result', event => {
    result = result + ' ' + event.result.text
    textPrint(result, ctx, cnvs)
    /*
    const p = document.createElement('p')
    p.innerText = event.result.text
    result.append(p)
    */
  })

  // 部分的結果はspanでリアルタイム表示してみる
  recognizer.on('partialresult', event => {
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
  })

  // 選択されたマイクをオープン
  const stream = await navigator.mediaDevices.getUserMedia({
    video: false,
    audio: true
  })

  // WebAudioでノードをつなぐ
  const audioContext = new AudioContext()

  // AudioWorkletにするのも複雑なんでdeprecatedだけどサンプル通りScriptProcessorNodeで実装
  // 言語バインディングによって異なるが、JavaScriptバインディングは AudioBuffer を受け取るので
  // ScriptProcessorNode が一番簡単。f32-plannerでも受け取ってくれる
  const recognizerNode = audioContext.createScriptProcessor(4096, 1, 1)
  recognizerNode.onaudioprocess = event => {
    try {
      // 認識エンジンに突っ込む
      recognizer.acceptWaveform(event.inputBuffer)
      // outputをゼロフィル（無音化）しておく
      // 何もしなくても無音かも
      event.outputBuffer.getChannelData(0).fill(0)
    } catch (err) {
      console.error(err)
    }
  }

  // destinationまでつながないと動かないような・・・？
  const sourceNode = audioContext.createMediaStreamSource(stream)
  sourceNode.connect(recognizerNode).connect(audioContext.destination)
}


let clicked = false

const clickWrapper = () => {
  if(!clicked) {
    init()
    textPrint('initialized. click screen once more', ctx, cnvs)
  } else {
    start()
    textPrint('voice recognition start...', ctx, cnvs)
  }
}

canvasSizing()

console.log('debug')
const button = document.getElementById('wrapper')

button.addEventListener('click', clickWrapper);

textPrint('click screen 2 time', ctx, cnvs)
