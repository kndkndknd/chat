exports.emtCtrl = function emitCtrl(id, stream, emitMode, mobileMode, io, socket, video, selfMode, type, transroom){
  var transList = io.sockets.adapter.rooms.trans;
  if(emitMode == "all"){
//    socket.to('trans').emit('stream_from_server',{
    io.sockets.to('trans').emit('stream_from_server',{
    //io.sockets.emit('stream_from_server',{
      id: id,
      type: type,
      stream: stream,
      video: video
    });
    if(mobileMode){
      io.sockets.to('mobile').emit('stream_from_server',{
        id: id,
        type: type,
        stream: stream,
        video: video
      });
    }
//    console.log("emit all from " + id);
  } else if(emitMode == "broadcast"){
    socket.broadcast.to('trans').emit('stream_from_server', {
      id: id,
      type: type,
      stream: stream,
      video: video
    });
    if(selfMode) {
      socket.emit('stream_from_server', {
        id: id,
        type: type,
        stream: stream,
        video: video
      });
    }
    if(mobileMode){
     socket.broadcast.to('mobile').emit('stream_from_server',{
        id: id,
        type: type,
        stream: stream,
        video: video
      });
    }
    //socket.broadcast.emit('debug_from_server', id);
//    console.log("emit broadcast from " + id);
/*  } else if(emitMode == "self"){
    socket.emit('stream_from_server', {
    //socket.to(id).json.emit('stream_from_server', {
      id: id,
      type: type,
      stream: stream,
      video: video
    });*/
//    console.log("emit to self from " + id);
  } else if(emitMode == "nextdoor"){
    var arr = [];
    for (key in io.sockets.adapter.rooms.trans) {
      if(transroom[key]["receiveMode"])  //receiveMode有効の範囲で相手指定
        arr.push(key);
    }
    var target = arr[0];
    for (var i=0;i<arr.length;i++){
      if(arr[i]==id && i != (arr.length-1))
        target = arr[i+1];
    }
    
    socket.to(target).json.emit('stream_from_server', {
      id: id,
      type: type,
      stream: stream,
      video: video
    });
//    console.log("emit to next door from " + id);
  } else if(emitMode == "random"){
    var arr = [];
    for (key in io.sockets.adapter.rooms.trans) {
      if(key === id) {
        if(selfMode){
          arr.push(key);
        }
      } else {
        if(transroom[key]["receiveMode"])
          arr.push(key);
      }
    }
    if(mobileMode){
      for (key in io.sockets.adapter.rooms.mobile) {
        arr.push(key);
      }
    }
    //console.log(arr);
    var num = Math.floor(Math.random() * arr.length);
    var target = arr[num];
    //console.log(target);
    if(target != id) {
    socket.to(target).json.emit('stream_from_server', {
      id: id,
      type: type,
      stream: stream,
      video: video
    });
    } else {
      socket.emit('stream_from_server', {
        id: id,
        type: type,
        stream: stream,
        video: video
      });
    }

//    console.log("emit random from " + id);
  } else if(emitMode === "self") {
    socket.emit('stream_from_server', {
      id: id,
      type: type,
      stream: stream,
      video: video
    });
  }
}

