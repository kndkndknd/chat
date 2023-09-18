type clientStatusType = {
  No: {
    [key: number]: string
  },
  voice: {
    [key: string]: boolean
  }
  // インデックスシグネチャ・・string型のキーにstring | number型の値
  // ただし、keyが数値の場合もstringにキャストされる
  // keyの型はstring or numberのみ
}

export let statusClient = {  
}

/*
type UserAddProperty = {
  // インデックスシグネチャ・・string型のキーにstring | number型の値
  // ただし、keyが数値の場合もstringにキャストされる
  // keyの型はstring or numberのみ
  [key: string]: string | number // string or number型の値が入る
}

const userB: UserAddProperty = {
  name: 'ひろ', // これが無いとコンパイルエラー
  type: 'おたく', // 定義してないプロパティを追加出来る
  tall: 178, // 定義してないプロパティを追加出来る
  11: 192 // 定義してないプロパティを追加出来る
}
*/
export let statusList = {
  "ipAddress": "",
  "osc":{
    "stream": false,
    "rate": false
  },
  "sinewave":{
    "portament" : {
      "0" : "0",
      "1" : "50",
      "2" : "500",
      "3" : "5000",
      "4" : "50000"
    }
  },
  "gain": {
    "masterGain": "0.4",
    "oscGain": "0.55",
    "feedbackGain": "0.8",
    "noiseGain": "0.6",
    "clickGain": "0.8",
    "bassGain": "0.7",
    "chatGain": "0.6",
    "playbackGain": "0.7",
    "timelapseGain": "0.7",
    "drumGain": "0.8",
    "secbeforeGain": "0.6",
    "silenceGain": "0"
  },
  "sampleRate":{
    "CHAT": "48000",
    "TIMELAPSE": "48000",
    "PLAYBACK": "48000",
    "KICK": "48000",
    "SNARE": "48000",
    "HAT": "48000",
    "INTERNET": "48000"
  },
  "speech":false,
  "connected":{
    "client":{},
    "ctrl":{}
  },
  "pc": {
    "MacBookPro2013": "Mac OS X 10_11_6",
    "MacBook2008": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36",
    "MacBookPro2009": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2625.0 Safari/537.36",
    "Linux Lubuntu": "Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/60.0.3112.78 Chrome/60.0.3112.78 Safari/537.36",
    "Windows": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.101 Safari/537.36"
  },
  "arduino": {
    "network": "192.168.0.",
    "client": {
      "1": {
        "host": "134",
        "flag": false
      }
    }
  },
  "instruction": {
    "HANG": "HANG",
    "STACK": "STACK",
    "WALK": "WALK",
    "QUIET": "QUIET",
    "THINK": "THINK",
    "TAKE PHOTOGRAPH": "TAKE PHOTOGRAPH",
    "GO OUT": "GO OUT",
    "LOOK": "LOOK"
  },
  "faceDetect": false,
  "dark": false,
  "cmd":{
    "now": {
      "SINEWAVE": false,
      "WHITENOISE": false,
      "FEEDBACK": false,
      "BASS": false,
      "CHAT": false,
      "PLAYBACK": false,
      "TIMELAPSE": false,
      "INTERNET": false,
      "FILE": false,
      "DRUM": false,
      "SILENCE": false,
      "RECORD": false,
      "SWITCH": false,
      "KICK": false,
      "SNARE": false,
      "HAT": false,
      "FAN": false
    },
    "past": {
      "SINEWAVE": false,
      "WHITENOISE": false,
      "FEEDBACK": false,
      "BASS": false,
      "CHAT": false,
      "PLAYBACK": false,
      "TIMELAPSE": false,
      "INTERNET": false,
      "FILE": false,
      "DRUM": false,
      "SILENCE": false,
      "RECORD": false,
      "KICK": false,
      "SNARE": false,
      "HAT": false,
      "SWITCH": false
    },
    "mute": {
      "all": false
    },
    "PORTAMENT" : 0,
    "FADE": {
      "IN": "0",
      "OUT": "0"
    },
    "target": {
      "client": true
    },
    "prevCmd": "",
    "prevTime": "",
    "list":{
      "FEEDBACK": "FEEDBACK",
      "FEED": "FEEDBACK",
      "WHITENOISE": "WHITENOISE",
      "NOISE": "WHITENOISE",
      "CLICK": "CLICK",
      "BASS": "BASS",
      "VIDEOCHAT": "CHAT",
      "CHAT": "CHAT",
      "RECORD": "RECORD",
      "REC": "RECORD",
      "SAMPLERATE": "SAMPLERATE",
      "RATE": "SAMPLERATE",
      "DRUM": "DRUM",
      "KICK": "KICK",
      "SNARE": "SNARE",
      "HAT": "HAT",
      "SILENCE": "SILENCE",
      "PLAY": "PLAYBACK",
      "PLAYBACK": "PLAYBACK",
      "INTERNET": "INTERNET",
      "NET": "INTERNET",
      "LAPSE": "TIMELAPSE",
      "TIMELAPSE": "TIMELAPSE",
      "FILTER": "FILTER",
      "MONITORING": "CHAT",
      "MONITOR": "CHAT",
      "SINEWAVE": "SINEWAVE",
      "TWICE": "TWICE",
      "DOUBLE": "TWICE",
      "THRICE": "THRICE",
      "TRIPLE": "THRICE",
      "HALF": "HALF",
      "BACKGROUNDNOISE": "MANEKKO",
      "BGN": "MANEKKO",
      "SOLFAGE":"MANEKKO",
      "MANE":"MANEKKO",
      "MANEKKO":"MANEKKO",
      "3D":"3D"
    },
    "textList": {
      "サイン波": "440",
      "正弦波": "440",
      "純音": "440",
      "高音": "10000",
      "高域": "10000",
      "低音": "90",
      "低周波": "90",
      "フィードバック": "FEEDBACK",
      "FEEDBACK": "FEEDBACK",
      "feedback": "FEEDBACK",
      "発振": "FEEDBACK",
      "ノイズ": "WHITENOISE",
      "雑音": "WHITENOISE",
      "NOISE": "WHITENOISE",
      "noise": "WHITENOISE",
      "クリック": "CLICK",
      "CLICK": "CLICK",
      "click": "CLICK",
      "点": "CLICK",
      "ベース": "BASS",
      "BASS": "BASS",
      "bass": "BASS",
      "低域": "BASS",
      "チャット": "CHAT",
      "会話": "CHAT",
      "CHAT": "CHAT",
      "chat": "CHAT",
      "drum": "DRUM",
      "ドラム": "DRUM",
      "ビート": "DRUM",
      "レコード": "RECORD",
      "録音": "RECORD",
      "RECORD": "RECORD",
      "rec": "RECORD",
      "REC": "RECORD",
      "プレイバック":"PLAYBACK",
      "再生":"PLAYBACK",
      "PLAYBACK": "PLAYBACK",
      "play": "PLAYBACK",
      "タイムラプス":"TIMELAPSE",
      "観測":"TIMELAPSE",
      "TIMELAPSE": "TIMELAPSE",
      "timelapse": "TIMELAPSE",
      "サンプルレート":"SAMPLERATE",
      "サンプリングレート":"SAMPLERATE",
      "サンプル周波数":"SAMPLERATE",
      "サンプリング周波数":"SAMPLERATE",
      "SAMPLERATE": "SAMPLERATE",
      "RATE": "SAMPLERATE",
      "rate": "SAMPLERATE",
      "グリッチ":"GLITCH",
      "破壊":"GLITCH",
      "壊す":"GLITCH",
      "GLITCH":"GLITCH",
      "glitch":"GLITCH",
      "タイル":"TILE",
      "TILE":"TILE",
      "配置":"TILE",
      "グリッド":"GRID",
      "定期":"GRID",
      "クォンタイズ":"QUANTIZE",
      "拍":"QUANTIZE",
      "ランダム": "RANDOM",
      "乱数": "RANDOM",
      "RANDOM": "RANDOM",
      "random": "RANDOM",
      "半分":"HALF",
      "HALF":"HALF",
      "half":"HALF",
      "2倍":"TWICE",
      "TWICE":"TWICE",
      "停止":"STOP",
      "ストップ":"STOP",
      "止めた":"STOP",
      "止める":"STOP",
      "stop":"STOP",
      "STOP":"STOP",
      "予定とできごと":"SCENARIO"
    },
    "textState": {
      "440": false,
      "90": false,
      "10000": false,
      "WHITENOISE": false,
      "FEEDBACK": false,
      "BASS": false,
      "CLICK": false,
      "CHAT": false,
      "PLAYBACK": false,
      "TIMELAPSE": false,
      "INTERNET": false,
      "FILE": false,
      "DRUM": false,
      "SILENCE": false,
      "RECORD": false,
      "GLITCH": false,
      "TILE": false,
      "SWITCH": false,
      "KICK": false,
      "SNARE": false,
      "HAT": false,
      "FAN": false,
      "STOP": false,
      "TWICE": false,
      "HALF": false,
      "RANDOM": false,
      "SAMPLERATE": false
    },
    "stream": {
      "VIDEOCHAT": "CHAT",
      "CHAT": "CHAT",
      "MONITORING": "CHAT",
      "INTERNET": "INTERNET",
      "NET": "INTERNET",
      "DRUM": "DRUM",
      "SILENCE": "SILENCE",
      "PLAY": "PLAYBACK",
      "PLAYBACK": "PLAYBACK",
      "LAPSE": "TIMELAPSE",
      "TIMELAPSE": "TIMELAPSE"
    },
    "streamFlag": {
      "CHAT": false,
      "DRUM": false,
      "SILENCE": false,
      "PLAYBACK": false,
      "TIMELAPSE": false,
      "INTERNET": false
    }
  },
  "streamStatus": {
    "waitCHAT": false,
    "emitMode": "NORMAL",
    "cutup": false,
    "streamFlag": {
      "CHAT": false,
      "KICK": false,
      "SNARE": false,
      "HAT": false,
      "SILENCE": false,
      "PLAYBACK": false,
      "TIMELAPSE": false,
      "INTERNET": false
    },
    "streamCmd": {
      "VIDEOCHAT": "CHAT",
      "CHAT": "CHAT",
      "MONITORING": "CHAT",
      "KICK": "KICK",
      "SNARE": "SNARE",
      "HAT": "HAT",
      "SILENCE": "SILENCE",
      "PLAY": "PLAYBACK",
      "PLAYBACK": "PLAYBACK",
      "LAPSE": "TIMELAPSE",
      "TIMELAPSE": "TIMELAPSE",
      "INTERNET": "INTERNET",
      "NET": "INTERNET"
    },
    "timer": {
      "CHAT": false,
      "KICK": false,
      "SNARE": false,
      "HAT": false,
      "SILENCE": false,
      "PLAYBACK": false,
      "TIMELAPSE": false,
      "INTERNET": false
    },
    "latency":{
      "CHAT": "0",
      "DRUM": "0",
      "SILENCE": "0",
      "PLAYBACK": "0",
      "INTERNET": "0",
      "TIMELAPSE": "0"
    },
    "glitch": {
      "CHAT": false,
      "DRUM": false,
      "SILENCE": false,
      "PLAYBACK": false,
      "INTERNET": false,
      "TIMELAPSE": false
    },
    "grid": false,
    "chatSequence": false,
    "quantize": false,
    "record": false
  },
  "clients": {
    "dummy": {
      "room": "dummy",
      "No": 0,
      "ipAddress": "0.0.0.0",
      "type": "dummy",
      "STREAMS": {
        "RECORD": {"FROM": true, "arr": 0, "LATENCY": "0", "RATE": "48000"},
        "CHAT":{"FROM": true, "TO": true, "ACK": true, "arr": 0, "LATENCY": "0", "RATE":"48000"},
        "PLAYBACK": {"TO": true, "arr": 0, "LATENCY": "0", "RATE":"48000"},
        "TIMELAPSE": {"TO": true, "arr": 0, "LATENCY": "0", "RATE":"48000"},
        "DRUM": {"TO": true, "arr": 0, "LATENCY": "0", "RATE":"48000"},
        "SILENCE": {"TO": true, "arr": 0, "LATENCY": "0", "RATE":"48000"},
        "INTERNET": {"TO": true, "arr": 0, "LATENCY": "0", "RATE":"48000"}
      },
      "rhythm":{
        "bpm":"60",
        "interval":"1000",
        "score":"1,1,1,1"
      },
      "cmd":{
        "cmd":"none",
        "timestamp":"0"
      },
      "voice":false
    }
  },
  "interval":"60"
}

interface Connected {
  [index: string]: [string];
  client: [string];
  ctrl: [string];
}

export let connected: Connected = {
  client: ["dummy"],
  ctrl: ["dummy"]
}

export const pathList = {
  "httpskey": "/Users/knd/keys/",
  "home":"/Users/knd/",
  "upload": "/Downloads/MUSIC/"
}