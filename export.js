

exports.emtCtrl = function emitCtrl(id, stream, emitMode, io, socket, video){
  var transList = io.sockets.adapter.rooms.trans;
  if(emitMode == "all"){
//    socket.to('trans').emit('stream_from_server',{
    io.sockets.to('trans').emit('stream_from_server',{
      id: id,
      stream: stream,
      video: video
    });
//    console.log("emit all from " + id);
  } else if(emitMode == "broadcast"){
    socket.broadcast.to('trans').emit('stream_from_server', {
    //socket.broadcast.emit('stream_from_server', {
      id: id,
      stream: stream,
      video: video
    });
    //socket.broadcast.emit('debug_from_server', id);
//    console.log("emit broadcast from " + id);
  } else if(emitMode == "self"){
    socket.emit('stream_from_server', {
    //socket.to(id).json.emit('stream_from_server', {
      id: id,
      stream: stream,
      video: video
    });
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
    

    /*
    for(var i = 0; i < transList.length; i++){
      if(transList[i] === id){
        if(transList.length > i + 1) {target = transList[i+1];}
        break;
      };
    };*/
    socket.to(target).json.emit('stream_from_server', {
      id: id,
      stream: stream,
      video: video
    });
//    console.log("emit to next door from " + id);
  } else if(emitMode == "random"){
    var arr = [];
    for (key in io.sockets.adapter.rooms.trans) {
      if(key != socket.id)
        arr.push(key);
    }
    var target = arr[Math.floor(Math.random() * arr.length)];
    socket.to(target).json.emit('stream_from_server', {
      id: id,
      stream: stream,
      video: video
    });
//    console.log("emit random from " + id);
  }
}

exports.slctCtrl = function selectControl(selector, stream, streamBuff, recordedBuff, fieldrecBuff, videoBuff,video, recImg) {
  var rtn = [];
  //var rtn;
  var r = Math.random();
  var n = selector.length;
  var m = n;
  for(var i=0;i<n;i++){
    if(selector[i]==="stream"){
      if(r < (m/n)){
        rtn = [stream,video];
        m--;
      }
    } else if(selector[i]==="buff"){
      if(r < (m/n)){
        //rtn = streamBuff.shift();
        var i = Math.floor(Math.random() * streamBuff.length);
        rtn = [streamBuff[i],videoBuff[i]];
        //rtn = [streamBuff.shift(),videoBuff.shift()];
        //streamBuff.push(rtn[0]);
      }
      m--;
    } else if(selector[i]==="recorded"){
      if(r < (m/n))
        //rtn = [recordedBuff.shift(),"spectrum"];
        rtn = [recordedBuff[Math.floor(Math.random() * recordedBuff.length)], recImg];
        //recordedBuff.push(rtn[0]);
      m--;
    } else if(selector[i]==="fieldrec"){
      if(r < (m/n))
        rtn = [fieldrecBuff[Math.floor(Math.random() * fieldrecBuff.length)], "spectrum"];
        //rtn = [fieldrecBuff.shift(),"spectrum"];
        //fieldrecBuff.push(rtn);
      m--;
    } else if(selector[i]==="empty"){
      if(r < (m/n))
        rtn = [new Float32Array(8192), "none"];
      m--;
    }
  }
  return rtn;
}

exports.ctrlCtrl = function controlCtrl(socket, io, transroom, target, mode, type, selector){
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
    } else if (type === "server") {
      socket.to(target).json.emit('serverCtrl_from_server', mode);
    } else if (type === "scrn") {
      socket.to(target).json.emit('scrnCtrl_from_server', mode);
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
    selector: selector
  });
}
exports.sttsCtrl = function statusCtrl(json, socket, io, selfieroom, transroom,ctrlroom, selector, streamBuff, recordedBuff, fieldrecBuff){
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
      //console.log(socket.handshake["headers"]["user-agent"]);
      console.log(ua);
      if(ua.indexOf("Android 5.0.2; Nexus 7") >= 0) {
        model = "Nexus7 32GB";
       // console.log("Android");
      } else if(ua.indexOf("Android 4.4.4; Nexus 7") >= 0) {
        model = "Nexus7 16GB";
      } else if(ua.indexOf("Mac OS X 10_8_5") >=0 ) {
        model = "MacBookPro Retina";
      } else if(ua.indexOf("Ubuntu") >= 0) {
        model = "Lubuntu";
      } else if(ua.indexOf("Mac OS X 10_6_8") >= 0) {
        if(ua.indexOf("Firefox") >= 0) {
          model = "2009_MacbookPro";
        } else {
          model = "Old MacBook";
        }
      } else if(ua.indexOf("iPhone") >= 0) {
        model = "iphone";
      }
      //transHashに追加
      transroom[socket.id] = {sampleRate: json.sampleRate, emitMode: json.emitMode, receiveMode: json.receiveMode, playMode: json.playMode, model: model, serverMode: json.serverMode, scrnMode: json.scrnMode, BPMMode: json.BPMMode};
      socket.emit('status_from_server_id', socket.id);
    }
    if(io.sockets.adapter.rooms.selfie != undefined) {
      selfieroom = io.sockets.adapter.rooms.selfie;
    }
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
      selfieroom: selfieroom,
      transroom: transroom,
      selector: selector,
      buffer: {
        "streamBuff_length": streamBuff.length, 
        "recordedBuff_name": recordedBuff["name"], 
        "recordedBuff_length": recordedBuff["arr"].length,
        "fieldrecBuff_name": fieldrecBuff["name"],
        "fieldrecBuff_length": fieldrecBuff["arr"].length
      }
    });
}

exports.sndImp = function wavImport(url, pcm, fname, bufferSize, streamBuff, io, target, otherBuff) {
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
      console.log(fname + " as " + target +" load end. length:" + String(rtnBuff.length));
      if(target === "recorded") {
        io.sockets.to('ctrl').emit('status_from_server', {
          buffer: {
            "streamBuff_length": streamBuff.length, 
            "recordedBuff_name": fname, 
            "recordedBuff_length": rtnBuff.length,
            "fieldrecBuff_name": otherBuff["name"],
            "fieldrecBuff_length": otherBuff["arr"].length
          }
        });
      } else if(target === "fieldrec") {
        io.sockets.to('ctrl').emit('status_from_server', {
          buffer: {
            "streamBuff_length": streamBuff.length, 
            "fieldrecBuff_name": fname, 
            "fieldrecBuff_length": rtnBuff.length,
            "recordedBuff_name": otherBuff["name"],
            "recordedBuff_length": otherBuff["arr"].length
          }
        });
      }
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
