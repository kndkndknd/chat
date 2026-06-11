import { SocketFacade } from "./socket/SocketFacade";
import { textPrint, erasePrint, eraseText } from "./canvasEvent";
import { bass, sinewave } from "./webaudio";
import { toggleGainUI } from "./ui/gainUI";
import { voice } from "./voice";
// import { frontState } from "./globalVariable";
let bassFlag = false;
// /counter で rotateReqFromClient 送信後、30秒間は再送信を抑制するためのフラグ
let counterCooldown = false;
let counterTimer: ReturnType<typeof setTimeout> | null = null;
let keyboardCooldown = false;
const COUNTER_COOLDOWN_MS = 60 * 1000;
const KEYBOARD_COOLDOWN_MS = 5 * 1000;
// rotateReqFromClient(true) の送信回数。COUNTER_MAX_SENDS に達したら長いクールダウンに入る。
// COUNTER_MAX_SENDS が 0 のときは回数制限なし（長いクールダウンに入らず通常サイクルを繰り返す）。
let counterSendCount = 0;
const COUNTER_MAX_SENDS = 0;
const COUNTER_LONG_COOLDOWN_MS = 3 * 60 * 1000;
// sinewave のゲイン既定値（バックエンド定義 cmdState.GAIN.SINEWAVE と一致）
const SINEWAVE_DEFAULT_GAIN = 0.2;
// sinewave を鳴らし続ける時間（20秒）
const SINEWAVE_DURATION_MS = 20 * 1000;

export const keyDown = (
  e: KeyboardEvent,
  stringsClient: string,
  socket: SocketFacade,
  strCnvs = <HTMLCanvasElement>document.getElementById("cnvs"),
  stx = <CanvasRenderingContext2D>(
    (document.getElementById("cnvs") as HTMLCanvasElement).getContext("2d")
  ),
  start?,
) => {
  let character: string;

  if (e.key) {
    character = e.key;
  } else {
    character = keyCode[e.keyCode];
  }

  if (window.location.pathname === "/counter") {
    // クールダウン中は textInput があっても rotateReqFromClient を送信しない
    if (!keyboardCooldown) {
      // クールダウン開始時の送信 → サーバで m5Switch(rotation, true)
      socket.emit("rotateReqFromClient", true);
      counterSendCount++;
      counterCooldown = true;
      keyboardCooldown = true;
      setTimeout(() => {
        keyboardCooldown = false;
      }, KEYBOARD_COOLDOWN_MS);
      counterTimer = setTimeout(() => {
        counterTimer = null;
        // クールダウン終了時の送信 → サーバで m5Switch(rotation, false)
        socket.emit("rotateReqFromClient", false);

        if (COUNTER_MAX_SENDS > 0 && counterSendCount >= COUNTER_MAX_SENDS) {
          // 規定回数に達したら、false 実行後さらに3分間のクールダウンを継続する
          counterTimer = setTimeout(() => {
            counterCooldown = false;
            counterTimer = null;
            counterSendCount = 0;
          }, COUNTER_LONG_COOLDOWN_MS);
        } else {
          counterCooldown = false;
        }
      }, COUNTER_COOLDOWN_MS);
    }
      stringsClient = stringsClient + character;
      eraseText(stx, strCnvs);
      textPrint(stringsClient);

      // 20文字を超えたら英語で読み上げる（/counter では音量を半分にする）
      if (stringsClient.length > 20) {
        voice({ text: stringsClient, lang: "en-US", volume: 0.5 });

        // 100〜20000 の数字として解釈できる文字列が含まれていれば sinewave を鳴らす
        const matched = stringsClient.match(/\d+/);
        if (matched) {
          const frequency = parseInt(matched[0], 10);
          if (frequency >= 100 && frequency <= 20000) {
            sinewave(true, frequency, 0, 0, SINEWAVE_DEFAULT_GAIN);
            // 20秒後に flag=false（その他の引数は前回と同じ）で停止する
            setTimeout(() => {
              sinewave(false, frequency, 0, 0, SINEWAVE_DEFAULT_GAIN);
            }, SINEWAVE_DURATION_MS);
          }
        }

        stringsClient = "";
      }

    return stringsClient;
  }

  return processChar(character, stringsClient, socket, strCnvs, stx);
};