exports.slctCtrl = function selectControl(fader, stream, streamBuff, recordedBuff, video, images) {
  var rtn = [new Float32Array(8192), "none", "empty"];
  var n = Math.floor(Math.random() * (fader["stream"] + fader["buff"] + fader["1"] + fader["2"] + fader["3"] + fader["4"] + fader["empty"]));
  if(n < fader["stream"]){
    rtn = [stream, video, "stream"];
  } else if(n < (fader["stream"] + fader["buff"])){
    //rtn = [streamBuff["stream"].shift(), streamBuff["video"].shift(), "buff"];
    //streamBuff["stream"].push(rtn[0]);
    //streamBuff["video"].push(rtn[1]);
    var num = Math.floor(Math.random() * streamBuff["stream"].length);
    rtn = [streamBuff["stream"][num], streamBuff["video"][num], "buff"];
  } else if(n < (fader["stream"] + fader["buff"] + fader["1"])){
    rtn = [recordedBuff[1]["arr"].shift(), "data:image/jpeg;base64," + images["1"][Math.floor(Math.random()* images["1"].length)], "1"];
    recordedBuff[1]["arr"].push(rtn[0]);
  } else if(n < (fader["stream"] + fader["buff"] + fader["1"] + fader["2"])){
    rtn = [recordedBuff[2]["arr"].shift(), "data:image/jpeg;base64," + images["2"][Math.floor(Math.random()* images["2"].length)], "2"];
    recordedBuff[2]["arr"].push(rtn[0]);
  } else if(n < (fader["stream"] + fader["buff"] + fader["1"] + fader["2"] + fader["3"])){
    rtn = [recordedBuff[3]["arr"].shift(), "data:image/jpeg;base64," + images["3"][Math.floor(Math.random()* images["3"].length)], "3"];
    recordedBuff[3]["arr"].push(rtn[0]);
  } else if(n < (fader["stream"] + fader["buff"] + fader["1"] + fader["2"] + fader["3"] + fader["4"])){
    rtn = [recordedBuff[4]["arr"].shift(), "data:image/jpeg;base64," + images["4"][Math.floor(Math.random()* images["4"].length)], "4"];
    recordedBuff[4]["arr"].push(rtn[0]);
  }
  //console.log(rtn[0][0]);
  return rtn;
}

