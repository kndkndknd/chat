exports.instructionInterval = function instructionInterval(io, instructionArr, instructionDuration){
  io.emit("instructionFromServer", {
    "text": instructionArr[Math.floor(Math.random() * instructionArr.length)],
    "duration": instructionDuration[Math.floor(Math.random() * instructionDuration.length)]
  });
  /*
  console.log("instruction");
  //coding later
  io.emit('instructionFromServer', intervalValue);
  */
}
exports.chunkEmit = function chunkEmit(io, audiovisualChunk){
  console.log('chunkEmit')
  if(audiovisualChunk.length > 0) {
    io.emit('chunkFromServer', audiovisualChunk.shift());
  }
}

exports.roomEmit = function roomEmit(io, name, data, target){
  if(target["all"]){
    io.emit(name,data);
  } else {
    if(target["okappachan"]){
      io.to("okappachan").emit(name,data);
    }
    if(target["pocke"]){
      io.to("pocke").emit(name,data);
    }
    io.to("ctrl").emit(name,data);
  }
}

exports.randomIdEmit = function randomIdEmit(io,ids, target, name, data){
  let idList = [];
  if(target["okappachan"]){
    for(let key in ids["okappachan"]){
      //if(statusList["connected"]["okappachan"]=== "connected"){
        idList.push(key);
      //}
    }
  }
  if(target["pocke"]){
    for(let key in ids["pocke"]){
      idList.push(key);
    }
  }
  io.to(idList[Math.floor(Math.random() * idList.length)]).emit(name, data);
}

/*
exports.char2Cmd = function char2Strings(io, strings, character, cmdList, keyCode) {
  if(character === "enter" || character === "space" ) { console.log("do cmd " + strings);
    if(cmdList.indexOf(strings) > -1) {
      io.emit("cmdFromServer", {"cmd" : strings});
    } else if (isNaN(Number(strings)) === false && strings != "") {
      console.log("sinewave " + strings + "Hz");
      io.emit("cmdFromServer", {
        "cmd" : "SINEWAVE",
        "property" : Number(strings)
      });
    }
    if(strings === "LOOKBACK" || strings === "SWITCH"){
      return strings;
    } else {
      return "";
//      return "prev" + strings; // return for prevCmd
    }
  } else if(character === "backspace" || character === "left_arrow" || character === "shift" || character === "ctrl" || character === "tab") { //left OR shift OR ctrl OR tab OR esc
    io.emit("stringsFromServer", "")
    return "";
//  } else if(character ==="up_arrow"){
//    io.emit("stringsFromServer", prevCmd);
  } else if(character === "escape"){
    io.emit("cmdFromServer", {"cmd": "STOP"});
  } else if(keyCode >= 48 && keyCode <= 90 || keyCode === 190){ //alphabet or number
    //add strings;
    strings =  strings + character;
    io.emit("stringsFromServer", strings);
    return strings;
  }
}
*/
