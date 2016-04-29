
/**
 * Module dependencies.
 */

//https化
var https = require('https'),
    ssl_server_key = './server_key/server_key.pem',
    ssl_server_crt = './server_key/server_crt.pem';

var express = require ('express'),
    path = require('path');
var fs = require('fs');
var expo = require('./export.js');
var log = "./public/files/log.txt";
var pcm = require('pcm');
//var easyimg = require('easyimage');
var images = require('./public/images/image.json');

//http鍵読み込み
var options = {
  key: fs.readFileSync(ssl_server_key),
  cert: fs.readFileSync(ssl_server_crt)
};

//初期値　emittypeとspeak_flag要らないのでは。。。
var emittype = 2;
var speak_flag = false,
    sampleRate = 22050,
    bufferSize = 8192,
    jumpBit = 2;
var speedMode = "slow";
var emitMode = "no_emit";
var receiveMode = false;
var playMode = false;
var streamConsole = false;
var buffMode = false;
var mobileBPM = 100;
var mobiSwitch = true;
var recMode = false;
var started = false;
var buffAdd = 0;
var streamBuff = {"stream":[], "video":[]};
var recordedBuff = {1:{"name": "none", "arr":[], "video":"spectrum"},2:{"name": "none", "arr":[], "video":"spectrum"},3:{"name": "none", "arr":[], "video":"spectrum"}, 4:{"name": "none", "arr":[], "video":"spectrum"}};
var fader = {"1":0, "2":0, "3":0, "4":0, "stream":1, "buff":0, "empty":0};
var transroom = {},
    mobileroom = {},
    ctrlroom = {};
var deletedRoom = {};
var oscroom = {};
var loadBuff = [];
var recordedFile = [];
var initReload = 200;
var charArr = [];
var nameList = {0:["T"], 1:["Y","R"], 2:["K","N","D"], 3:["A"], 4:["O","S","H","I"]};

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

var encodeimg = function(filename, callback) {
  console.log(filename);
  var file = fs.readFile(filename, function(err, data) {
    console.log(data);
    callback(err, new Buffer(data).toString('base64'));
  });
}
app.get('/ctrl', function(req, res){
  var sndarr = [""];
  var imgarr = [""];
  fs.readdir('./public/files', function(err, files){
    if (err) throw err;
    files.forEach(function (file) {
      if((file.indexOf('png') != -1 || file.indexOf('jpg') != -1) && file.indexOf('thumbnail') == -1){
        imgarr.push(file);
      } else {
        sndarr.push(file);
      }
      console.log(file);
    });
    res.render('ctrl', {
      title: 'ctrl',
      recordedFile: sndarr,
      imgFile: imgarr,
      started: started
    });
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
    //speedMode: speedMode,
    emitMode: emitMode,
    receiveMode: receiveMode,
    playMode: playMode,
    initReload: initReload,
    init_osc_vol: 0.5,
    init_osc_pitch: 440, 
    init_osc_portament: 0.1,
    init_osc_difftype: "none",
    init_osc_diffval: 0
  });
});

app.get('/mobile', function(req, res){
  res.render('mobile',{
    title: 'mobile',
    BPM: mobileBPM,
    sw: mobiSwitch
  });
});
app.get('/feedback', function(req, res){
  res.render('feedback',{
    title: 'mobile'
  });
});
var port = process.env.PORT || 8888;
//var port = process.env.PORT || 3000;
var server = https.createServer(options,app).listen(port);

//socket.io
var io = require('socket.io').listen(server);