exports.ctrlCtrl = function controlCtrl(socket, io, transroom, target, mode, type, fader, val){
  if(target === "all"){
    if(type != "pool"){
      io.sockets.emit(type + "Ctrl_from_server", mode);
      for (key in transroom) {
        transroom[key][type + "Mode"] = mode;
      }
    } else {
      console.log(val);
      io.sockets.emit(type + "Ctrl_from_server", {
        val: val
      });
      for (key in transroom) {
        transroom[key][type] = val;
      }
    }
  } else {
    console.log(type);
    if (type === "emit") {
      socket.to(target).json.emit('emitCtrl_from_server', mode);
    } else if (type === "receive") {
      socket.to(target).json.emit('receiveCtrl_from_server', mode);
    } else if (type === "play") {
      socket.to(target).json.emit('playCtrl_from_server', mode);
    } else if (type === "sped") {
      socket.to(target).json.emit('speedCtrl_from_server', mode);
    } else if (type === "scrn") {
      socket.to(target).json.emit('scrnCtrl_from_server', mode);
    } else if (type === "self") {
      transroom[target]["selfMode"] = val;
    } else if (type === "mute") {
      transroom[target]["selector"][val] = mode;
      socket.to(target).json.emit("muteCtrl_from_server", {
        mode: mode,
        val: val
      });
    } else if (type === "pool") {
      transroom[target]["pool"] = val;
      socket.to(target).json.emit("poolCtrl_from_server", {
        val: val
      });
    } else {
      console.log(type + "Ctrl_from_server");
      socket.to(target).json.emit(type + "Ctrl_from_server", mode);
    }

      
    if (target in transroom && (type != "mute" || type != "pool")) {
      transroom[target][type + "Mode"] = mode;
    }
  }
  console.log(transroom);
  io.sockets.to('ctrl').emit('status_from_server', {
    transroom: transroom,
    fader: fader
  });
}
exports.sttsCtrl = function statusCtrl(json, socket, io, transroom,ctrlroom, mobileroom, fader, streamBuff, recordedBuff, deletedRoom){
    //console.log(io.sockets.adapter.rooms);
    console.log("status");
    if(json.type == 'ctrl') {
      console.log("ctrl");
      socket.join('ctrl');
      console.log(io.sockets.adapter.rooms.ctrl);
    } else if(json.type == 'selfie') {
      socket.join('selfie');
      //console.log(io.sockets.manager.rooms['/feedback']);
    } else if(json.type == 'trans') {
      socket.join('trans');
      //console.log(io.sockets.adapter.rooms.trans);
      //console.log(io.sockets.manager.rooms['/trans']);
      //
      var model = "unknown";
      var ua = String(socket.handshake["headers"]["user-agent"]);
      var ipAd = socket.handshake["address"];
    //  console.log(socket.handshake["headers"]["user-agent"]);
    //  console.log(ua);

      //if(transroom[socket.id] != null) {
        if(ua.indexOf("Mac OS X 10_8_5") >=0 ) {
          model = "MacBookPro Retina";
        } else if(ua.indexOf("Ubuntu") >= 0) {
          model = "Lubuntu";
        } else if(ua.indexOf("Mac OS X 10_6_8") >= 0) {
          if(ua.indexOf("Firefox") >= 0) {
            model = "2009_MacbookPro";
          } else {
            model = "Old MacBook";
          }
        } else if(ua.indexOf("indows") >= 0) {
          model = "Windows";
        }
      //transHashに追加
      transroom[socket.id] = {ipAd: ipAd, sampleRate: json.sampleRate, emitMode: json.emitMode, receiveMode: json.receiveMode, playMode: json.playMode, model: model, spedMode: json.spedMode, scrnMode: json.scrnMode, BPMMode: json.BPMMode, mobileMode: json.mobileMode, selfMode: json.selfMode, selector:json.selector, gain:json.gain, pool:json.pool};
      socket.emit('status_from_server_id', socket.id);

      //deletedRoomに入っていた場合の救済
      //}
      /*
      for (key in deletedRoom){
        if(ipAd === key){
          transroom[socket.id] = {ipAd: key};
          for ( n in deletedRoom[key] ) {
            transroom[socket.id][n] = deletedRoom[key][n];
          }
          //transroom[socket.id] = {sampleRate: deletedRoom[key]["sampleRate"], emitMode: deletedRoom[key]["emitMode"], receiveMode: deletedRoom[key]["receiveMode"], playMode: deletedRoom[key]["playMode"], model: deletedRoom[key]["model"], spedMode: deletedRoom[key]["spedMode"], scrnMode: deletedRoom[key]["scrnMode"], BPMMode: deletedRoom[key]["BPMMode"], mobileMode: deletedRoom[key]["mobileMode"], selfMode: deletedRoom[key]["selfMode"], selector:deletedRoom[key]["selector"], ipAd: key};
          console.log('transroom rewrite');
          console.log(transroom);
          console.log(transroom[socket.id]);
          //該当端末側の設定を変更する
          socket.to(socket.id).emit('speedCtrl_from_server', transroom[socket.id]["spedMode"]);
          socket.to(socket.id).emit('rateCtrl_from_server', transroom[socket.id]["sampleRate"]);
          socket.to(socket.id).emit('scrnCtrl_from_server', transroom[socket.id]["scrnMode"]);
          socket.to(socket.id).emit('BPMCtrl_from_server', transroom[socket.id]["BPMMode"]);
          socket.to(socket.id).emit('emitCtrl_from_server', transroom[socket.id]["emitMode"]);
          socket.to(socket.id).emit('receiveCtrl_from_server', transroom[socket.id]["receiveMode"]);
          socket.to(socket.id).emit('playCtrl_from_server', transroom[socket.id]["playMode"]);
          delete deletedRoom[ipAd];
        }
      }*/
    //  console.log(transroom);
    } else if(json.type == 'mobile') {
      socket.join('mobile');
      mobileroom[socket.id] = {"BPM":json.BPM};
    }
    /*
    if(io.sockets.adapter.rooms.selfie != undefined) {
      selfieroom = io.sockets.adapter.rooms.selfie;
    }*/
    //不要なIDの削除
    for ( key in transroom ) {
      if ( key in io.sockets.adapter.rooms.trans ) {
      } else {
        delete transroom[key];
      }
    }
    console.log(transroom);
    if(io.sockets.adapter.rooms.ctrl != undefined) {
      ctrlroom = io.sockets.adapter.rooms.ctrl;
    }
    io.sockets.to('ctrl').emit('status_from_server',{
      transroom: transroom,
      mobileroom: mobileroom,
      fader: fader,
      buffer: {
        "streamBuff_length": streamBuff.length, 
        "1_name": recordedBuff[1]["name"], 
        "1_length": recordedBuff[1]["arr"].length,
        "2_name": recordedBuff[2]["name"], 
        "2_length": recordedBuff[2]["arr"].length,
        "3_name": recordedBuff[3]["name"], 
        "3_length": recordedBuff[3]["arr"].length,
        "4_name": recordedBuff[4]["name"], 
        "4_length": recordedBuff[4]["arr"].length
      }
    });
}

