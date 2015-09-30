function list(data) {
  //$('#client').remove();
  //trans feedback
  if(data.transroom != null) {
    $('span').remove("#client");
    for ( var translist in data.transroom) {
      var eMode = '<li><form>emit; <label>all<input type="radio" value="all" name="emit_' + translist + '" class="emit_mode"></label> <label>broadcast<input type="radio" value="broadcast" name="emit_' + translist + '" class="emit_mode"></label> <label>nextdoor<input type="radio" value="nextdoor" name="emit_' + translist + '" class="emit_mode"></label> <label>random<input type="radio" value="random" name="emit_' + translist + '" class="emit_mode"></label> <label>self<input type="radio" value="self" name="emit_' + translist + '" class="emit_mode"></label> <label>noemit<input type="radio" value="no_emit" name="emit_' + translist + '" class="emit_mode"></label></form></li>';
      var rMode ='<li>receive; <input type="checkbox" value="receive" name="recv_' + translist + '" class="checkbox_mode">';
      var pMode =' play<input type="checkbox" value="play" name="play_' + translist + '" class="checkbox_mode">';
      var sMode =' server<input type="checkbox" value="server" name="srvr_' + translist + '" class="checkbox_mode"></li>';
      var sRate = '<li>sample rate: <label><input type="radio" name="rate_' + translist + '" class="sampleRate" value="11025" >11025</label> <label><input type="radio" value="22050" name="rate_' + translist + '" class="sampleRate">22050</label> <label><input type="radio" value="44100" name="rate_' + translist + '" class="sampleRate" checked>44100</label> <label><input type="radio" value="88200" name="rate_' + translist + '" class="sampleRate">88200</label></li>';
      var vMode = '<li><form>screen; <label><input type="radio" value="video" name="scrn_' + translist + '" class="radio_mode">video</label> <label><input type="radio" value="flash" name="scrn_' + translist + '" class="radio_mode">flash</label> <label><input type="radio" value="spectrum" name="scrn_' + translist + '" class="radio_mode">spectrum</label></form></li>';
      var bMode = '<li><form>sequence: <label><input type="range" min="0" max="120" step="1" value="0" class="bpm" name="beat_' + translist + '"></label><span class="bpm_txt" id="beattxt_' + translist + '">0</span></form></li>';
      var oneshot = '<li><span class="oneshot" id="oneshot_trig_' + translist + '">oneshot</span>: <span class="oneshot" id="oneshot_load_' + translist + '" name="recorded">recorded_load</span> <span class="oneshot" id="oneshot_load_' + translist + '" name="fieldrec">fieldrec_load</span> <span class="oneshot" id="oneshot_load_' + translist + '" name="buff">buff_load</span>   <span id="oneshot_status_' + translist + '"></span></li>'
      var oscHead = '<li><span class="osc_view" id="view_' + translist + '">osc</span>: <input type="checkbox" name="osc_swt_' + translist + '" class="osc_ctrl_checkbox"><ul class="osc_prop" id="prop_' + translist + '">';
      var oscVol = '<li>volume;  <input type="text" name="osc_vol_' + translist + '" class="osc_ctrl" size="1" value="0.5"><input type="range" name="osc_vol_' + translist + '" class="osc_ctrl" min="0" max="1" step="0.1" value="0"></li>';
      var oscPitch = '<li>pitch; <input type="text" name="osc_frq_' + translist + '" class="osc_ctrl" size="4" value="440"> <input type="range" name="osc_frq_' + translist + '" class="osc_ctrl" min="20" max="20000" step="1" value="440"></li>';
      var oscPortament = '<li>portament;  <input type="text" name="osc_prt_' + translist + '" class="osc_ctrl" size="4" value="0.1"> <input type="range" name="osc_prt_' + translist + '" class="osc_ctrl" min="0" max="20" step="0.1" value="0.1"></li>';
      //var oscDiff = '<li>difftype; none<input type="radio" value="none" name="osc_frd_' + translist + '" class="osc_ctrl_radio"> modulation<input type="radio" value="mod" name="osc_ptch_diff_' + translist + '" class="osc_ctrl_radio"> harmony<input type="radio" value="hrmn" name="osc_ptch_diff_' + translist + '" class="osc_ctrl_radio"></li><li>val<input type="range" id="osc_diff_val" min="0" max="5" name="osc_dfv_' + translist + '" class="osc_ctrl"> <input type="text" name="osc_dfv_' + translist + '" class="osc_ctrl"></li>';
      var oscFoot = '</ul></li>';

      var appendtxt = '<span id="client"><b>' + data.transroom[translist]["model"] + '</b> ID:' + translist + '<br><ul>' + eMode + rMode + pMode + sMode + sRate + bMode + vMode + oneshot + oscHead + oscVol + oscPitch + oscPortament + oscFoot + '</span></ul></li>';
      //var appendtxt = '<span id="client"><b>' + data.transroom[translist]["model"] + '</b> ID:' + translist + '<br><ul>' + eMode + rMode + pMode + sRate + oneshot + oscHead + oscVol + oscPitch + oscPortament + oscFoot + '</span></ul></li>';
      $('#trans_ctrl').append(appendtxt);
      //emitMode操作
      $('input[name="emit_' + translist + '"]').val([data.transroom[translist]["emitMode"]]);
      //receiveMode操作
      $('input[name="recv_' + translist + '"]').prop('checked',data.transroom[translist]["receiveMode"]);
      //$('.receive_mode').prop('checked',data.transroom[translist]["receiveMode"]);
      //playMode操作
      $('input[name="play_' + translist + '"]').prop('checked',data.transroom[translist]["playMode"]);
      //sampleMode操作
      $('input[name="rate_' + translist + '"]').val([data.transroom[translist]["sampleRate"]]);
      //serverMode操作
      $('input[name="srvr_' + translist + '"]').prop('checked',data.transroom[translist]["serverMode"]);
      //scrnMode操作
      $('input[name="scrn_' + translist + '"]').val([data.transroom[translist]["scrnMode"]]);
      //BPMMode操作
      var aBPM;
      if(data.transroom[translist]["BPMMode"] === 0) {
        aBPM = 0;
      } else {
        aBPM = Math.floor(15000 / data.transroom[translist]["BPMMode"]);
      }
      $('input[name="beat_' + translist + '"]').val(aBPM);
      $('#beattxt_' + translist).text(aBPM);
      //$('#beattxt_' + translist).html("fuck");
    } 
  } else if(data.transroom === {}){
    $('#trans_ctrl').append("no client connected");
  }
  if(data.buffer != null) {
    $('#streamBuff_length').html(String(data.buffer["streamBuff_length"]));
    $('#recordedBuff_name').html(data.buffer["recordedBuff_name"]);
    $('#recordedBuff_length').html(String(data.buffer["recordedBuff_length"]));
    $('#fieldrecBuff_name').html(data.buffer["fieldrecBuff_name"]);
    $('#fieldrecBuff_length').html(String(data.buffer["fieldrecBuff_length"]));
  }
  if(data.selector != null) {
    var selectorArr = data.selector;
    $('.selector').val(data.selector);
  }

  $('.osc_prop').hide();
}

window.addEventListener("keydown", keyDown);

function keyDown(e){
  var key_code = e.keyCode;
  //alert(key_code);
  if(key_code === 83) {
    socket.emit('oneshotCtrl_from_client', {
      type: 'trig',
      target: 'all'
    });
  }
}

function oneshot() {
  var target = '';
  
  $('.oneshot').each( function() {
    if($(this).html("loaded"))
       target = $(this).attr('id').slice(13);
  });
  if(target != "test"){
    socket.emit('oneshotCtrl_from_client', {
      type: 'trig',
      target: target
    });
  } else {
    alert('no loaded client');
  }
}
$(function() {
  $(document).on('click', '.osc_view', function(){
    var targetId = "#prop_" + $(this).attr('id').slice(5);
    $(targetId).toggle();
  });
});


$('.oscillator').hide();
$('.audio_import').hide();
$('.debug').hide();
$('.recorderjs').hide();

$(function() {
  $(document).on('click', '.h1', function(){
    var target = "." +$(this).attr('name');
    $(target).toggle();
  });
});
