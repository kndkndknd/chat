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
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
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
    sampleRateHTML = sampleRateHTML + '<li>' + _key + ': <label class="sampleRate" id="sampleRate' + _key + 'Label">' + String(statusList["sampleRate"][_key]) + '</label><input type="range" class="range" name="sampleRate" id="' + _key + '" min="11025" max="88200" step="11025" value="' + statusList["sampleRate"][_key] + '" />';
    if (_key in statusList.streamStatus.glitch) {
      sampleRateHTML = sampleRateHTML + ' glitch<input type="checkbox" id="' + _key + '" class="glitch" name="' + '_glitch"';
      if (statusList.streamStatus.glitch[_key]) sampleRateHTML = sampleRateHTML + ' checked="checked"';
      sampleRateHTML = sampleRateHTML + '>';
    }
    sampleRateHTML = sampleRateHTML + '</li>';
  }
  sampleRateHTML = sampleRateHTML + '</ul></div>';

  // gain list
  var gainHTML = '<div id="gainCtrl"> gain; <ul id="gainList">';
  for (var _key2 in statusList["gain"]) {
    gainHTML = gainHTML + '<li>' + _key2.substr(0, _key2.length - 4).toUpperCase() + ': <input type="range" name="gain" class="range" id="' + _key2 + '" min="0" max="1" value="' + String(statusList["gain"][_key2]) + '" step="0.05" /> <label id="gain' + _key2 + 'Label" class="gainLabel">' + String(statusList["gain"][_key2]) + '</label></li>';
  }
  gainHTML = gainHTML + '</ul> </div>';
  //fade portament list
  var fadeHTML = '<div id="fadeCtrl"><ul id="fadeList">';
  fadeHTML = fadeHTML + '<li>FADE IN: <input type="range" name="FADE" class="range" id="IN" min="0" max="5" value="' + String(statusList.cmd.FADE.IN) + '" step="0.05" /> <label id="FADEINLabel" class="FADELabel">' + String(statusList.cmd.FADE.IN) + '</label></li>';
  fadeHTML = fadeHTML + '<li>FADE OUT: <input type="range" name="FADE" class="range" id="OUT" min="0" max="5" value="' + String(statusList.cmd.FADE.OUT) + '" step="0.05" /> <label id="FADEOUTLabel" class="FADELabel">' + String(statusList.cmd.FADE.OUT) + '</label></li>';
  fadeHTML = fadeHTML + '<li>PORTAMENT: <input type="range" name="PORTAMENT" class="range" id="PORTAMENT" min="0" max="30" value="' + String(statusList.cmd.PORTAMENT) + '" step="0.05" /> <label id="PORTAMENTPORTAMENTLabel" class="PORTAMENTLabel">' + String(statusList.cmd.PORTAMENT) + '</label></li>';

  HTML = tableHTML + rangeHTML + sampleRateHTML + gainHTML + fadeHTML;
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
/* 1 */,
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

// canvas関連
var canvas = document.getElementById('cnvs');
var ctx = canvas.getContext('2d');
var buffer = void 0;
var bufferContext = void 0;
var stringsClient = "";
var modules = __webpack_require__(0);

var sizeCtrl = function sizeCtrl() {
  $("#cnvs").attr({ height: $(window).height() / 4 });
  $("#cnvs").attr({ width: $(window).width() / 4 });
};

$(function () {
  sizeCtrl();
  //  draw();
  $(window).resize(function () {
    sizeCtrl();
    //    draw();
  });
});

$(function () {
  $(document).on("keydown", function (e) {
    // let charCode = keycodeMap[String(e.keyCode)];
    // let charCode = modules.keycodeMap(String(e.keyCode));
    stringsClient = modules.keyDownFunc(e.keyCode, stringsClient, socket);
    modules.whitePrint(ctx, canvas);
    modules.textPrint(ctx, canvas, stringsClient);
    if (e.keyCode === 13) {
      modules.whitePrint(ctx, canvas);
      stringsClient = "";
    }
  });
});

socket.emit('connectFromClient', title);

socket.on("statusFromServer", function (data) {
  console.log("statusFromServer");
  connectedClientView(data["clients"]);
  connectedCtrlView(data["connected"]);
  sampleRateView(data["sampleRate"]);
  gainView(data["gain"]);
  cmdView(data["cmd"]);
});

// アロー関数にしない
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

// ゲイン操作
$(function () {
  $(document).on('change', '.range', function () {
    // console.log("range change");
    var cmd = void 0;
    var property = void 0;
    if ($(this).attr('id') != "CHATRATE") {
      cmd = $(this).attr('name');
      property = {
        "target": $(this).attr('id'),
        "val": $(this).val()
      };
      $('#' + cmd + property["target"] + 'Label').text(String(property["val"]));
    } else {
      cmd = "CHATRATE";
      property = {
        "target": $(this).attr('name'),
        "val": $(this).val()
      };
    }
    // console.log(property);
    socket.emit('cmdFromCtrl', {
      "cmd": cmd,
      "property": property
    });
  });
});

$(function () {
  $(document).on("click", "#shutter", function () {
    socket.emit('cmdFromCtrl', {
      "cmd": $(this).attr('id'),
      "property": "oneshot"
    });
  });
});

$(function () {
  $(document).on('change', '#uploadSubmit', function () {
    var file = $("#uploadFile").val();
    console.log(file);
    socket.emit('uploadReqFromClient', file);
    $('#uploadSubmit').prop("checked", false);
    modules.textPrint(ctx, canvas, "upload");
  });
});

