import {
  cmdStateType,
  streamStateType,
  sampleRateStateType,
  glitchStateType,
  clientStateType,
  currentStateType,
  previousStateType,
  webStateType,
  bpmStateType,
  flagStateType,
  arduinoStateType,
  formStateType,
  StreamsType,
} from "../../../types";













export const formState: formStateType = {
  hls: {
    knd: "KND",
  },
  cmd: {
    ノイズ: "WHITENOISE",
    サイン波: "SINEWAVE",
    クリック: "CLICK",
    フィードバック: "FEEDBACK",
    ハウリング: "FEEDBACK",
    発振: "FEEDBACK",
    チャット: "CHAT",
    話: "CHAT",
    録: "RECORD",
    再生: "PLAYBACK",
    振り返: "TIMELAPSE",
    振返: "TIMELAPSE",
    前: "PREVIOUS",
    低音: "BASS",
    ベース: "BASS",
    止: "STOP",
    ストップ: "STOP",
    停止: "STOP",
  },
};

export const hlsState: string[] = [];




export const chat_web = true;

export const cmdList = {
  FEEDBACK: "FEEDBACK",
  FEED: "FEEDBACK",
  WHITENOISE: "WHITENOISE",
  NOISE: "WHITENOISE",
  CLICK: "CLICK",
  BASS: "BASS",
  SIMULATE: "SIMULATE",
  SIMS: "SIMULATE",
  METRONOME: "METRONOME",
  PREVIOUS: "PREVIOUS",
  PREV: "PREVIOUS",
};

export let streamList = ["PLAYBACK", "TIMELAPSE", "EMPTY"];

export const parameterList = {
  PORTAMENT: "PORTAMENT", // 引数が前提 単体は0なら5、0以外なら0
  PORT: "PORTAMENT",
  SAMPLERATE: "SAMPLERATE",
  RATE: "SAMPLERATE",
  BPM: "BPM",
  GLITCH: "GLITCH", // 単体でも使える、引数もありうる
  GRID: "GRID", // ほぼ単体使いな気がするが、STREAM指定できたらそれはそれで
  VOICE: "VOICE", // 単体。引数にするとしたら1 VOICEのような形だと思う
  RANDOM: "RANDOM",
};

export const uploadParams = {
  mediaDir: "chat_upload",
  ss: "00:00:00",
  t: "00:00:20",
};

export const helpList = {
  FEEDBACK:
    "マイクで拾った音をそのPCから再生するので、ほとんどの場合フィードバックが起こる",
  WHITENOISE: "ホワイトノイズを再生する",
  CLICK: "クリックを再生する",
  BASS: "ベースを発音する。BASSコマンドではランダムなPCからの発音で\\キーを押すと押したPCからの発音になる。音程はAのキーのランダム",
  SIMULATE: "マイクで拾った音の音程を真似してサイン波を出す",
  METRONOME: "BPMに合わせて定期的にクリックが鳴る",
  PORTAMENT:
    "サイン波の周波数の変化をなだらかにする。数字を指定するとその秒数で変化する",
  SAMPLERATE:
    "SAMPLERATEまたはRATEのあとに数字でサンプリングレートを指定する、CHATやPLAYBACKの再生速度・ピッチが変わる",
  BPM: "後ろに数字をつけてBPMを指定する。METRONOMEや、CHAT等をGRIDで再生するときにそのBPMで再生される",
  GLITCH: "カメラで拾った画像をグリッチさせる。音声はリバーブ音のみになる",
  GRID: "CHAT、PLAYBACK等をBPMのグリッドに沿って再生する（マシンパワー等によってはずれる）",
  VOICE: "キーボード入力内容を喋るモードを切り替える",
  RANDOM: "PLAYBACKやUPLOADコマンドで取得した音声・映像の順序をランダムにする",
  HELP: "このコマンド",
  PREVIOUS: "STOPする直前に再生されていた内容をまとめて再生する。PREVでも可",
  INSERT:
    "自宅のサーバのDBにPLAYBACK等を保存する INSERT (STREAM名) (場所) (日付)の形式で実行する",
};

export const streamApiUrl: string = "http://127.0.0.1:8088/getLiveStream";