io.sockets.on('connection', function(socket) {

  //for trans feedback
  //フィードバックのパケット受信・送信
  socket.on('stream_from_client', function(data) {
    //console.log(data.video);
    if(buffMode){
      streamBuff["stream"].push(data.stream);
      streamBuff["video"].push(data.video);
      //2月のライブではバッファ長10までにする
      buffAdd = buffAdd + 1;
      if(buffAdd >= 10) {
        buffMode = false;
      }
    }
    if(recMode){
      fs.appendFile(log, data.video, 'utf8', function(err) {
        console.log(err);
      });
      recMode = false;
    }
    var strm = expo.slctCtrl(fader, data.stream, streamBuff, recordedBuff, data.video, images);
    expo.emtCtrl(socket.id, strm[0], data.emitMode, transroom[socket.id]["mobileMode"],io, socket, strm[1], transroom[socket.id]["selfMode"], strm[2], transroom);
    if(streamConsole) {
      console.log(strm[0]);
      console.log(strm[1]);
    }
  });


  //下記３つのコントロール、やってることほぼ同じだし関数化したい
  socket.on('modeCtrl_from_client', function(data){
    console.log(data);
    if(data.type === "keyCtrl") {
      expo.keyCtrl(io,data);
    } else if(data.type ==="buff") {
      buffMode = data.mode;
      console.log("buffMode:" + String(data.mode) + "(length:" + String(streamBuff["stream"].length) + ")");
      io.sockets.to('ctrl').emit('status_from_server', {
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
    } else if(data.type ==="buff_cli") {
      buffAdd = 0;
      buffMode = true;
      console.log('10 sample add to buff');
      io.sockets.to('ctrl').emit('status_from_server', {
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
    } else if(data.type ==="buffClear") {
      console.log("buff clear(length:" + String(streamBuff["stream"].length) + ")");
      //streamBuff = [];
      streamBuff = {"stream":[], "video":[]};
      io.sockets.to('ctrl').emit('status_from_server', {
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
    } else if(data.type === "rec") {
      recMode = data.mode;
      console.log(data.mode);
    } else if(data.type ==="audioClear") {
      recordedBuff = {"name": "none", "arr": []};
      io.sockets.to('ctrl').emit('status_from_server', {
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
    } else if(data.type === "mobi") {
      if(data.target === "all"){
        for (key in transroom) {
          transroom[key]["mobileMode"] = data.mode;
        }
      } else {
	      transroom[data.target]["mobileMode"] = data.mode;
      }

    } else if(data.type === "mbsw") {
      if(data.target === "all") {
	      for (key in mobileroom) {
	        mobileroom[key]["switch"] = data.mode;
	      }
        io.sockets.to('mobile').emit('mobiCtrl_from_server',{
          mode: "sw",
          val: data.mode
        });
        mobiSwitch = data.mode;
      }    
    } else {
      expo.ctrlCtrl(socket, io, transroom, data.target, data.mode, data.type, fader, data.val);
    }
  });
  socket.on('faderCtrl_from_client', function(data){
    //2月のライブ向け、Clientからの操作対応
    if(data.target.indexOf('add_') != -1) {
      fader[data.target.substr(4)] = fader[data.target.substr(4)] + Number(data.val);
    } else {
      fader[data.target] = Number(data.val);
    }
    console.log(fader);
  });
  socket.on('rangeCtrl_from_client', function(data){
    console.log(data);
    if(data.mode==="fader"){
    fader[data.target] = Number(data.val);
    console.log(fader);
    } else if(data.mode === "mobiBPM") {
      if(data.val === 0) {
        var sendval = 0;
      } else {
        var sendval = Math.floor(15000/data.val);
      }
      io.sockets.to('mobile').emit('mobiCtrl_from_server', {
        mode: "BPM",
        val: sendval
      });
    } else if(data.mode === "gain") {
      console.log(parseFloat(data.val));
      socket.to(data.target).emit("gainCtrl_from_server", parseFloat(data.val));
      if (data.target in transroom) {
        transroom[data.target][data.mode + "Mode"] = data.val;
      }
    } else {
      expo.ctrlCtrl(socket, io, transroom, data.target, data.mode, data.type, fader, data.val);
    }
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
      fader: fader,
      buffer: {"streamBuff_length": streamBuff.length, "recordedBuff_name": recordedBuff[1]["name"], "recordedBuff_length": recordedBuff[1]["arr"].length}
    });
  });

  socket.on('oneshotCtrl_from_client', function(data) {
    if(data.type==="load"){
      if(data.src === "recorded") {
        var start = Math.floor(Math.random() * (recordedBuff[1]["arr"].length - 10));
        loadBuff = recordedBuff[1]["arr"].slice(start,start + 10);
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

  socket.on('recorderCtrl_from_client', function(data) {
    console.log(data);
    io.sockets.emit('recorderCtrl_form_server', data);
  });

  socket.on('recordedURL_from_client', function(data){
    console.log(data);
    io.sockets.emit('recordedURL_from_server', data);
  });
  //for all client(status check)
  socket.on('status_from_client', function(data) {
    console.log(data.type);
    expo.sttsCtrl(data, socket, io, transroom, ctrlroom, mobileroom,fader, streamBuff, recordedBuff, deletedRoom);

    if(data.type==="trans")
      expo.oscStts(socket, io, oscroom);
  });

  var time = 0;
  socket.on('time_from_client', function() {
    console.log("start");
    started = true;
    setInterval(function(){
      time = time + 1;
      io.sockets.to('ctrl').emit('time_from_server',String(time) + ':00');
    }, 60000);
  });
  socket.on('buffReq_from_client', function(data) {
    var rtnarr = [];
    for(var i=0;i<data.length;i++){
      var tmp = recordedBuff[data.target]["arr"].shift();
      rtnarr.push(tmp);
      recordedBuff[data.target]["arr"].push(tmp);
    }
    socket.emit('buffRtn_from_server',rtnarr);
  });

  socket.on('keycode_from_client', function(data){
    console.log(data);
    //expo.textCtrl(data, io, socket);
    var kChar = String.fromCharCode(data);
    charArr = expo.textCtrl(kChar, charArr, nameList, io, socket);
    console.log(charArr);
  });

  //for debug
  socket.on('debugCtrl_from_client', function(data) {
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
      console.log("fader:" + JSON.stringify(fader));
      console.log("streamBuff:" + String(streamBuff.length));
      console.log("1:" + recordedBuff[1]["name"] + "..." + String(recordedBuff[1]["arr"].length));
    } else if (data.type==="streamconsole") {
      console.log(data.consoleCtrl);
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
      transroom: transroom,
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
  });
});