exports.sndImp = function wavImport(url, pcm, fname, bufferSize, io,trackNo) {
  var rtnBuff = [];
  var tmpBuff = new Float32Array(bufferSize);
  var i = 0;
  console.log('wav load start');
//pcm.getPcmData('me.mp3', { stereo: true, sampleRate: 44100 },
  pcm.getPcmData(url, { stereo: true, sampleRate: 44100 },
    function(sample, channel) {
    // Sample is from [-1.0...1.0], channel is 0 for left and 1 for right
      tmpBuff[i] = sample;
      i++;
      if(i==bufferSize){
        rtnBuff.push(tmpBuff);
        //recordedBuff.push(tmpBuff);
        tmpBuff = new Float32Array(bufferSize);
        i = 0;
      }
      //recordedBuff.push(sample);
    },
    function(err, output) {
      if (err)
        throw new Error(err);
      //console.log(recordedBuff.length);
      console.log(fname + " as " + trackNo +" load end. length:" + String(rtnBuff.length));
      io.sockets.to('ctrl').emit('status_from_server', {
        "trackNo": trackNo,
        "name": fname, 
        "length": rtnBuff.length
      });
    }
  );

  return rtnBuff;
}

exports.oscStts = function oscStatus(socket, io, oscroom){
  flag = true;
  for(key in oscroom) {
    if(key === socket.id)
      flag = false;
  }

  if(flag)
    oscroom[socket.id] = {volume: 0.5, frequency: 440, portament: 0.1};
  console.log(oscroom);
}

exports.keyCtrl = function keyControl(io, data){
  if(data.mode === 'self_switch') {
    io.sockets.emit('selfCtrl_from_server', data.value);
  } else if(data.mode === 'chat' || data.mode === 'text' || data.mode === 'self') {
    io.sockets.emit('modeCtrl_from_server', data.mode);
  }
}