var sampleRateView = function sampleRateView(sampleRate) {
  $('#sampleRateList li').remove();
  for (var key in sampleRate) {
    var sampleRateDetail = '<li>' + key + ': <label class="sampleRateLabel" id="sampleRate' + key + 'Label">' + String(sampleRate[key]) + '</label><input type="range" class="range" name="sampleRate" id="' + key + '" min="11025" max="88200" step="11025" value="' + sampleRate[key] + '" /></li>';
    $('#sampleRateList').append(sampleRateDetail);
  }
};

var cmdView = function cmdView(cmdStatus) {
  //現状の実施コマンド記載
  $('#cmd li').remove();
  for (var key in cmdStatus["now"]) {
    //liをappendしていく。key: valueの形で
    if (key === "unmute") {} else {
      if (cmdStatus["now"][key]) {
        $('#cmd').append('<li>' + key + ': <b>' + cmdStatus["now"][key] + '</b></li>');
      } else {
        $('#cmd').append('<li>' + key + ': ' + cmdStatus["now"][key] + '</li>');
      }
    }
  }
  //前回コマンド記載
  $('#prevCmd').text(cmdStatus["prevCmd"]);
  $('#cmdTimeLine').text(cmdStatus["prevTime"]);
};

var connectedClientView = function connectedClientView(clients) {
  $('#clientList').find("tr:gt(0)").remove();
  for (var key in clients) {
    console.log(clients[key]);
    var lastRow = $('#clientList tbody > tr:last').after('<tr id="clientTd"><td>' + clients[key]["type"] + '</td><td id="IdTd">' + clients[key]["No"] + '</td><td><input type="checkbox" id="CHAT_FROM" class="route" name="' + key + '"></td><td><input type="checkbox" id="CHAT_TO" class="route" name="' + key + '"></td><td><input type="checkbox" id="RECORD_FROM" class="route" name="' + key + '"></td><td><input type="checkbox" id="PLAYBACK_TO" class="route" name="' + key + '"></td><td><input type="checkbox" id="TIMELAPSE_TO" class="route" name="' + key + '"></td><td><input type="checkbox" id="DRUM_TO" class="route" name="' + key + '"></td><td><input type="checkbox" id="SILENCE_TO" class="route" name="' + key + '"></td><td><input type="checkbox" id="SECBEFORE_TO" class="route" name="' + key + '"></td><td><label class="sampleRateLabel" id="CHATRATELabel" name="' + key + '">' + String(clients[key]["CHATRATE"]) + '</label><input type="range" class="range" id="CHATRATE" name="' + key + '" min="11025" max="88200" step="11025" value="' + clients[key]["CHATRATE"] + '" /></td></tr>');
    for (var status in clients[key]) {
      var _toString = Object.prototype.toString;
      if (_toString.call(clients[key][status]) === "[object Object]") {
        if ("FROM" in clients[key][status] && clients[key][status]["FROM"]) {
          $('input[name="' + key + '"]#' + status + '_FROM').prop("checked", true);
        }
        if ("TO" in clients[key][status] && clients[key][status]["TO"]) {
          $('input[name="' + key + '"]#' + status + '_TO').prop("checked", true);
        }
      }
    }
    /*
    if(clients[key]["CHAT"]["FROM"]){
      $('input[name="' + key + '"]#CHAT_FROM').prop("checked",true);
    }
    if(clients[key]["CHAT"]["TO"]){
      $('input[name="' + key + '"]#CHAT_TO').prop("checked",true);
    }
    */
  }
};

var connectedCtrlView = function connectedCtrlView(connected) {
  $("#status li").remove();
  if ("ctrl" in connected) {
    var connectedCtrl = "ctrl:";
    for (var key in connected["ctrl"]) {
      connectedCtrl = connectedCtrl + " " + key;
    }
    $("#status").append("<li>" + connectedCtrl + "</li>");
  }
};

var gainView = function gainView(gain) {
  $("#gainList li").remove();
  for (var key in gain) {
    var gainInfo = '<li>' + key.substr(0, key.length - 4).toUpperCase() + ': <input type="range" name="gain" class="range" id="' + key + '" min="0" max="1" value="' + String(gain[key]) + '" step="0.05" /> <label id="gain' + key + 'Label" class="gainLabel">' + String(gain[key]) + '</label></li>';
    console.log(gainInfo);
    $("#gainList").append(gainInfo);
  }
};

var joinDetail = function joinDetail(hsh, detail) {
  var connectedString = "";
  for (var key in hsh) {
    connectedString = connectedString + " " + key;
    for (var item in detail) {
      if (key === item) {
        connectedString = connectedString + "(" + detail[item]["type"] + ")";
      }
    }
  }
  return connectedString;
};

var joinIds = function joinIds(hsh, detail) {
  var connectedString = "";
  for (var key in hsh) {
    if (hsh[key]) {
      connectedString = connectedString + key + " ";
    }
  }
  return connectedString;
};
/*
const textPrint = (str) => {
  console.log("text print");
  ctx.fillStyle = "black";
    if(str.length > 2) {
      ctx.font = "bold " + String(Math.floor((canvas.width * 4 / 3) / str.length)) + "px 'Arial'";
    } else {
      ctx.font = "bold " + String(Math.floor((canvas.height * 5 / 4) / str.length)) + "px 'Arial'";
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, canvas.width / 2, canvas.height / 2);
    ctx.restore();
}

const whitePrint = () => {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

*/

/***/ })
/******/ ]);
//# sourceMappingURL=ctrl.js.map