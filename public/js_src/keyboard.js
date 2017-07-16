let stringsClient = "";

$(() =>{
  $(document).on("keydown", (e)=> {
    console.log(e.keyCode);
    if(e.keyCode === 188){
      if(standAlone) {
        standAlone = false;
        whitePrint();
        textPrint("network connect");
        setTimeout(()=>{
          whitePrint();
//          textPrint("");
        },300);
      } else {
        standAlone = true;
        whitePrint();
        textPrint("stand alone");
        setTimeout(()=>{
          whitePrint();
//          textPrint("");
        },300);
      }
      socket.emit('standAlonefromClient', standAlone);
    } else if(standAlone){
      let charCode = keycodeMap[String(e.keyCode)];
      if(charCode === "enter"){
        console.log(isNaN(Number(stringsClient)));
        if (isNaN(Number(stringsClient)) === false && stringsClient != "") {
          doCmd({
            "cmd":"SINEWAVE",
            "property": Number(stringsClient)
          });
//          console.log("sinewave stand alone")
        } else {
          doCmd({"cmd":stringsClient});
        }
        stringsClient = "";
      } else if(charCode === "escape") {
        doCmd({"cmd":"STOP"});
        stringsClient = "";
      } else if(charCode === "left_arrow" || charCode === "backspace"){
        stringsClient = "";
        whitePrint();
      } else if(e.keyCode >= 48 && e.keyCode <= 90 || e.keyCode === 190 || e.keyCode === 189 || e.keyCode === 32 || e.keyCode === 16){
        switch(charCode){
          case "C":
            click();
            break;
          case "B":
            bass();
            break;
          case "F":
            doCmd({"cmd":"FEEDBACK"});
            break;
          case "W":
          case "N":
            doCmd({"cmd":"WHITENOISE"})
            break;
          case "S":
            doCmd({"cmd":"SAMPLERATE"});
            break;
          default:
            stringsClient = stringsClient + charCode;
            whitePrint();
            textPrint(stringsClient);
            break;
        }
      }
    } else {
      let charCode = keycodeMap[String(e.keyCode)];
      if(charCode === "left_arrow" || charCode === "backspace"){
        stringsClient = "";
        whitePrint();
      } else if(e.keyCode >= 48 && e.keyCode <= 90 || e.keyCode === 190 || e.keyCode === 189 || e.keyCode === 226 || e.keyCode === 32){
        stringsClient = stringsClient + charCode;
        whitePrint();
        textPrint(stringsClient);
      }
      if(e.keyCode != 16){
        if(e.keyCode === 13 && stringsClient === "VOICE"){
          if(voice){
            voice = false;
            whitePrint();
            textPrint("VOICE OFF");
            stringsClient = "";
            setTimeout(()=>{
              whitePrint();
              charEmit(37);
            },500);
          } else {
            voice = true;
            whitePrint();
            textPrint("VOICE MODE");
            stringsClient = "";
            setTimeout(()=>{
              charEmit(37);
            },500);
          }
//          stringsClient = "";
        } else {
          charEmit(e.keyCode);
        }
      }
      // if(charCode = "enter" && voice && stringsClient != "VOICE") {
      if(charCode === "enter" && voice && stringsClient != "VOICE"){
        ssu.text = stringsClient;
        speechSynthesis.speak(ssu);
        stringsClient = "";
      }
    }
  });
});