exports.textCtrl = function textControl(kChar, charArr, nameList, io, socket){
  var idArr = [];
  var charList = {"S":[4,["A","H"]],"SA":[0,["T"]],"SAT":[0,["O"]],"SATO":[0,["S"]],"SATOS":[0,["H"]],"SATOSH":[0,["I"]],"SATOSHI":[0,[]],"A":[3,["T","S","N"]],"AT":[0,["O"]],"ATO":[0,["S"]],"ATOS":[0,["H"]],"ATOSH":[0,["I"]],"ATOSHI":[0,[]],"T":[0,["O"]],"TO":[0,["S"]],"TOS":[0,["H"]],"TOSH":[0,["I"]],"TOSHI":[0,[]],"O":[4,["S"]],"OS":[0,["H"]],"OSH":[0,["I"]],"OSHI":[0,[]],"S":[4,["H","A"]],"SH":[4,["I"]],"SHI":[4,["R"]],"H":[4,["I"]],"HI":[4,["R"]],"I":[4,["R"]],"Y":[1,["A"]],"YA":[1,["S"]],"YAS":[1,["H"]], "YASH":[1,["I"]],"YASHI":[1,["R"]],"YASHIR":[1,["O"]],"YASHIRO":[1,[]],"AS":[1,["H"]], "ASH":[1,["I"]],"ASHI":[1,["R"]],"ASHIR":[1,["O"]],"ASHIRO":[1,[]],"SHIR":[1,["O"]],"SHIRO":[1,[]],"HIR":[1,["O"]],"HIRO":[1,[]],"IR":[1,["O"]],"IRO":[1,[]],"R":[1,["O"]],"RO":[1,[]],"K":[2,["A"]],"KA":[2,["N"]],"KAN":[2,["D"]], "KAND":[2,["A"]],"KANDA":[2,[]],"AN":[2,["D"]], "AND":[2,["A"]],"ANDA":[2,[]],"N":[2,["D"]], "ND":[2,["A"]],"NDA":[2,[]],"D":[2,["A"]],"DA":[2,[]]};
  //console.log(idArr);
  var me;
  for (key in io.sockets.adapter.rooms.trans) {
    idArr.push(key);
    if(key === socket.id){
      me = idArr.length - 1;
    }
  }
  if(charArr.length === 0) {
    if(nameList[0].indexOf(kChar) > -1){
      charArr[0] = 0;
      charArr[1] = kChar;
    } else if(nameList[1].indexOf(kChar) > -1){
      charArr[0] = 1;
      charArr[1] = kChar;
    } else if(nameList[2].indexOf(kChar) > -1){
      charArr[0] = 2;
      charArr[1] = kChar;
    } else if(nameList[3].indexOf(kChar) > -1){
      charArr[0] = 3;
      charArr[1] = kChar;
    } else if(nameList[4].indexOf(kChar) > -1){
      charArr[0] = 4;
      charArr[1] = kChar;
    }
  } else {
    if(charList[charArr[1]][1].indexOf(kChar) > -1) {
      charArr[0] = charList[charArr[1]][0];
      charArr[1] = charArr[1] + kChar;
    } else {
      if(charArr[0] === 3) {
        io.sockets.emit('speak_from_server', charArr[1]);
      } else if (charArr[0] === 4) {
        if(me === 0) {
          console.log
          socket.emit('speak_from_server', charArr[1]);
          if(idArr.length > 1) {
            socket.to(idArr[1]).emit('speak_from_server', charArr[1]);
          }
        } else if(me === 1) {
          socket.to(idArr[0]).emit('speak_from_server', charArr[1]);
          socket.emit('speak_from_server', charArr[1]);
        } else {
          socket.to(idArr[0]).emit('speak_from_server', charArr[1]);
          if(idArr.length > 1) {
            socket.to(idArr[1]).emit('speak_from_server', charArr[1]);
          }
        }
      } else {
        if(charArr[0] === me) {
          socket.emit('speak_from_server', charArr[1]);
        } else {
          if(idArr.length > charArr[0]) {
            socket.to(idArr[charArr[0]]).emit('speak_from_server', charArr[1]);
          }
        }
      }

      if(nameList[0].indexOf(kChar) > -1){
        charArr[0] = 0;
        charArr[1] = kChar;
      } else if(nameList[1].indexOf(kChar) > -1){
        charArr[0] = 1;
        charArr[1] = kChar;
      } else if(nameList[2].indexOf(kChar) > -1){
        charArr[0] = 2;
        charArr[1] = kChar;
      } else if(nameList[3].indexOf(kChar) > -1){
        charArr[0] = 3;
        charArr[1] = kChar;
      } else if(nameList[4].indexOf(kChar) > -1){
        charArr[0] = 4;
        charArr[1] = kChar;
      } else {
        charArr = []; 
      }
    }
  }
  return charArr;

}

