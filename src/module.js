
exports.keyDownFunc = function keyDownFunc(keyCode, stringsClient, socket){
  const keyMap = {
// const keycodeMap = {
  '48' : '0',
  '49' : '1',
  '50' : '2',
  '51' : '3',
  '52' : '4',
  '53' : '5',
  '54' : '6',
  '55' : '7',
  '56' : '8',
  '57' : '9',
  '65' : 'A',
  '66' : 'B',
  '67' : 'C',
  '68' : 'D',
  '69' : 'E',
  '70' : 'F',
  '71' : 'G',
  '72' : 'H',
  '73' : 'I',
  '74' : 'J',
  '75' : 'K',
  '76' : 'L',
  '77' : 'M',
  '78' : 'N',
  '79' : 'O',
  '80' : 'P',
  '81' : 'Q',
  '82' : 'R',
  '83' : 'S',
  '84' : 'T',
  '85' : 'U',
  '86' : 'V',
  '87' : 'W',
  '88' : 'X',
  '89' : 'Y',
  '90' : 'Z',
  '8'  : 'backspace',
  '13' : 'enter',
  '16' : 'shift',
  '17' : 'ctrl',
  '36' : 'home',
  '18' : 'alt',
  '9' : 'tab',
  '32' : ' ',
  '107' : 'add',
  '20' : 'caps_lock',
  '27' : 'escape',
  '37' : 'left_arrow',
  '38' : 'up_arrow',
  '39' : 'right_arrow',
  '40' : 'down_arrow',
  '112' : 'f1' ,
  '113' : 'f2' ,
  '114' : 'f3' ,
  '115' : 'f4' ,
  '116' : 'f5' ,
  '117' : 'f6' ,
  '118' : 'f7' ,
  '119' : 'f8' ,
  '120' : 'f9' ,
  '121' : 'f10',
  '122' : 'f11',
  '123' : 'f12',
  '188' : 'comma',
  "190" : ".",
  "189" : "_",
  "226" : "_",
  "220" : "_"
  };
  let charCode = keyMap[keyCode];
  if(charCode === "left_arrow" || charCode === "backspace" || charCode === "escape"){
    stringsClient = "";
  } else if(keyCode >= 48 && keyCode <= 90 || keyCode === 190 || keyCode === 189 || keyCode === 226 || keyCode === 32){
    stringsClient = stringsClient + charCode;
  }
  socket.emit('charFromClient', keyCode);
  return stringsClient;
}


exports.charEmit = function charEmit(char, socket){
  socket.emit('charFromClient', char);
}

exports.chunkEmit = function chunkEmit(data, socket){
  socket.emit('chunkFromClient', data);
}

exports.toBase64 = function toBase64(buffer, video){
  let bufferContext = buffer.getContext('2d');
  buffer.width = video.videoWidth;
  buffer.height = video.videoHeight;
  bufferContext.drawImage(video, 0, 0);
  return buffer.toDataURL("image/webp");
}

exports.textPrint = function textPrint(ctx, canvas, text){
  // console.log("text print");
  ctx.fillStyle = "black";
  if(text.length > 2) {
    ctx.font = "bold " + String(Math.floor((canvas.width * 4 / 3) / text.length)) + "px 'Arial'";
  } else {
    ctx.font = "bold " + String(Math.floor((canvas.height * 5 / 4) / text.length)) + "px 'Arial'";
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  ctx.restore();
}

exports.whitePrint = function whitePrint(ctx, canvas) {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

exports.statusPrint = function statusPrint(oscGainValue, freqVal, feedbackGainValue, noiseGainValue, bassFlag){
  let statusText = "";
  if(oscGainValue > 0){
    statusText = String(freqVal) + "Hz";
  }
  if(feedbackGainValue > 0){
    if(statusText === ""){
      statusText = "FEEDBACK";
    } else {
      statusText = statusText + ", FEEDBACK"
    }
  }
  if(noiseGainValue > 0){
    if(statusText === ""){
      statusText = "WHITENOISE";
    } else {
      statusText = statusText + ", WHITENOISE"
    }
  }
  if(bassFlag){
    if(statusText === ""){
      statusText = "BASS";
    } else {
      statusText = statusText + ", BASS"
    }
  }
  return statusText;
}

exports.keycodeMap = function keycodeMap(keycode){
  const keyMap = {
// const keycodeMap = {
  '48' : '0',
  '49' : '1',
  '50' : '2',
  '51' : '3',
  '52' : '4',
  '53' : '5',
  '54' : '6',
  '55' : '7',
  '56' : '8',
  '57' : '9',
  '65' : 'A',
  '66' : 'B',
  '67' : 'C',
  '68' : 'D',
  '69' : 'E',
  '70' : 'F',
  '71' : 'G',
  '72' : 'H',
  '73' : 'I',
  '74' : 'J',
  '75' : 'K',
  '76' : 'L',
  '77' : 'M',
  '78' : 'N',
  '79' : 'O',
  '80' : 'P',
  '81' : 'Q',
  '82' : 'R',
  '83' : 'S',
  '84' : 'T',
  '85' : 'U',
  '86' : 'V',
  '87' : 'W',
  '88' : 'X',
  '89' : 'Y',
  '90' : 'Z',
  '8'  : 'backspace',
  '13' : 'enter',
  '16' : 'shift',
  '17' : 'ctrl',
  '36' : 'home',
  '18' : 'alt',
  '9' : 'tab',
  '32' : ' ',
  '107' : 'add',
  '20' : 'caps_lock',
  '27' : 'escape',
  '37' : 'left_arrow',
  '38' : 'up_arrow',
  '39' : 'right_arrow',
  '40' : 'down_arrow',
  '112' : 'f1' ,
  '113' : 'f2' ,
  '114' : 'f3' ,
  '115' : 'f4' ,
  '116' : 'f5' ,
  '117' : 'f6' ,
  '118' : 'f7' ,
  '119' : 'f8' ,
  '120' : 'f9' ,
  '121' : 'f10',
  '122' : 'f11',
  '123' : 'f12',
  '188' : 'comma',
  "190" : ".",
  "189" : "_",
  "226" : "_",
  "220" : "_"
  };
  return keyMap[keycode];
}
