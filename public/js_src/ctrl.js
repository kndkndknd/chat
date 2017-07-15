//socket.emit("connectFromClient","ctrl");

socket.on("statusFromServer", (data) =>{
/*  let pockeId = statusJoin(data["connected"]["pocke"]);
  let okappachanId = statusJoin(data["connected"]["okappachan"]);
  $("#idList").text("pocke:"+ pockeId["connected"] + ", okappachan:" + okappachanId["connected"]);*/
  connectedIdView(data["connected"]);
  sampleRateView(data["sampleRate"]);
  cmdView(data["cmd"]);
});

//チェックボックス操作
$(function() {
  $(document).on('change', '.checkbox', () =>{
    console.log($(this).attr('id'));
    let json = {"okappachan": $("[name=okappachan]").prop("checked"),"pocke": $("[name=pocke]").prop("checked")}
    socket.emit('targetCtrl_from_client', json);
  });
});

const sampleRateView = (sampleRate) => {
  for(let key in sampleRate){
    $('#' + key).text(key + ": " + sampleRate[key]);
  }
}
const cmdView = (cmdStatus) => {
  //現状の実施コマンド記載
  $('#cmd li').remove();
  for(let key in cmdStatus["now"]){
    //liをappendしていく。key: valueの形で
    if(key === "unmute"){

    } else {
      $('#cmd').append('<li>' + key + ':' + cmdStatus["now"][key] + '</li>');
    }
  }
  //前回コマンド記載
  $('#prevCmd').text(cmdStatus["prevCmd"]);
  $('#cmdTimeLine').text(cmdStatus["prevTime"]);
}

const connectedIdView = (connected) => {
  $("#status li").remove();

  let okappachanIds = "おかっぱちゃんハウス: " + joinIds(connected["okappachan"]);
  let pockeIds = "pocke: " + joinIds(connected["pocke"]);
  $("#status").append("<li>" + okappachanIds +"</li>");
  $("#status").append("<li>" + pockeIds +"</li>");
}

const joinIds = (room) => {
  let connectedString = "";
  for(let key in room) {
    if(room[key]) {
      connectedString = connectedString + key + " ";
    }
  }
  return connectedString;
}
/*
やりたいことリスト
コマンドをRoom単位で実施（両方実施も可能に）するようチェックボックスを設置
コマンド入力・実施はいつも通り（Canvasをいつもの四分の一くらいにしたい）
前回コマンドの表示
状態の表示（いまなにが実行されているか）
どのクライアントからの受信が何分前にあったかの表示
できればコマンド時に受信したことをサーバに返す仕組みにしておきたい
*/
