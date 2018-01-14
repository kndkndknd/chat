/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {


exports.keyDownFunc = function keyDownFunc(keyCode, stringsClient, socket) {
  var keyMap = {
    // const keycodeMap = {
    '48': '0',
    '49': '1',
    '50': '2',
    '51': '3',
    '52': '4',
    '53': '5',
    '54': '6',
    '55': '7',
    '56': '8',
    '57': '9',
    '65': 'A',
    '66': 'B',
    '67': 'C',
    '68': 'D',
    '69': 'E',
    '70': 'F',
    '71': 'G',
    '72': 'H',
    '73': 'I',
    '74': 'J',
    '75': 'K',
    '76': 'L',
    '77': 'M',
    '78': 'N',
    '79': 'O',
    '80': 'P',
    '81': 'Q',
    '82': 'R',
    '83': 'S',
    '84': 'T',
    '85': 'U',
    '86': 'V',
    '87': 'W',
    '88': 'X',
    '89': 'Y',
    '90': 'Z',
    '8': 'backspace',
    '13': 'enter',
    '16': 'shift',
    '17': 'ctrl',
    '36': 'home',
    '18': 'alt',
    '9': 'tab',
    '32': ' ',
    '107': 'add',
    '20': 'caps_lock',
    '27': 'escape',
    '37': 'left_arrow',
    '38': 'up_arrow',
    '39': 'right_arrow',
    '40': 'down_arrow',
    '112': 'f1',
    '113': 'f2',
    '114': 'f3',
    '115': 'f4',
    '116': 'f5',
    '117': 'f6',
    '118': 'f7',
    '119': 'f8',
    '120': 'f9',
    '121': 'f10',
    '122': 'f11',
    '123': 'f12',
    '188': 'comma',
    "190": ".",
    "189": "_",
    "226": "_",
    "220": "_"
  };
  var charCode = keyMap[keyCode];
  if (charCode === "left_arrow" || charCode === "backspace" || charCode === "escape") {
    stringsClient = "";
  } else if (keyCode >= 48 && keyCode <= 90 || keyCode === 190 || keyCode === 189 || keyCode === 226 || keyCode === 32) {
    stringsClient = stringsClient + charCode;
  }
  socket.emit('charFromClient', keyCode);
  return stringsClient;
};

exports.charEmit = function charEmit(char, socket) {
  socket.emit('charFromClient', char);
};

exports.chunkEmit = function chunkEmit(data, socket) {
  socket.emit('chunkFromClient', data);
};

exports.toBase64 = function toBase64(buffer, video) {
  var bufferContext = buffer.getContext('2d');
  buffer.width = video.videoWidth;
  buffer.height = video.videoHeight;
  bufferContext.drawImage(video, 0, 0);
  //return buffer.toDataURL("image/webp");
  return buffer.toDataURL("image/jpeg");
};

exports.textPrint = function textPrint(ctx, canvas, text) {
  // console.log("text print");
  ctx.fillStyle = "black";
  if (text.length > 2) {
    ctx.font = "bold " + String(Math.floor(canvas.width * 4 / 3 / text.length)) + "px 'Arial'";
  } else {
    ctx.font = "bold " + String(Math.floor(canvas.height * 5 / 4 / text.length)) + "px 'Arial'";
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  ctx.restore();
};

exports.whitePrint = function whitePrint(ctx, canvas) {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
};

exports.ctrlView = function ctrlView(statusList) {
  var HTML = "";
  var clients = statusList["clients"];
  var tableHTML = '<table border="1" id="clientList"><tr id="tr"><th>client</th> <th>id</th> <th>room</th><th>CHAT_FROM</th> <th>CHAT_TO</th> <th>RECORD_FROM</th> <th>PLAYBACK_TO</th> <th>TIMELAPSE_TO</th> <th>DRUM_TO</th> <th>SILENCE_TO</th> <th>BEFORE_TO</th> <th>CHAT_RATE</th>';
  for (var key in clients) {
    var chatFrom = "",
        chatTo = "",
        recordFrom = "",
        playbackTo = "",
        timelapseTo = "",
        drumTo = "",
        silenceTo = "",
        secbeforeTo = "";

    for (var status in clients[key]["STREAMS"]) {
      var _toString = Object.prototype.toString;
      if (_toString.call(clients[key]["STREAMS"][status]) === "[object Object]") {
        if ("FROM" in clients[key]["STREAMS"][status] && clients[key]["STREAMS"][status]["FROM"]) {
          switch (status) {
            case "CHAT":
              chatFrom = ' checked="checked"';
              break;
            case "RECORD":
              recordFrom = ' checked="checked"';
              break;
          }
        }
        if ("TO" in clients[key]["STREAMS"][status] && clients[key]["STREAMS"][status]["TO"]) {
          switch (status) {
            case "CHAT":
              chatTo = ' checked="checked"';
              break;
            case "PLAYBACK":
              playbackTo = ' checked="checked"';
              break;
            case "TIMELAPSE":
              timelapseTo = ' checked="checked"';
              break;
            case "DRUM":
              drumTo = ' checked="checked"';
              break;
            case "SILENCE":
              silenceTo = ' checked="checked"';
              break;
            case "SECBEFORE":
              secbeforeTo = ' checked="checked"';
              break;
          }
        }
      }
    }
    tableHTML = tableHTML + '<tr id="clientTd"><td>' + clients[key]["type"] + '</td><td id="IdTd">' + clients[key]["No"] + '</td><td>' + clients[key]["room"] + '</td><td><input type="checkbox" id="CHAT_FROM" class="route" name="' + key + '"' + chatFrom + '></td><td><input type="checkbox" id="CHAT_TO" class="route" name="' + key + '"' + chatTo + '></td><td><input type="checkbox" id="RECORD_FROM" class="route" name="' + key + '"' + recordFrom + '></td><td><input type="checkbox" id="PLAYBACK_TO" class="route" name="' + key + '"' + playbackTo + '></td><td><input type="checkbox" id="TIMELAPSE_TO" class="route" name="' + key + '"' + timelapseTo + '></td><td><input type="checkbox" id="DRUM_TO" class="route" name="' + key + '"' + drumTo + '></td><td><input type="checkbox" id="SILENCE_TO" class="route" name="' + key + '"' + silenceTo + '></td><td><input type="checkbox" id="SECBEFORE_TO" class="route" name="' + key + '"' + secbeforeTo + '></td><td><label class="sampleRateLabel" id="CHATRATELabel" name="' + key + '"></td>';
  }
  tableHTML = tableHTML + '</tr></table>';

  // latencyTable
  var rangeHTML = '<table border="1" id="latencyList">';
  for (var id in clients) {
    rangeHTML = rangeHTML = rangeHTML + '<tr id="latency_' + id + '"><td rowspan="2">' + clients[id]["No"] + '</td><td id="LATENCYLabel">latency</td>';
    for (var streamType in clients[id]["STREAMS"]) {
      if (streamType != "SECBEFORE" && streamType != "RECORD") rangeHTML = rangeHTML + '<td>' + streamType + '<input type="range" class="range" id="LATENCY_' + streamType + '" name="' + id + '" min="0" max="10" step="0.5" value="' + clients[id]["STREAMS"][streamType]["LATENCY"] + '" /></td>';
    }
    rangeHTML = rangeHTML + '</tr><tr id="rate_' + id + '"><td id="RATELabel"> sampleRate </td>';
    for (var _streamType in clients[id]["STREAMS"]) {
      if (_streamType != "RECORD" && _streamType != "SECBEFORE") rangeHTML = rangeHTML + '<td>' + _streamType + '<input type="range" class="range" id="RATE_' + _streamType + '" name="' + id + '" min="11025" max="88200" step="11025" value="' + clients[id]["STREAMS"][_streamType]["RATE"] + '" /></td>';
    }
    rangeHTML = rangeHTML + '</tr>';
  }
  rangeHTML = rangeHTML + '</table>';

  // rangeTable
  //let rangeTable = '<table border="1" id="clientRangeList"><tr id="tr"><th>client</th> <th>id</th> <th>CHAT_RATE</th> <th>masterGain</th> <th>chatGain</th> <th>playbackGain</th> <th>timelapseGain</th> <th>drumGain</th> <th>oscGain</th> <th>noiseGain</th> <th>bassGain</th>';

  // sampleRate list
  var sampleRateHTML = '<div id="sampleRate"> Sample Rate <ul id="sampleRateList">';
  for (var _key in statusList["sampleRate"]) {
    sampleRateHTML = sampleRateHTML + '<li>' + _key + ': <label class="sampleRate" id="sampleRate' + _key + 'Label">' + String(statusList["sampleRate"][_key]) + '</label><input type="range" class="range" name="sampleRate" id="' + _key + '" min="11025" max="88200" step="11025" value="' + statusList["sampleRate"][_key] + '" /></li>';
  }
  sampleRateHTML = sampleRateHTML + '</ul></div>';

  // gain list
  var gainHTML = '<div id="gainCtrl"> gain; <ul id="gainList">';
  for (var _key2 in statusList["gain"]) {
    gainHTML = gainHTML + '<li>' + _key2.substr(0, _key2.length - 4).toUpperCase() + ': <input type="range" name="gain" class="range" id="' + _key2 + '" min="0" max="1" value="' + String(statusList["gain"][_key2]) + '" step="0.05" /> <label id="gain' + _key2 + 'Label" class="gainLabel">' + String(statusList["gain"][_key2]) + '</label></li>';
  }
  gainHTML = gainHTML + '</ul> </div>';

  HTML = tableHTML + rangeHTML + sampleRateHTML + gainHTML;
  return HTML;
};

exports.statusPrint = function statusPrint(oscGainValue, freqVal, feedbackGainValue, noiseGainValue, bassFlag) {
  var statusText = "";
  if (oscGainValue > 0) {
    statusText = String(freqVal) + "Hz";
  }
  if (feedbackGainValue > 0) {
    if (statusText === "") {
      statusText = "FEEDBACK";
    } else {
      statusText = statusText + ", FEEDBACK";
    }
  }
  if (noiseGainValue > 0) {
    if (statusText === "") {
      statusText = "WHITENOISE";
    } else {
      statusText = statusText + ", WHITENOISE";
    }
  }
  if (bassFlag) {
    if (statusText === "") {
      statusText = "BASS";
    } else {
      statusText = statusText + ", BASS";
    }
  }
  return statusText;
};

exports.keycodeMap = function keycodeMap(keycode) {
  var keyMap = {
    // const keycodeMap = {
    '48': '0',
    '49': '1',
    '50': '2',
    '51': '3',
    '52': '4',
    '53': '5',
    '54': '6',
    '55': '7',
    '56': '8',
    '57': '9',
    '65': 'A',
    '66': 'B',
    '67': 'C',
    '68': 'D',
    '69': 'E',
    '70': 'F',
    '71': 'G',
    '72': 'H',
    '73': 'I',
    '74': 'J',
    '75': 'K',
    '76': 'L',
    '77': 'M',
    '78': 'N',
    '79': 'O',
    '80': 'P',
    '81': 'Q',
    '82': 'R',
    '83': 'S',
    '84': 'T',
    '85': 'U',
    '86': 'V',
    '87': 'W',
    '88': 'X',
    '89': 'Y',
    '90': 'Z',
    '8': 'backspace',
    '13': 'enter',
    '16': 'shift',
    '17': 'ctrl',
    '36': 'home',
    '18': 'alt',
    '9': 'tab',
    '32': ' ',
    '107': 'add',
    '20': 'caps_lock',
    '27': 'escape',
    '37': 'left_arrow',
    '38': 'up_arrow',
    '39': 'right_arrow',
    '40': 'down_arrow',
    '112': 'f1',
    '113': 'f2',
    '114': 'f3',
    '115': 'f4',
    '116': 'f5',
    '117': 'f6',
    '118': 'f7',
    '119': 'f8',
    '120': 'f9',
    '121': 'f10',
    '122': 'f11',
    '123': 'f12',
    '188': 'comma',
    "190": ".",
    "189": "_",
    "226": "_",
    "220": "_"
  };
  return keyMap[keycode];
};

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

var modules = __webpack_require__(0);

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

var audioContext = new AudioContext();
var masterGain = audioContext.createGain();

var gainVal = {
  "master": 0.7,
  "FEEDBACK": 1,
  "OSC": 1,
  "BASS": 0.7,
  "CLICK": 0.7,
  "NOISE": 0.3,
  "CHAT": 1,
  "PLAYBACK": 0.7,
  "TIMELAPSE": 0.7,
  "DRUM": 0.7,
  "SECBEFORE": 0.7,
  "SILENCE": 0

  //masterGain.gain.value = gainVal["master"];
};masterGain.gain.setTargetAtTime(gainVal.master, 0, 0);
var prevGain = 0.7;
masterGain.connect(audioContext.destination);

// feedback
var feedbackGain = audioContext.createGain();
feedbackGain.gain.setTargetAtTime(0, 0, 0);
//feedbackGain.gain.value = 0;
var filter = audioContext.createBiquadFilter();
filter.type = "highpass";
filter.frequency.setTargetAtTime(200, 0, 0);
//record/play
var javascriptnode = audioContext.createScriptProcessor(8192, 1, 1);
var streamBuffer = [];
var lookBackBuffer = [];
var bufferSize = 8192;
var bufferRate = 44100;
// sinewave
var osc = audioContext.createOscillator();
var oscGain = audioContext.createGain();
var oscPortament = 0;
osc.connect(oscGain);
//oscGain.connect(audioContext.destination);
oscGain.connect(masterGain);
osc.frequency.setTargetAtTime(440, 0, 0);
//osc.frequency.value = 440;
//oscGain.gain.value = 0;
oscGain.gain.setTargetAtTime(0, 0, 0);
osc.start(0);
var bassOsc = audioContext.createOscillator();
var bassGain = audioContext.createGain();
bassOsc.connect(bassGain);
bassGain.connect(masterGain);
bassOsc.frequency.setTargetAtTime(20, 0, 0);
//bassGain.gain.value = 0;
bassGain.gain.setTargetAtTime(0, 0, 0);
bassOsc.start(0);

var clickOsc = audioContext.createOscillator();
var clickGain = audioContext.createGain();
clickOsc.connect(clickGain);
clickGain.connect(masterGain);
clickOsc.frequency.setTargetAtTime(440, 0, 0);
clickGain.gain.setTargetAtTime(0, 0, 0);
clickOsc.start(0);

//whitenoise
var whitenoise = audioContext.createOscillator();
var whitenoiseNode = audioContext.createScriptProcessor(1024);
var noiseGain = audioContext.createGain();
noiseGain.gain.setTargetAtTime(0, 0, 0);
whitenoiseNode.onaudioprocess = function (ev) {
  var buf0 = ev.outputBuffer.getChannelData(0);
  var buf1 = ev.outputBuffer.getChannelData(1);
  for (var i = 0; i < 1024; ++i) {
    buf0[i] = buf1[i] = Math.random() - 0.5;
  }
};
whitenoise.connect(whitenoiseNode);
whitenoiseNode.connect(noiseGain);
noiseGain.connect(masterGain);
//whitenoiseNode.connect(audioContext.destination);
whitenoise.start(0);

//munou no unmei
/*
let munouOsc = audioContext.createOscillator();
let munouGain = audioContext.createGain();
munouOsc.connect(munouGain);
//oscGain.connect(audioContext.destination);
munouGain.connect(masterGain);
munouOsc.frequency.value = 110;
munouGain.gain.value = 0;
munouOsc.start(0);
*/
// chat
var chatBuffer = {};
var chatGain = audioContext.createGain();
chatGain.gain.setTargetAtTime(1, 0, 0);
chatGain.connect(masterGain);

var convolver = audioContext.createConvolver();
//convolver.context.sampleRate = 44100;
var revGain = audioContext.createGain();
revGain.gain.setTargetAtTime(3, 0, 0);
console.log(convolver.context.sampleRate);
convolver.connect(revGain);
revGain.connect(masterGain);
convolver.connect(masterGain);
//let droneBuff = [];
var droneBuff = {};
/*let streamGain = {
"CHAT": 1,
"PLAYBACK": 0.7,
"TIMELAPSE": 0.7,
"DRUM": 0.7,
"SECBEFORE": 0.7,
"SILENCE": 0
};*/
var timelapseFlag = false;

// voice
var ssu = new SpeechSynthesisUtterance();
ssu.lang = 'en-EN';
var voice = false;

var modList = [0.5, 0.5, 1, 18];
var chordList = [1, 4 / 3, 9 / 4, 15 / 8, 17 / 8, 7 / 3, 11 / 3];
var chordChange = 0;
var modChange = 0;
var freqVal = void 0;

// alert sound
var alertBuffer = null;

var alertPlay = function alertPlay() {
  var src = audioContext.createBufferSource();
  src.buffer = alertBuffer;
  src.connect(audioContext.destination);
  src.start();
  // console.log("alert");
};
var click = function click(frequency) {
  if (frequency) {
    clickOsc.frequency.setTargetAtTime(frequency, 0, 0);
  } else {
    clickOsc.frequency.setTargetAtTime(440, 0, 0);
  }
  //clickOsc.frequency.value = frequency || 440
  modules.textPrint(ctx, canvas, "CLICK");
  var t0 = audioContext.currentTime;
  //  clickGain.gain.value = 0.7;
  clickGain.gain.setValueAtTime(gainVal["CLICK"], t0);
  clickGain.gain.setTargetAtTime(0, t0, 0.03);
  setTimeout(function () {
    modules.whitePrint(ctx, canvas);
    // modules.textPrint(ctx, canvas, "");
  }, 300);
};

var loadSample = function loadSample(ctx, url) {
  var req = new XMLHttpRequest();
  req.open("GET", url, true);
  req.responseType = "arraybuffer";
  req.onload = function () {
    if (req.response) {
      ctx.decodeAudioData(req.response).then(function (b) {
        alertBuffer = b;
      }, function () {});
    }
  };
  req.send();
};
loadSample(audioContext, "/files/alert.wav");

var bassLine = [55, 68.75, 68.75, 82.5, 82.5, 103.125, 110];
var bassFlag = false;

var bass = function bass() {
  if (bassFlag) {
    //bassGain.gain.value = 0;
    bassGain.gain.setTargetAtTime(0, 0, 0.02);
    bassFlag = false;
    modules.whitePrint(ctx, canvas);
  } else {
    modules.whitePrint(ctx, canvas);
    // console.log("vass");
    modules.textPrint(ctx, canvas, "BASS");
    bassOsc.frequency.setTargetAtTime(bassLine[Math.floor(bassLine.length * Math.random())], 0, 0);
    //bassGain.gain.value = gainVal["BASS"];
    bassGain.gain.setTargetAtTime(gainVal.BASS, 0, 0.02);
    bassFlag = true;
    0.02;
  }
};

var filterChange = function filterChange() {
  var returnValue = 0;
  switch (filter.frequency.value) {
    case 200:
      returnValue = 2000;
      break;
    case 2000:
      returnValue = 8000;
      break;
    case 8000:
      returnValue = 14000;
      break;
    case 14000:
      returnValue = 0;
      break;
    default:
      returnValue = 200;
      break;
  }
  filter.frequency.setTargetAtTime(returnValue, 0, 0);
  return returnValue;
};

//video record/play ここから
var image = void 0;
var receive = void 0;
var receive_ctx = void 0;
var onAudioProcess = function onAudioProcess(e) {
  if (videoMode.mode != "none") {
    console.log(videoMode);
    var bufferData = new Float32Array(bufferSize);
    e.inputBuffer.copyFromChannel(bufferData, 0);
    if (videoMode.mode === "record") {
      modules.chunkEmit({ "audio": bufferData, "video": funcToBase64(buffer, video), "target": "PLAYBACK" }, socket);
    } else if (videoMode.option != "drone") {
      switch (videoMode.mode) {
        /*case "record":
        //modules.chunkEmit({"audio":bufferData, "video":funcToBase64(buffer, video), "target": "PLAYBACK"},socket);
        //break;*/
        case "chat":
          console.log("CHAT");
          chatBuffer["audio"] = bufferData;
          chatBuffer["video"] = funcToBase64(buffer, video);
          chatBuffer["target"] = "CHAT";
          break;
        case "pastBuff":
          streamBuffer.push({
            "audio": bufferData,
            "video": funcToBase64(buffer, video)
          });
          break;
        case "pastPlay":
          var beforeChunk = {};
          if (streamBuffer.length > 0) {
            beforeChunk = streamBuffer.shift();
          } else {
            beforeChunk = { "audio": bufferData, "video": funcToBase64(buffer, video) };
          }
          playAudioStream(beforeChunk["audio"], bufferRate, gainVal["SECBEFORE"], false);
          playVideo(beforeChunk["video"]);
          console.log(streamBuffer.length);
          streamBuffer.push({
            "audio": bufferData,
            "video": funcToBase64(buffer, video)
          });
          break;
        /*
        case "droneChat":
          chatBuffer["audio"] = bufferData;
          chatBuffer["video"] = modules.toBase64(buffer, video);
          chatBuffer["target"] = "DRONECHAT";
          //console.log(droneBuff);
          //if(droneBuff != undefined || droneBuff != {}){
          if("audio" in droneBuff){
            //console.log(droneBuff.sampleRate);
            //console.log(droneBuff.gain);
            playAudioStream(droneBuff["audio"],droneBuff["sampleRate"],droneBuff["gain"],false);
            playVideo(droneBuff["video"]);
          } else {
            //console.log("debug");
            modules.textPrint(ctx, canvas, stringsClient);
            //ssu?
          }
          break;
          */
      }
    } else {
      //DRONE
      if (droneBuff != undefined && droneBuff != {} && droneflag) {
        // if("audio" in playBuff) {
        //if("audio" in playBuff && !bufferPlaying) {
        if ("audio" in droneBuff) {
          //if("audio" in droneBuff && !bufferPlaying) {
          //playAudioStream(playBuff["audio"],44100,1,false);
          playAudioStream(droneBuff["audio"], droneBuff["sampleRate"], 1, false);
        }
        //if("video" in playBuff){
        if ("video" in droneBuff) {
          playVideo(droneBuff["video"]);
        } else {
          modules.textPrint(ctx, canvas, stringsClient);
        }
        //console.log("play");
        //if(droneBuff.target === "CHAT"){
        chatBuffer["audio"] = bufferData;
        chatBuffer["video"] = modules.toBase64(buffer, video);
        chatBuffer["target"] = droneBuff.target;
        //} else {
        // socket.emit('wavReqFromClient', data["target"]);
        // }
      }
    }
  }
  if (timelapseFlag) {
    var _bufferData = new Float32Array(bufferSize);
    e.inputBuffer.copyFromChannel(_bufferData, 0);
    var sendChunk = { "audio": _bufferData, "video": funcToBase64(buffer, video), "target": "TIMELAPSE" };
    modules.chunkEmit(sendChunk, socket);
    timelapseFlag = false;
  }
};
var playAudioStream = function playAudioStream(flo32arr, sampleRate, volume, glitch) {
  //if(!glitch){
  var audio_src = audioContext.createBufferSource();
  var audioData = new Float32Array(bufferSize);
  for (var i = 0; i < audioData.length; i++) {
    audioData[i] = flo32arr[i] * volume;
  }
  if (!glitch) {
    //console.log(sampleRate)
    var audio_buf = audioContext.createBuffer(1, bufferSize, sampleRate);
    audio_buf.copyToChannel(audioData, 0);
    audio_src.buffer = audio_buf;
    audio_src.connect(masterGain);
  } else {
    //GLITCH
    var _audio_buf = audioContext.createBuffer(1, bufferSize, convolver.context.sampleRate);
    _audio_buf.copyToChannel(audioData, 0);
    // console.log(audio_buf);

    audio_src.buffer = _audio_buf;
    convolver.buffer = _audio_buf;
    audio_src.connect(convolver);
  }
  //let timeOut = audio_src.buffer.duration * 1000;
  bufferPlaying = true;
  audio_src.onended = function () {
    bufferPlaying = false;
  };
  audio_src.start(0);
  /*
  droneflag = false
  setTimeout(()=>{
    droneflag = true
  },timeOut);*/
  //}
};
var bufferPlaying = false;
droneflag = true;
//video record/play ここまで

var initialize = function initialize() {
  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({
      video: true, audio: /*true*/{
        "mandatory": {
          "googEchoCancellation": false,
          "googAutoGainControl": false,
          "googNoiseSuppression": false,
          "googHighpassFilter": false
        }, "optional": []
      }
    }).then(function (stream) {
      //}, (stream) =>{
      var mediastreamsource = void 0;
      mediastreamsource = audioContext.createMediaStreamSource(stream);
      mediastreamsource.connect(filter);
      filter.connect(javascriptnode);
      filter.connect(feedbackGain);
      //      selfGain.connect(analyser);
      //    feedbackGain.connect(audioContext.destination);
      feedbackGain.connect(masterGain);
      //video
      video = document.getElementById('video');
      video.src = window.URL.createObjectURL(stream);
      video.play();
      video.volume = 0;
      renderStart();
    }, function (e) {
      return console.log(e);
    });
  } else {
    navigator.getUserMedia({
      video: true, audio: {
        "mandatory": {
          "googEchoCancellation": false,
          "googAutoGainControl": false,
          "googNoiseSuppression": false,
          "googHighpassFilter": false
        }, "optional": []
      }
    }, function (stream) {
      //}, (stream) =>{
      var mediastreamsource = void 0;
      mediastreamsource = audioContext.createMediaStreamSource(stream);
      mediastreamsource.connect(filter);
      filter.connect(javascriptnode);
      filter.connect(feedbackGain);
      //      selfGain.connect(analyser);
      //    feedbackGain.connect(audioContext.destination);
      feedbackGain.connect(masterGain);
      //video
      video = document.getElementById('video');
      video.src = window.URL.createObjectURL(stream);
      video.play();
      video.volume = 0;
      renderStart();
    }, function (e) {
      return console.log(e);
    });
  }
  //rec
  javascriptnode.onaudioprocess = onAudioProcess;
  // javascriptnode.connect(audioContext.destination);
  javascriptnode.connect(masterGain);
  //video
  image = document.createElement("img");
  receive = document.getElementById("cnvs");
  receive_ctx = receive.getContext("2d");
};

//metronome
var rhythmProperty = {
  "bpm": 60,
  "interval": 1000,
  "score": [1, 1, 1, 1],
  "timbre": 440
};
var metronome = void 0;
var metronomeCount = 0;
var startRhythm = function startRhythm(interval) {
  metronome = setInterval(function () {
    if (rhythmProperty.score[metronomeCount] === 1) {
      switch (rhythmProperty.timbre) {
        default:
          click(rhythmProperty.timbre);
        /*
        clickOsc.frequency.value = rhythmProperty.timbre
        clickGain.gain.setValueAtTime(gainVal["CLICK"], t0);
        clickGain.gain.setTargetAtTime(0,t0,0.03);
        */
      }
    }
    if (metronomeCount + 1 < rhythmProperty.score.length) {
      metronomeCount++;
    } else {
      metronomeCount = 0;
    }
  }, interval);
};

var stopRhythm = function stopRhythm() {
  clearInterval(metronome);
};

//keyboard
var stringsClient = "";

$(function () {
  $(document).on("keydown", function (e) {
    console.log(e.keyCode);
    if (e.keyCode === 188) {
      if (standAlone) {
        standAlone = false;
        modules.whitePrint(ctx, canvas);
        modules.textPrint(ctx, canvas, "network connect");
        setTimeout(function () {
          modules.whitePrint(ctx, canvas);
          //          modules.textPrint(ctx, canvas, "");
        }, 300);
      } else {
        standAlone = true;
        modules.whitePrint(ctx, canvas);
        modules.textPrint(ctx, canvas, "stand alone");
        setTimeout(function () {
          modules.whitePrint(ctx, canvas);
          //          modules.textPrint(ctx, canvas, "");
        }, 300);
      }
      socket.emit('standAlonefromClient', standAlone);
    } else if (standAlone) {
      // let charCode = keycodeMap[String(e.keyCode)];
      var charCode = modules.keycodeMap(String(e.keyCode));
      if (charCode === "enter") {
        // console.log(isNaN(Number(stringsClient)));
        if (isNaN(Number(stringsClient)) === false && stringsClient != "") {
          doCmd({
            "cmd": "SINEWAVE",
            "property": Number(stringsClient)
          });
          //          console.log("sinewave stand alone")
        } else {
          doCmd({ "cmd": stringsClient });
        }
        stringsClient = "";
      } else if (charCode === "escape") {
        doCmd({ "cmd": "STOP" });
        stringsClient = "";
      } else if (charCode === "left_arrow" || charCode === "backspace") {
        stringsClient = "";
        modules.whitePrint(ctx, canvas);
      } else if (e.keyCode >= 48 && e.keyCode <= 90 || e.keyCode === 190 || e.keyCode === 189 || e.keyCode === 32 || e.keyCode === 16) {
        switch (charCode) {
          case "C":
            click();
            break;
          case "B":
            bass();
            break;
          case "F":
            doCmd({ "cmd": "FEEDBACK" });
            break;
          case "W":
          case "N":
            doCmd({ "cmd": "WHITENOISE" });
            break;
          case "S":
            doCmd({ "cmd": "SAMPLERATE" });
            break;
          default:
            stringsClient = stringsClient + charCode;
            modules.whitePrint(ctx, canvas);
            modules.textPrint(ctx, canvas, stringsClient);
            break;
        }
      }
    } else {
      // let charCode = keycodeMap[String(e.keyCode)];
      var _charCode = modules.keycodeMap(String(e.keyCode));
      stringsClient = modules.keyDownFunc(e.keyCode, stringsClient, socket);
      modules.whitePrint(ctx, canvas);
      modules.textPrint(ctx, canvas, stringsClient);
      if (e.keyCode === 17 || e.keyCode === 0) {
        bass();
        strings = "";
        stringsClient = "";
      }
      // if(e.keyCode != 16){
      if (e.keyCode === 13 && stringsClient === "VOICE") {
        if (voice) {
          voice = false;
          modules.whitePrint(ctx, canvas);
          modules.textPrint(ctx, canvas, "VOICE OFF");
          stringsClient = "";
          setTimeout(function () {
            modules.whitePrint(ctx, canvas);
            modules.charEmit(37, socket);
          }, 500);
        } else {
          voice = true;
          modules.whitePrint(ctx, canvas);
          modules.textPrint(ctx, canvas, "VOICE MODE");
          stringsClient = "";
          setTimeout(function () {
            modules.charEmit(37, socket);
          }, 500);
        }
        //          stringsClient = "";
      }
      if (_charCode === "enter" && voice && stringsClient === "STOP") speakVoice(stringsClient);
      if (_charCode === "enter") stringsClient = "";
      // }
      // if(charCode = "enter" && voice && stringsClient != "VOICE") {
      /*
      if(charCode === "enter" && voice && stringsClient != "VOICE"){
      ssu.text = stringsClient;
      speechSynthesis.speak(ssu);
      stringsClient = "";
      }*/
    }
  });
});

window.addEventListener("load", initialize, false);

// 関数
// canvas

var canvas = document.getElementById('cnvs');
var ctx = canvas.getContext('2d');
var buffer = void 0;
var bufferContext = void 0;

$(function () {
  sizing();
  //  draw();
  $(window).resize(function () {
    sizing();
  });
});
var sizing = function sizing() {
  $("#cnvs").attr({ height: $(window).height() });
  $("#cnvs").attr({ width: $(window).width() });
};

var renderStart = function renderStart() {
  video = document.getElementById('video');
  buffer = document.createElement('canvas');
  bufferContext = buffer.getContext('2d');

  var render = function render() {
    requestAnimationFrame(render);
    var width = video.videoWidth;
    var height = video.videoHeight;
    if (width == 0 || height == 0) {
      return;
    }
    buffer.width = width;
    buffer.height = height;
    bufferContext.drawImage(video, 0, 0);
  };
  render();
};

/* socket */
socket.emit('connectFromClient', client);
socket.on('connectFromServer', function (data) {
  rhythmProperty = data.rhythm;
});

socket.on('stringsFromServer', function (data) {
  modules.whitePrint(ctx, canvas);
  modules.textPrint(ctx, canvas, data);
  //speakVoice(data)
});

socket.on('statusViewFromServer', function () {
  var statusText = modules.statusPrint(oscGain.gain.value, freqVal, feedbackGain.gain.value, noiseGain.gain.value, bassFlag);
  strings = "";
  stringsClient = "";
  modules.whitePrint(ctx, canvas);
  modules.textPrint(ctx, canvas, statusText);
  setTimeout(function () {
    modules.whitePrint(ctx, canvas);
  }, 500);
});

socket.on('cmdFromServer', function (data) {
  if (standAlone === false) {
    doCmd(data);
  }
});
socket.on('textFromServer', function (data) {
  speakVoice(data);
  modules.whitePrint(ctx, canvas);
  modules.textPrint(ctx, canvas, data);
  setTimeout(function () {
    modules.whitePrint(ctx, canvas);
  }, 800);
  stringsClient = "";
});

socket.on('instructionFromServer', function (data) {
  videoStop();
  modules.whitePrint(ctx, canvas);
  modules.textPrint(ctx, canvas, data["text"]);
  //alertPlay();
  speakVoice(data);
  mode = "instruction";
  setTimeout(function () {
    modules.whitePrint(ctx, canvas);
    mode = "none";
  }, data["duration"]);
});

socket.on('streamListFromServer', function (data) {
  streamList = data;
  console.log(streamList);
});

socket.on('streamReqFromServer', function (data) {
  switch (data) {
    case "CHAT":
    case "droneChat":
      //if(chatBuffer!= {}){
      socket.emit('chunkFromClient', chatBuffer);
      /*} else {
        socket.emit('chunkFromClient', {
          "audio" : "",
          "video" : "",
          "target": "CHAT"
        });
      }*/
      break;
  }
});

socket.on('oscFromServer', function (data) {
  var uint8arr = osc.toBuffer(data);
});
/*
const playGlitchedURL = (url) => {
  if(~url.indexOf("data:image/jpeg;base64,")){
    let audioURL = "data:audio/wav;base64," + url.split("data:image/jpeg;base64,")[1].slice(0,-2) + "gAA==";
    console.log(audioURL);
    let buff = Base64Binary.decodeArrayBuffer(audioURL);
    audioContext.decodeAudioData(buff, (audioData)=>{
      let audioSrc = audioContext.createBufferSource()
      audioSrc.buffer = audioData
      audioSrc.connect(masterGain);
      audioSrc.start(0);
    });
  // 再生 たぶんdecodeaudiodataして再生
  }
}
*/
socket.on('chunkFromServer', function (data) {
  //if(videoMode.mode === "chat"){
  if (videoMode.mode != "record") {
    if (videoMode.mode != "chat" && data.target === "CHAT") videoMode.mode = "chat";
    //if(data.target === "DRONECHAT" && videoMode.mode === "droneChat"){
    if (videoMode.option === "drone") {
      //droneBuff.push(data)
      droneBuff = data;
      //socket.emit('wavReqFromClient', data["target"]);
      //console.log("wavReq");
      //socket.emit('chunkFromClient', chatBuffer);
      //  socket.emit('AckFromClient', "CHAT");
    } else {
      if (data["audio"] != undefined && data["audio"] != "") {

        var chunkGain = 0.7;
        if (data["target"] in gainVal) {
          chunkGain = gainVal[data["target"]];
        }
        //let playsampleRate = 44100
        //if(data.sampleRate != undefined) {
        var playsampleRate = Number(data.sampleRate);
        //}
        //console.log(playsampleRate);
        //playAudioStream(data["audio"],Number(data["sampleRate"]),chunkGain,data["glitch"]);
        playAudioStream(data["audio"], playsampleRate, chunkGain, data["glitch"]);
        //if(data.glitch) playGlitchedURL(data.video);
      }
      if (data["video"] != undefined && data["video"] != "") {
        playVideo(data["video"]);
      } else if (data.target != "CHAT") {
        modules.whitePrint(ctx, canvas);
        modules.textPrint(ctx, canvas, data["target"]);
      } else {
        modules.whitePrint(ctx, canvas);
      }
    }
    if (data["target"] === "CHAT") {
      socket.emit('AckFromClient', "CHAT");
    } else {
      socket.emit('wavReqFromClient', data["target"]);
    }
  }
});
var speakVoice = function speakVoice(data) {
  if (voice && data != "VOICE") {
    ssu.text = data;
    speechSynthesis.speak(ssu);
  }
};

var doCmd = function doCmd(cmd) {
  // console.log("do cmd" + cmd["cmd"]);
  var t0 = audioContext.currentTime;
  switch (cmd["cmd"]) {
    case "WHITENOISE":
    case "NOISE":
      //      stop();
      if (noiseGain.gain.value > 0) {
        mode = "none";
        //noiseGain.gain.value = 0;
        noiseGain.gain.setTargetAtTime(0, 0, 0.01);
        modules.textPrint(ctx, canvas, "");
      } else {
        mode = "whitenoise";
        //noiseGain.gain.value = gainVal["NOISE"];
        noiseGain.gain.setTargetAtTime(gainVal.NOISE, 0, 0.01);
        modules.whitePrint(ctx, canvas);
        modules.textPrint(ctx, canvas, "WHITENOISE");
      }
      speakVoice("NOISE");
      break;
    case "CLICK":
      click();
      speakVoice(cmd.cmd);
      break;
    case "BASS":
      bass();
      //speakVoice(cmd.cmd)
      break;
    case "SINEWAVE":
      modules.whitePrint(ctx, canvas);
      if (oscGain.gain.value > 0 && freqVal === cmd["property"]) {
        mode = "none";
        //oscGain.gain.value = 0;
        oscGain.gain.setTargetAtTime(0, 0, 0.01);
        //        modules.textPrint(ctx, canvas, "");
      } else {
        mode = "sinewave";
        chordChange = 0;
        modules.textPrint(ctx, canvas, String(cmd["property"]) + "Hz");
        // console.log(t0);
        freqVal = cmd["property"];
        if (oscPortament === 0) {
          osc.frequency.setTargetAtTime(freqVal, 0, 0);
        } else {
          osc.frequency.setTargetAtTime(freqVal, t0, oscPortament);
        }
        //osecGain.gain.value = gainVal["OSC"];
        oscGain.gain.setTargetAtTime(gainVal.OSC, 0, 0.01);
      }
      speakVoice(String(cmd["property"]) + " Hz");
      break;
    case "SINEWAVE_UP":
      //      osc.frequency.value = osc.frequency.value + cmd["property"];
      freqVal = osc.frequency.value + cmd["property"];
      if (oscPortament === 0) {
        osc.frequency.setTargetAtTime(freqVal, 0, 0);
      } else {
        osc.frequency.setTargetAtTime(freqVal, t0, oscPortament);
      }
      modules.whitePrint(ctx, canvas);
      mode = "sinewave";
      chordChange = 0;
      modules.textPrint(ctx, canvas, String(freqVal) + "Hz");
      // oscGain.gain.value = gainVal["OSC"];
      oscGain.gain.setTargetAtTime(gainVal.OSC, 0, 0.01);
      speakVoice(String(cmd.property) + "Hz UP");
      break;
    case "SINEWAVE_DOWN":
      modules.whitePrint(ctx, canvas);
      freqVal = osc.frequency.value - cmd["property"];
      if (freqVal >= 0) {
        if (oscPortament === 0) {
          osc.frequency.setTargetAtTime(freqVal, 0, 0);
        } else {
          osc.frequency.setTargetAtTime(freqVal, t0, oscPortament);
        }
        mode = "sinewave";
        chordChange = 0;
        modules.textPrint(ctx, canvas, String(freqVal) + "Hz");
        //oscGain.gain.value = gainVal["OSC"];
        oscGain.gain.setTargetAtTime(gainVal.OSC, 0, 0.01);
      }
      speakVoice(String(cmd.property) + "Hz DOWN");
      break;
    case "PORTAMENT":
      modules.whitePrint(ctx, canvas);
      modules.textPrint(ctx, canvas, "PORTAMENT: " + String(cmd["property"]) + "SEC");
      oscPortament = cmd["property"];
      break;
    case "FEEDBACK":
    case "FEED":
      if (feedbackGain.gain.value > 0) {
        mode = "none";
        //feedbackGain.gain.value = 0;
        feedbackGain.gain.setTargetAtTime(0, 0, 0.01);
        modules.whitePrint(ctx, canvas);
      } else {
        mode = "feedback";
        // console.log("feedback")
        //feedbackGain.gain.value = gainVal["FEEDBACK"];
        feedbackGain.gain.setTargetAtTime(gainVal.FEEDBACK, 0, 0.01);
        modules.whitePrint(ctx, canvas);
        modules.textPrint(ctx, canvas, "FEEDBACK");
      }
      speakVoice(cmd.cmd);
      break;
    case "FILTER":
      var printText = filterChange();
      modules.whitePrint(ctx, canvas);
      modules.textPrint(ctx, canvas, "FILTER: " + String(printText) + "Hz");
      setTimeout(function () {
        modules.whitePrint(ctx, canvas);
        //        modules.textPrint(ctx, canvas, "");
      }, 800);
      break;
    case "GAIN":
      //console.log("TEST");
      modules.textPrint(ctx, canvas, cmd["property"]["target"] + ": " + String(cmd["property"]["val"]));
      gainVal[cmd["property"]["target"].substr(0, cmd["property"]["target"].length - 4).toUpperCase()] = Number(cmd["property"]["val"]);
      if (eval(cmd["property"]["target"]) != undefined) {
        if (cmd["property"]["target"] != "clickGain" && (cmd["property"]["target"] === "masterGain" || eval(cmd["property"]["target"]).gain.value > 0)) {
          //eval(cmd["property"]["target"]).gain.value = Number(cmd["property"]["val"]);
          eval(cmd["property"]["target"].gain.setTargetAtTime(Number(cmd["property"]["val"], 0, 0.01)));
        }

        console.log(eval(cmd["property"]["target"]).gain);
        // } else {
        // streamGain[cmd["property"]["target"].substr(0,cmd["property"]["target"].length - 4).toUpperCase] = Number(cmd["property"]["val"]);
      }
      // console.log(gainVal);
      if (cmd["property"]["target"] === masterGain) {
        masterGain.gain.setTargetAtTime(Number(cmd["property"]["val"]), 0, 0.01);
      }
      setTimeout(function () {
        modules.whitePrint(ctx, canvas);
      }, 500);
      break;
    case "VOLUME":
      if (cmd["property"] === "UP") {
        modules.whitePrint(ctx, canvas);
        if (masterGain.gain.value === 1) {
          modules.textPrint(ctx, canvas, "VOLUME IS FULL");
          setTimeout(function () {
            modules.whitePrint(ctx, canvas);
          }, 500);
        } else {
          masterGain.gain.setTargetAtTime(masterGain.gain.value + 0.1, 0, 0.01);
          modules.textPrint(ctx, canvas, "VOLUME " + cmd["property"]);
          setTimeout(function () {
            modules.whitePrint(ctx, canvas);
          }, 500);
        }
      } else if (cmd["property"] === "DOWN") {
        modules.whitePrint(ctx, canvas);
        if (masterGain.gain.value === 0) {
          modules.textPrint(ctx, canvas, "MUTED");
          setTimeout(function () {
            modules.whitePrint(ctx, canvas);
          }, 500);
        } else {
          //masterGain.gain.value = masterGain.gain.value - 0.1;
          masterGain.gain.setTargetAtTime(masterGain.gain.value - 0.1, 0, 0.01);
          modules.textPrint(ctx, canvas, "VOLUME " + cmd["property"]);
          setTimeout(function () {
            modules.whitePrint(ctx, canvas);
          }, 500);
        }
      } else {
        if (isNaN(Number(cmd["property"])) === false && cmd["property"] != "") {
          masterGain.gain.setTargetAtTime(Number(cmd["property"]), 0, 0.01);
        }
        modules.textPrint(ctx, canvas, "VOLUME " + cmd["property"]);
        setTimeout(function () {
          modules.whitePrint(ctx, canvas);
        }, 500);
      }
      prevGain = masterGain.gain.value;
      speakVoice(cmd.cmd + " " + String(cmd.property));
      break;
    case "MUTE":
      //if(cmd["property"]){
      if (masterGain.gain.value > 0) {
        prevGain = masterGain.gain.value;
        masterGain.gain.value.setTargetAtTime(0, 0, 0.01);
        modules.whitePrint(ctx, canvas);
        modules.textPrint(ctx, canvas, "MUTE");
        setTimeout(function () {
          modules.whitePrint(ctx, canvas);
        }, 500);
      } else {
        masterGain.gain.setTargetAtTime(prevGain, 0, 0.01);
        modules.whitePrint(ctx, canvas);
        modules.textPrint(ctx, canvas, "UNMUTE");
        setTimeout(function () {
          modules.whitePrint(ctx, canvas);
        }, 500);
      }
      speakVoice(cmd.cmd);
      break;
    case "SWITCH ON":
    case "SWITCH OFF":
      modules.whitePrint(ctx, canvas);
      modules.textPrint(ctx, canvas, cmd["cmd"]);
      setTimeout(function () {
        modules.whitePrint(ctx, canvas);
      }, 1500);
      speakVoice(cmd.cmd);
      break;
    case "RECORD":
    case "REC":
      videoStop();
      videoMode.mode = "record";
      modules.whitePrint(ctx, canvas);
      modules.textPrint(ctx, canvas, "RECORD");
      setTimeout(function () {
        if (videoMode.mode === "record") {
          videoMode.mode = "none";
          modules.whitePrint(ctx, canvas);
        }
      }, 5000); //時間は考え中
      speakVoice(cmd.cmd);
      break;
    case "SHUTTER":
      if (cmd["property"] === "oneshot") {
        timelapseFlag = true;
      } else if (cmd["property"] === "timelapse") {
        timeLapse();
      } else if (cmd["property"] === "stoplapse") {
        stopLapse();
      }
      //speakVoice(cmd.cmd)
      break;
    case "SECBEFORE":
      streamBuffer = [];
      modules.whitePrint(ctx, canvas);
      modules.textPrint(ctx, canvas, String(cmd["property"]) + "SEC BEFORE");
      videoMode.mode = "pastBuff";
      if (cmd["rate"] != undefined) {
        bufferRate = cmd["rate"];
      } else {
        bufferRate = 44100;
      }
      setTimeout(function () {
        modules.whitePrint(ctx, canvas);
        videoMode.mode = "pastPlay";
      }, cmd["property"] * 1000);
      speakVoice(String(cmd.property) + "SECOND BEFORE");
      break;
    case "DRONE":
      if (cmd.property) {
        //if(videoMode.option != "drone"){
        videoMode.option = "drone";
        modules.whitePrint(ctx, canvas);
        modules.textPrint(ctx, canvas, cmd["cmd"]);
        setTimeout(function () {
          modules.whitePrint(ctx, canvas);
        }, 500);
        speakVoice(String(cmd.cmd));
      } else {
        videoMode.option = "none";
        modules.whitePrint(ctx, canvas);
        modules.textPrint(ctx, canvas, "NOT DRONE");
        setTimeout(function () {
          modules.whitePrint(ctx, canvas);
        }, 500);
        speakVoice("NOT " + String(cmd.cmd));
      }
      break;
    case "METRONOME":
      //console.log(cmd.property);
      //if(cmd.type === "param") {
      if (cmd.property === "STOP") {
        stopRhythm();
        speakVoice(cmd.cmd + " STOP");
      } else {
        modules.whitePrint(ctx, canvas);
        modules.textPrint(ctx, canvas, "BPM:" + String(Math.floor(cmd.property.bpm * 10) / 10));
        rhythmProperty = cmd.property;
        console.log(rhythmProperty);
        if (cmd.trig) {
          stopRhythm();
          setTimeout(function () {
            modules.whitePrint(ctx, canvas);
            startRhythm(rhythmProperty.interval);
          }, rhythmProperty.interval);
        }
        //}
        //if(cmd.trig) startRhythm();
        speakVoice(cmd.cmd);
      }
      break;
    case "GLITCH":
      modules.whitePrint(ctx, canvas);
      modules.textPrint(ctx, canvas, cmd.property);
      setTimeout(function () {
        modules.whitePrint(ctx, canvas);
      }, 500);
      speakVoice(cmd.cmd);
      break;
    case "BROWSER":
      window.open('https://instagram.com', '_blank', 'width=800,height=600');
      speakVoice(cmd.cmd);
    case "PREV":
      pastPresent(cmd["property"]);
      break;
    case "STOP":
      stop();
      videoStop();
      setTimeout(function () {
        modules.whitePrint(ctx, canvas);
      }, 500);
      //speakVoice(cmd.cmd)
      break;
    case "NUMBER":
      modules.whitePrint(ctx, canvas);
      modules.textPrint(ctx, canvas, String(cmd.property));
      setTimeout(function () {
        modules.whitePrint(ctx, canvas);
      }, 1000);
      break;
    case "CTRL":
      console.log(cmd["property"]);
      if ($('#ctrl').size()) {
        $('#ctrl').remove();
      } else {
        var addHTML = modules.ctrlView(cmd["property"]);
        $('#wrapper').before('<div id="ctrl">' + addHTML + '</div>');
      }
      speakVoice("CONTROL");
      break;
    case "INSTRUCTION":
      videoStop();
      modules.whitePrint(ctx, canvas);
      modules.textPrint(ctx, canvas, cmd["property"]["text"]);
      if (client != "inside") alertPlay();
      mode = "instruction";
      setTimeout(function () {
        modules.whitePrint(ctx, canvas);
        mode = "none";
      }, cmd["property"]["duration"]);
      speakVoice(cmd.property.text);
      break;
    default:
      console.log(cmd["cmd"]);
      for (var key in streamList) {
        if (key === cmd["cmd"]) {
          // console.log(cmd["cmd"]);
          videoMode.mode = "chat";
          modules.whitePrint(ctx, canvas);
          modules.textPrint(ctx, canvas, cmd["cmd"]);
          setTimeout(function () {
            modules.whitePrint(ctx, canvas);
          }, 800);
        }
      }
      speakVoice(cmd.cmd);
      break;

  }
  strings = "";
  stringsClient = "";
};
/*
const munouNoUnmei = (data) =>{
  modules.whitePrint(ctx, canvas);
  console.log(data);
  let speed = 0;
  if(room = "surface"){
    speed = (Math.round((data["speed"] - 0.88) * 1000) / 1000);
  } else {
    speed = (Math.round((data["speed"] - 0.75) * 1000) / 1000);
  }
  //data = Math.round(data * 1000) / 1000;
  modules.textPrint(ctx, canvas, data["room"] + ": " + String(speed) + "m/s");
  let freqVal = 110;
  let cT = audioContext.currentTime;
  if(data["speed"] < 4) {
    freqVal = 110 * Math.pow(2,data["speed"] * 2 / 12);  //1m/s^2を1度としている
  } else if(data < 8) {
    freqVal = 110 * Math.pow(2,(data["speed"]-1) * 2 /12 + 1 / 12);  //1m/s^2を1度としている
  } else {
    freqVal = 110 * Math.pow(2,(data["speed"] - 2) * 2 /12 + 2 / 12);  //1m/s^2を1度としている
  }
  if(munouGain.gain.value === 0) munouGain.gain.value = 0.7;
  munouOsc.frequency.setTargetAtTime(freqVal,cT,0.3);
}
*/

var stop = function stop() {
  oscGain.gain.setTargetAtTime(0, 0, 0.01);
  feedbackGain.gain.setTargetAtTime(0, 0, 0.01);
  noiseGain.gain.setTargetAtTime(0, 0, 0.01);
  bassGain.gain.setTargetAtTime(0, 0, 0.01);
  //munouGain.gain.value = 0;
  bassFlag = false;
  modules.whitePrint(ctx, canvas);
  //  modules.textPrint(ctx, canvas, "");
  mode = "none";
  modules.textPrint(ctx, canvas, "STOP");
  stopRhythm();
};

var videoStop = function videoStop() {
  switch (videoMode.mode) {
    case "chunkEmit":
      break;
    case "beforePlay":
    case "beforeBuff":
      streamBuffer = [];
    default:
      videoMode.mode = "none";
      break;
  }
};

var pastPresent = function pastPresent(status) {
  // console.log(status);
  for (var key in status) {
    if (key === "SINEWAVE" && status[key]) {
      doCmd({ "cmd": key, "property": Number(status[key]) });
    } else if (key === "SECBEFORE" && status[key]) {
      videoMode.mode = "pastPlay";
    } else if (status[key]) {
      doCmd({ "cmd": key });
    }
  }
};

var playVideo = function playVideo(video) {
  //  whitePrint();
  image = new Image();
  image.src = video;
  var wdth;
  var hght;
  wdth = $(window).width();
  hght = wdth * 3 / 4;

  image.onload = function () {
    receive_ctx.drawImage(image, 0, 0, wdth, hght);
  };
};

var lapseInterval = 120000;
var setLapse = void 0;

var timeLapse = function timeLapse() {
  setLapse = setInterval(function () {
    timelapseFlag = true;
  }, lapseInterval);
};

var stopLapse = function stopLapse() {
  clearInterval(setLapse);
};

/*
const emitInterval = 120000;
setInterval(() => {
  // if(videoMode.mode === "none"){
    // console.log("送信");
    timelapseFlag = true;
  // }
}, emitInterval);
*/

//ctrlView ctrl

$(function () {
  $(document).on('change', '.range', function () {
    console.log("range change");
    var ctrlCmd = void 0;
    var ctrlProperty = void 0;
    if ($(this).attr('id') === "CHATRATE") {
      ctrlCmd = "CHATRATE";
      ctrlProperty = {
        "target": $(this).attr('name'),
        "val": $(this).val()
      };
      var test = 'label[name="' + ctrlProperty["target"] + '"]#CHATRATELabel';
      console.log(test);
      $('label[name="' + ctrlProperty["target"] + '"]#CHATRATELabel').text(String(ctrlProperty["val"]));
    } else if ($(this).attr('id').match(/^LATENCY/) || $(this).attr('id').match(/^RATE/)) {
      var val = $(this).val();
      var targetArr = $(this).attr('id').split("_");
      if (targetArr[0] === "LATENCY") val = val * 1000;
      ctrlCmd = targetArr[0];
      ctrlProperty = {
        "target": $(this).attr('name'),
        "streamType": targetArr[1],
        "val": val
      };
      $('#' + targetArr[0] + 'Label').text(val);
      setTimeout(function () {
        $('#' + targetArr[0] + 'Label').text(targetArr[0]);
      }, 2000);
    } else {
      ctrlCmd = $(this).attr('name');
      ctrlProperty = {
        "target": $(this).attr('id'),
        "val": $(this).val()
      };
      $('#' + ctrlCmd + ctrlProperty["target"] + 'Label').text(String(ctrlProperty["val"]));
    }
    console.log(ctrlCmd);
    console.log(ctrlProperty);
    socket.emit('cmdFromCtrl', {
      "cmd": ctrlCmd,
      "property": ctrlProperty
    });
  });
});

$(function () {
  $(document).on('change', '.route', function () {
    var property = {
      "target": $(this).attr('name'),
      "stream": $(this).attr('id').split("_")[0],
      "val": $(this).prop('checked')
    };
    console.log(property);
    socket.emit('cmdFromCtrl', {
      "cmd": $(this).attr('id').split("_")[1],
      "property": property
    });
  });
});

var funcToBase64 = function funcToBase64() {
  //console.log(buffer);
  var bufferContext = buffer.getContext('2d');
  buffer.width = video.videoWidth;
  buffer.height = video.videoHeight;
  bufferContext.drawImage(video, 0, 0);
  //return buffer.toDataURL("image/webp");
  return buffer.toDataURL("image/jpeg");
};

/***/ })
/******/ ]);
//# sourceMappingURL=client.js.map