
/**
 * Module dependencies.
 */
var express = require ('express'),
    http = require('http'),
    path = require('path');
var fs = require('fs');
var expo = require('./export.js');
var pcm = require('pcm');

//初期値　emittypeとspeak_flag要らないのでは。。。
var emittype = 2;
var speak_flag = false,
    sampleRate = 22050,
    bufferSize = 8192,
    jumpBit = 2;
var emitMode = "no_emit";
var receiveMode = false;
var playMode = false;
var streamConsole = false;
var buffMode = false;

var transHash = {},
    selfieHash = {};
var streamBuff = [];
var fileBuff = []; //不要？
var recordedBuff = {"name": "none", "arr":[]};
var fieldrecBuff = {"name": "none", "arr":[]};
//var recordedBuff = [];
var log = "./feedback.csv"
var selfieroom = {},
    transroom = {},
    ctrlroom = {};
var oscroom = {};
var loadBuff = [];

var selector = ["stream"]; //all/stream/buff/recorded/empty

var app = express();

// all environments
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

//routing

app.get('/ctrl', function(req, res){
  res.render('ctrl', {
    title: 'ctrl'
  });
});

app.get('/rec', function(req, res){
  res.render('rec',{
    title: 'wav recording',
    buff: recordedBuff["arr"].shift()
  });
});


app.get('/', function(req, res){
  res.render('client',{
    title: 'client', 
    init_speak: speak_flag,
    init_rate: sampleRate,
    init_jump: jumpBit,
    init_size: bufferSize,
    emitMode: emitMode,
    receiveMode: receiveMode,
    playMode: playMode,
    init_osc_vol: 0.5,
    init_osc_pitch: 440, 
    init_osc_portament: 0.1,
    init_osc_difftype: "none",
    init_osc_diffval: 0
  });
});
var port = process.env.PORT || 3000;
var server = http.createServer(app).listen(port);

//socket.io
var io = require('socket.io').listen(server);
//io.set('log level', 1);


