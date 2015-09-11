
$(function() {
  $(document).on('click', '.oscGain', function(){
    /*
    var targetId = $(this).attr('name');
    */
   var targetId = "all";
    socket.json.emit('oscGain_from_client',{
      target: targetId,
      val: 0.5
    });
    if(targetId == "all"){
      for(var i in feedbackArr){
        $("input[name='" + feedbackArr[i] + "']").val([targetsig]);
      }
    }
  });
});


$(function() {
  $(document).on('change', '.osc_ctrl', function(){
    var type =  $(this).attr('name').substr(4,3);
    var targetId = $(this).attr('name').slice(8);
    var val = $(this).val();
    socket.json.emit('oscCtrl_from_client',{
      type: type,
      target: targetId,
      val: val
    });

    $('input[name="osc_' + type + "_" + targetId + '"]').val(val);
  });
});

$(function() {
  $(document).on('click', '.osc_ctrl_checkbox', function(){
    var type =  $(this).attr('name').substr(4,3); //swt...switch/lrd...latency randomize
    var targetId = $(this).attr('name').slice(8);
    var val = $(this).prop('checked');
    socket.json.emit('oscCtrl_from_client', {
      type: type,
      target: targetId,
      val: val 
    });
  });
});

$(function() {
  $(document).on('click', '.osc_ctrl_radio', function(){
    var type =  $(this).attr('name').substr(4,3);
    var targetId = $(this).attr('name').slice(8);
    var val = $(this).val();
    if(type === 'frd') {
      socket.json.emit('oscCtrl_from_client', {
        type: type,
        target: targetId,
        diffmode: val,
        val: $('#osc_diff_val').val(),
        base: $('#osc_diff_frq').val()
      });
    } else if(type === 'ltc') {
      socket.json.emit('oscCtrl_from_client', {
        type: type,
        target: targetId,
        val: val,
        random: $("#osc_latency_random").prop('checked')
      });
    } else {
    socket.json.emit('oscCtrl_from_client', {
      type: type,
      target: targetId,
      val: val
    });
    }
  });
});

$(function() {
  $(document).on('change', '.osc_prm', function(){
    var val = $(this).val();
    var target = $(this).attr('id');
    $('#' + target + '_txt').html(val);
  });
});
/*
$(function() {
  $(document).on('change', '#osc_diff_val', function(){
    var val = $(this).val();
    $('#osc_diff_val_txt').html(val);
  });
});*/

