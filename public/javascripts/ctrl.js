//for status controll
socket.json.emit('status_from_client', {
  type:'ctrl'
});
socket.on('status_from_server', function(data) {
  //console.log('status');
  list(data);
});
socket.on('recordedURL_from_server', function(data){
  $("#rec_url").append(data);
});
socket.on('oneshotCtrl_from_server', function(data) {
  if(data.type === "notice_load") {
    $("#oneshot_status_" + data.from).html("<i>loaded</i>");
  }
});
$(function() {
  $(document).on('change', '.emit_mode', function(){
    var targetId = $(this).attr('name').slice(5);
    var emitMode = $('input[name="emit_' + targetId + '"]:checked').val();
    socket.json.emit('modeCtrl_from_client', {
      type: "emit",
      target: targetId,
      mode: emitMode
    });
  });
});


$(function() {
  $(document).on('click', '.checkbox_mode', function(){
    var type = $(this).attr('name').substr(0,4);
    var mode = $(this).prop('checked');
    if(type ==="recv"){
      type = "receive";
    } else if(type === "srvr") {
      type = "server";
    }
    if( $(this).attr('name') != "rec"){
      var targetId = $(this).attr('name').slice(5);
      var val = $(this).val();
      //要テスト
      console.log(val);
      socket.json.emit('modeCtrl_from_client', {
        type: type,
        target: targetId,
        mode: mode,
        val: val
      });
    } else {
      socket.json.emit('modeCtrl_from_client', {
        type: "rec",
        mode: mode
      });
    }
  });
});
$(function() {
  $(document).on('click', '.radio_mode', function(){
    var targetId = $(this).attr('name').slice(5);
    var type = $(this).attr('name').substr(0,4);
    /*
    if(type === "scrn") {
      var mode = ($'input[name="' + type + '_' + targetId + '"]:checked').val();
    }*/
    var mode = $('input[name="' + type + '_' + targetId + '"]:checked').val();
    socket.json.emit('modeCtrl_from_client', {
      type: type,
      target: targetId,
      mode: mode
    });
  });
});

$(function() {
  $(document).on('click', '#time', function(){
    if(started === false) {
      $('#time').html('00:00');
      started = true;
      socket.emit('time_from_client');
    }
  });
});
socket.on('time_from_server', function(data) {
  $('#time').html(data);
});


$(function() {
  $(document).on('click', '#buffclear', function(){
    socket.json.emit('modeCtrl_from_client', {
      type: "buffClear",
      target: "all",
      mode: true
    });
  });
});

$(function() {
  $(document).on('click', '.clickCtrl', function(){
    var type = $(this).attr('name');
    //audioClear, buffClear, clientClear
    socket.json.emit('modeCtrl_from_client', {
      type: type,
      target: "all",
      mode: true
    });
  });
});
/*
$(function() {
  $(document).on('click', '.selector', function(){
    var selector = $('.selector:checked').map(function() {
        return $(this).val();
    }).get();
    if($.inArray("empty", selector)>0) {
      for(var i=0;i<($("#empty_selector").val())-1;i++) {
        selector.push("empty");
      }
    }
    socket.emit('selectorCtrl_from_client', selector);
  });
});
*/

$(function() {
  $(document).on('change', '.rangeCtrl', function(){
    var mode = $(this).attr('name');
    //var target = $(this).attr('id');
    var target = $(this).attr('id').slice(mode.length+1);
    var val = $(this).val();
    $('#' + mode + "_" + target + '_val').html(val);
    //$('#' + target + '_val').html(val);
    socket.emit('rangeCtrl_from_client', {
      mode: mode,
      type: mode,
      target: target,
      val: val
    });
  });
});
/*
$(function() {
  $(document).on('change', '#empty_selector', function(){

    var val = $(this).val();
    var selector = $('.selector:checked').map(function() {
        return $(this).val();
    }).get();
    if($.inArray("empty", selector)>0) {
      for(var i=0;i<($("#empty_selector").val())-1;i++) {
        selector.push("empty");
      }
    }
    socket.emit('selectorCtrl_from_client', selector);
    $('#empty_val').html(val);
    
  });
});
*/
$(function() {
  $(document).on('change', '.sampleRate', function(){
    var name = $(this).attr('name');
    var type = $(this).attr('name').substr(0,4);
    var targetId = $(this).attr('name').slice(5);
    var mode = $(this).val();
    socket.json.emit('audioCtrl_from_client', {
      type: type,
      target: targetId,
      mode: mode
    });
  });
});

$(function() {
  $(document).on('click', '.bufferSize', function(){
    var type = $(this).attr('name').substr(0,4);
    var targetId = $(this).attr('name').slice(5);
    var mode = $('input[name="rate_' + targetId + '"]:checked').val();
    socket.json.emit('audioCtrl_from_client', {
      type: type,
      target: targetId,
      mode: mode
    });
  });
});

$(function() {
  $(document).on('change', '.bpm', function(){
    var targetId = $(this).attr('name').slice(5);
    var seqBPM = $(this).val();
//    $('.bpm_txt').html(seqBPM);
    var sendval;
    if(seqBPM === "0") {
      sendval = 0;
    } else {
      sendval = Math.floor(15000/seqBPM);
    }
    socket.json.emit('modeCtrl_from_client', {
      type: "BPM",
      target: targetId,
      mode: sendval
    });
  });
});

$(function() {
  $(document).on('click', '.oneshot', function(){
    var id = $(this).attr('id');
    var type = id.substr(8,4);
    var target = id.slice(13);
    var src = $(this).attr('name');
    socket.emit('oneshotCtrl_from_client', {
      type: type,
      src: src,
      target: target
    });
  });
});


$(function() {
  $(document).on('click', '#fileSend', function(){
    var url = "./public/files/" + $('#fileName').val();
    var target = $(this).attr('name');
    socket.emit('importReq_from_client', {
      target: target,
      url: url
    });
  });
});

$(function() {
  $(document).on('change', '.file_select', function(){
    console.log('ch');
    if($(this).val() != ""){
    var url = "./public/files/" + $(this).val();
    var target = $(this).attr('name');
    var type = $(this).attr('id');
    socket.emit('importReq_from_client', {
      target: target,
      type: type,
      url: url
    });
    }
  });
});

$(function() {
  $(document).on('click', '.recorder', function(){
    var val = $(this).prop('checked');
    socket.emit('recorderCtrl_from_client', val);
  });
});

$(function() {
  $(document).on('click', '.consoleCtrl', function(){
    var ctrl = $(this).prop('checked');
    socket.json.emit('debug_from_client', {
      type: "streamconsole",
      consoleCtrl: ctrl
    });
  });
});

$(function() {
  $(document).on('click', '#reset', function(){
    var type = $(this).attr('name');
    socket.emit('debugCtrl_from_client', {type:type});
  });
});

$(function() {
  $(document).on('click', '#vlChk', function(){
    socket.emit('debugCtrl_from_client', {type:"valueCheck"});
  });
});