io.sockets.on('connection', function(socket) {
  //for wav import
  socket.on('importReq_from_client', function(data) {
    if(data.target === "recorded") {
      recordedBuff["name"] = data.url.slice(15);
      recordedBuff["arr"] = expo.sndImp(data.url,pcm,recordedBuff["name"],bufferSize,streamBuff, io, data.target, fieldrecBuff);
    } else if(data.target === "fieldrec") {
      fieldrecBuff["name"] = data.url.slice(15);
      fieldrecBuff["arr"] = expo.sndImp(data.url,pcm,fieldrecBuff["name"],bufferSize, streamBuff, io, data.target, fieldrecBuff);
    }
  });

  //for feedback

  //for trans feedback
  //フィードバックのパケット受信・送信
  socket.on('stream_from_client', function(data) {
    if(streamConsole) 
      console.log(data.stream[0]);
    if(buffMode)
      streamBuff.push(data.stream);
    var strm = expo.slctCtrl(selector, data.stream, streamBuff, recordedBuff["arr"], fieldrecBuff["arr"]);
    expo.emtCtrl(socket.id, strm, data.emitMode,io, socket);
  });
  //下記３つのコントロール、やってることほぼ同じだし関数化したい
  socket.on('modeCtrl_from_client', function(data){
    console.log(data);
    if(data.type ==="buff") {
      buffMode = data.mode;
      //console.log("buffMode:" + String(data.mode));
      console.log("buffMode:" + String(data.mode) + "(length:" + String(streamBuff.length) + ")");
      io.sockets.to('ctrl').emit('status_from_server', {
        buffer: {
          "streamBuff_length": streamBuff.length, 
          "recordedBuff_name": recordedBuff["name"], 
          "recordedBuff_length": recordedBuff["arr"].length,
          "fieldrecBuff_name": fieldrecBuff["name"],
          "fieldrecBuff_length": fieldrecBuff["arr"].length
        }
      });
    } else if(data.type ==="buffClear") {
      console.log("buff clear(length:" + String(streamBuff.length) + ")");
      streamBuff = [];
      io.sockets.to('ctrl').emit('status_from_server', {
        buffer: {
          "streamBuff_length": streamBuff.length, 
          "recordedBuff_name": recordedBuff["name"], 
          "recordedBuff_length": recordedBuff["arr"].length,
          "fieldrecBuff_name": fieldrecBuff["name"],
          "fieldrecBuff_length": fieldrecBuff["arr"].length
        }
      });
    } else if(data.type ==="audioClear") {
      recordedBuff = {"name": "none", "arr": []};
      io.sockets.to('ctrl').emit('status_from_server', {
        buffer: {
          "streamBuff_length": streamBuff.length, 
          "recordedBuff_name": recordedBuff["name"], 
          "recordedBuff_length": recordedBuff["arr"].length,
          "fieldrecBuff_name": fieldrecBuff["name"],
          "fieldrecBuff_length": fieldrecBuff["arr"].length
        }
      });
    } else {
      expo.ctrlCtrl(socket, io, transroom, data.target, data.mode, data.type, selector);
    }
  });

  socket.on('selectorCtrl_from_client', function(data){
    //console.log("fuck");
    console.log(data);
    selector =data;
  });
  socket.on('audioCtrl_from_client', function(data){
    console.log(data);
    if(data.type = "rate") {
      if(data.target === "all") {
        for ( key in transroom) {
          transroom[key]["sampleRate"] = data.mode;
          io.sockets.emit('rateCtrl_from_server', data.mode);
        }
      } else {
        transroom[data.target]["sampleRate"] = data.mode;
        socket.to(data.target).json.emit('rateCtrl_from_server', data.mode);
      }
    } else if(data.type = "buff") {
      if(data.target === "all") {
        for ( key in transroom) {
          transroom[key]["bufferSize"] = data.mode;
          io.sockets.emit('buffCtrl_from_server', data.mode);
        }
      } else {
        transroom[data.target]["bufferSize"] = data.mode;
        socket.to(data.target).json.emit('buffCtrl_from_server', data.mode);
      }
    }

    console.log(transroom);
    io.sockets.to('ctrl').emit('status_from_server', {
      transroom: transroom,
      selector: selector,
      buffer: {"streamBuff_length": streamBuff.length, "recordedBuff_name": recordedBuff["name"], "recordedBuff_length": recordedBuff["arr"].length}
    });
  });

  socket.on('oneshotCtrl_from_client', function(data) {
    if(data.type==="load"){
      if(data.src === "recorded") {
        var start = Math.floor(Math.random() * (recordedBuff["arr"].length - 10));
        loadBuff = recordedBuff["arr"].slice(start,start + 10);
      } else if(data.src === "fieldrec"){
        var start = Math.floor(Math.random() * (fieldrecBuff["arr"].length - 10));
        loadBuff = fieldrecBuff["arr"].slice(start,start + 10);
      } else if(data.src === "buff"){
        var start = Math.floor(Math.random() * (streamBuff.length - 10));
        loadBuff = streamBuff.slice(start,start + 10);
      }

      console.log("start point:" + String(start));
      socket.to(data.target).json.emit('oneshotCtrl_from_server', {
        type: data.type,
        loadBuff: loadBuff
      });
    } else if(data.type === "trig") {
      if(data.target === 'all') {
        io.sockets.emit('oneshotCtrl_from_server', {
          type: data.type
        });
      } else {
        socket.to(data.target).json.emit('oneshotCtrl_from_server', {
          type: data.type
        });
      }
    } else if(data.type === "notice_load") {
      console.log('oneshotBuffer loaded');
      io.sockets.to('ctrl').emit('oneshotCtrl_from_server', {
        type: data.type,
        from: socket.id
      });
    }
  });
  socket.on('oscCtrl_from_client', function(data) {
    console.log(data);
    if(data.type == "frd"){
      var arr = [];
      for(key in oscroom) {
        arr.push(key);
      }
      var basefrq = oscroom[arr[0]]["frequency"];
      if (data.diffmode === 'mod') {
        if(data.val < 5){
          var beki = Math.pow(10,data.val-3);
        } else {
          var beki = 110;
        }
        for(var i=0;i<arr.length;i++){
          var frq = basefrq + ((i + 1) * beki);
          oscroom[arr[i]]['frequency'] = frq;
          socket.to(arr[i]).json.emit('oscCtrl_from_server', {
            type: 'diff',
            val: frq
          });
        }
      } else if(data.diffmode === 'hrmn') {
        if(data.val < 4) {
          for(var i=0;i<arr.length;i++){
            var frq = basefrq * Math.pow(2, ((i*data.val) / 12));
            oscroom[arr[i]]['frequency'] = frq;
            socket.to(arr[i]).json.emit('oscCtrl_from_server', {
              type: 'diff',
              val: frq
            });
          }
        } else {
          var n = (data.val-3)/2;
          for(var i=0;i<arr.length;i++){
            var frq = basefrq * n * (i+1);
            oscroom[arr[i]]['frequency'] = frq;
            socket.to(arr[i]).json.emit('oscCtrl_from_server', {
              type: 'diff',
              val: frq
            });
          }
        }
      }
    } else if(data.type === "ltc") {
      var val = data.val;
      for(key in oscroom) {
        if(data.random) 
          val = (val * 0.5) + (val * Math.random());
        socket.to(key).json.emit('oscCtrl_from_server', {
          type: 'latency',
          val: val
        });
      }
      if(data.mode === "random") 
        val = val + (val * Math.random());
      socket
    //} else if(data.type != "frd") {
    } else {
      if(data.target === "all") {
        io.sockets.emit('oscCtrl_from_server', data);
        if(data.type == "vol"){
          for(key in oscroom) {
            oscroom[key]["volume"] = data.val;
          }
        }
      } else {
        socket.to(data.target).json.emit('oscCtrl_from_server',data);
      }
    }


  });

  socket.on('recorderCtrl_from_client', function(data) {
    console.log(data);
    io.sockets.emit('recorderCtrl_form_server', data);
  });

  socket.on('recordedURL_from_client', function(data){
    console.log(data);
    //io.sockets.to('ctrl').emit('recordedURL_from_server', data);
    io.sockets.emit('recordedURL_from_server', data);
  });
  //for all client(status check)
  socket.on('status_from_client', function(data) {
    expo.sttsCtrl(data, socket, io, selfieroom, transroom, ctrlroom, selector, streamBuff, recordedBuff, fieldrecBuff);

    if(data.type==="trans")
      expo.oscStts(socket, io, oscroom);
  });

  //for debug
  socket.on('debugCtrl_from_client', function(data) {
//    socket.broadcast.emit('debug_from_server', data);
    //if('consoleCtrl' in data) {
    //} else if (data==="allClear") {
    if (data.type==="allClear") {
      console.log(data);
      for (key in transroom) {
        transroom[key]["emitMode"] = "no_emit";
        transroom[key]["receiveMode"] = false;
        transroom[key]["playMode"] = false;
      }
      io.sockets.emit('clear_from_server',data);
    } else if (data.type==="buffClear") {
      console.log(data);
      io.sockets.emit('clear_from_server',data);
    } else if (data.type==="valueCheck") {
      console.log("transroom:");
      console.log(transroom);
      console.log("selector:" + selector.join());
      console.log("streamBuff:" + String(streamBuff.length));
      console.log("recordedBuff:" + recordedBuff["name"] + "..." + String(recordedBuff["arr"].length));
    } else if (data.type==="streamconsole") {
      streamConsole = data.consoleCtrl;
    } else if (data.type==="result") {
      console.log(data);
    }
  });
  socket.on("disconnect", function () {
    console.log("disconnect: " + socket.id);
    if (socket.id in transroom) {
      delete transroom[socket.id];
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
  });
});
