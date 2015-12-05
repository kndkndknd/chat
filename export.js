exports.emtCtrl = function emitCtrl(id, stream, emitMode, mobileMode, io, socket, video, selfMode, type){
  var transList = io.sockets.adapter.rooms.trans;
/*  if(emitMode == "all"){
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
  } else */
  if(emitMode == "broadcast"){
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

exports.slctCtrl = function selectControl(fader, stream, streamBuff, recordedBuff, video) {
  var rtn = [new Float32Array(8192), "none", "empty"];
  var n = Math.floor(Math.random() * (fader["stream"] + fader["buff"] + fader["1"] + fader["2"] + fader["3"] + fader["4"] + fader["empty"]));
  if(n < fader["stream"]){
    rtn = [stream, video, "stream"];
  } else if(n < (fader["stream"] + fader["buff"])){
    rtn = [streamBuff["stream"].shift(), streamBuff["video"].shift(), "buff"];
    streamBuff["stream"].push(rtn[0]);
    streamBuff["video"].push(rtn[1]);
  } else if(n < (fader["stream"] + fader["buff"] + fader["1"])){
    rtn = [recordedBuff[1]["arr"].shift(), recordedBuff[1]["video"], "1"];
    recordedBuff[1]["arr"].push(rtn[0]);
  } else if(n < (fader["stream"] + fader["buff"] + fader["1"] + fader["2"])){
    rtn = [recordedBuff[2]["arr"].shift(), recordedBuff[2]["video"], "2"];
    recordedBuff[2]["arr"].push(rtn[0]);
  } else if(n < (fader["stream"] + fader["buff"] + fader["1"] + fader["2"] + fader["3"])){
    rtn = [recordedBuff[3]["arr"].shift(), recordedBuff[3]["video"], "3"];
    recordedBuff[3]["arr"].push(rtn[0]);
  } else if(n < (fader["stream"] + fader["buff"] + fader["1"] + fader["2"] + fader["3"] + fader["4"])){
    rtn = [recordedBuff[4]["arr"].shift(), recordedBuff[4]["video"], "4"];
    recordedBuff[4]["arr"].push(rtn[0]);
  }
  //console.log(rtn[0][0]);
  return rtn;
}

exports.ctrlCtrl = function controlCtrl(socket, io, transroom, target, mode, type, fader){
  if(target === "all"){
    io.sockets.emit(type + "Ctrl_from_server", mode);
    for (key in transroom) {
      transroom[key][type + "Mode"] = mode;
    }
  } else {
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
    } else {
      socket.to(target).json.emit(type + "Ctrl_from_server", mode);
    }

      
    if (target in transroom) {
      transroom[target][type + "Mode"] = mode;
    }
  }
  console.log(transroom);
  io.sockets.to('ctrl').emit('status_from_server', {
    transroom: transroom,
    fader: fader
  });
}
exports.sttsCtrl = function statusCtrl(json, socket, io, transroom,ctrlroom, mobileroom, fader, streamBuff, recordedBuff){
    console.log(io.sockets.adapter.rooms);
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
      console.log(io.sockets.adapter.rooms.trans);
      //console.log(JSON.stringify(socket.handshake));
      //console.log(socket.handshake["address"]);
      //console.log(io.sockets.manager.rooms['/trans']);
      //
      var model = "unknown";
      var ua = String(socket.handshake["headers"]["user-agent"]);
      console.log(socket.handshake["headers"]["user-agent"]);
      console.log(ua);
      /*if(ua.indexOf("Android 5.0.2; Nexus 7") >= 0) {
        model = "Nexus7 32GB";
       // console.log("Android");
      } else if(ua.indexOf("Android 4.4.4; Nexus 7") >= 0) {
        model = "Nexus7 16GB";
      } else*/ if(ua.indexOf("Mac OS X 10_8_5") >=0 ) {
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
      transroom[socket.id] = {sampleRate: json.sampleRate, emitMode: json.emitMode, receiveMode: json.receiveMode, playMode: json.playMode, model: model, spedMode: json.spedMode, scrnMode: json.scrnMode, BPMMode: json.BPMMode, mobileMode: false, selfMode: false, selector:json.selector};
      socket.emit('status_from_server_id', socket.id);
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
//pcm.getPcmData('test.mp3', { stereo: true, sampleRate: 44100 },
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