const processChar = (
  character: string,
  stringsClient: string,
  socket: SocketFacade,
  strCnvs: HTMLCanvasElement,
  stx: CanvasRenderingContext2D,
): string => {
  if (character === "\\") {
    bassFlag = !bassFlag;
    stringsClient = "BASS";
    socket.emit("charFromClient", "BASS");
    if(!window.location.pathname.includes("nosound")){
      bass(bassFlag, 0.4);
      if (bassFlag) {
        textPrint(stringsClient);
      } else {
        erasePrint(stx, strCnvs);
      }
    }
  } else if (character === "Enter" && stringsClient === "GAIN") {
    toggleGainUI();
    erasePrint(stx, strCnvs);
    stringsClient = "";
  } else if (
    character === "Eisu" ||
    character == "Meta" ||
    character === "Shift" ||
    character === "Control" ||
    character === "Alt"
  ) {
    console.log(character + " pressed");
  } else {
    if (character === " ") {
    }
    if (/\w/.test(character) && character.length === 1) {
      stringsClient = stringsClient + character.toUpperCase();
      socket.emit("charFromClient", character.toUpperCase());
    } else {
      socket.emit("charFromClient", character);
    }

    console.log(character);

    if (character === "Enter" && stringsClient != "VOICE") stringsClient = "";
    //  erasePrint('strings', stx, strCnvs)
    eraseText(stx, strCnvs);
    textPrint(stringsClient);
    //  if(ctx) erasePrint('canvas', ctx, cnvs)
  }

  return stringsClient;
};

export const keyCode = {
  "48": "0",
  "49": "1",
  "50": "2",
  "51": "3",
  "52": "4",
  "53": "5",
  "54": "6",
  "55": "7",
  "56": "8",
  "57": "9",
  "65": "A",
  "66": "B",
  "67": "C",
  "68": "D",
  "69": "E",
  "70": "F",
  "71": "G",
  "72": "H",
  "73": "I",
  "74": "J",
  "75": "K",
  "76": "L",
  "77": "M",
  "78": "N",
  "79": "O",
  "80": "P",
  "81": "Q",
  "82": "R",
  "83": "S",
  "84": "T",
  "85": "U",
  "86": "V",
  "87": "W",
  "88": "X",
  "89": "Y",
  "90": "Z",
  "8": "Backspace",
  "13": "Enter",
  "17": "Control",
  "18": "Alt",
  "9": "Tab",
  "32": " ",
  "27": "Escape",
  "37": "ArrowLeft",
  "38": "ArrowUp",
  "39": "ArrowRight",
  "40": "ArrowDown",
  "188": ",",
  "186": ":",
  "190": ".",
  "189": "-",
  "226": "BASS",
  "220": "BASS",
  "191": "/",
  "219": "[",
  "221": "]",
  "222": "'",
  "187": ";",
};

const shiftKeyMap = {
  "49": "!",
  "50": "'",
  "51": "#",
  "52": "$",
  "53": "%",
  "54": "&",
  "55": '"',
  "56": "(",
  "57": ")",
  "188": "<",
  "190": ">",
  "189": "=",
  "226": "_",
  "220": "_",
  "191": "?",
  "219": "{",
  "221": "}",
  "222": '"',
  "187": "+",
  "186": "+",
  "192": "BASSS",
  "65": "A",
  "66": "B",
  "67": "C",
  "68": "D",
  "69": "E",
  "70": "F",
  "71": "G",
  "72": "H",
  "73": "I",
  "74": "J",
  "75": "K",
  "76": "L",
  "77": "M",
  "78": "N",
  "79": "O",
  "80": "P",
  "81": "Q",
  "82": "R",
  "83": "S",
  "84": "T",
  "85": "U",
  "86": "V",
  "87": "W",
  "88": "X",
  "89": "Y",
  "90": "Z",
  "13": "enter",
  "17": "ctrl",
  "36": "home",
  "18": "alt",
  "9": "tab",
  "32": " ",
  "107": "add",
  "20": "caps_lock",
  "27": "escape",
  "37": "left_arrow",
  "38": "up_arrow",
  "39": "right_arrow",
  "40": "down_arrow",
  "112": "f1",
  "113": "f2",
  "114": "f3",
  "115": "f4",
  "116": "f5",
  "117": "f6",
  "118": "f7",
  "119": "f8",
  "120": "f9",
  "121": "f10",
  "122": "f11",
  "123": "f12",
};
