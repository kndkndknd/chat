import { ioState } from "../../state/states/ioState";
import { clientState, cmdState, streamState } from "../../state";
import { streamList, parameterList, streamsRedis } from "../../data";
import { cmdEmit } from "../cmdEmit";
import { sinewaveEmit } from "../sinewaveEmit";
import { parameterChange } from "../../parameterChange";

import { putCmd } from "../putCmd";
import { stringEmit } from "../../socket/ioEmit";
// import { putString } from "./putString";

// import { insertStream } from "../../mongoAccess/insertStream";
// import { findStream } from "../../mongoAccess/findStream";
import { stopEmit } from "../stopEmit";
import { numTarget } from "./numTarget";
import { fadeCmd } from "./fadeCmd";
import { splitStop } from "./splitStop";
import { solo } from "./solo";
import { splitPaTarget } from "./splitPaTarget";

import { recordEmit, recordAsOtherEmit } from "../../stream/recordEmit";
import { chatPreparation } from "../../stream/chatPreparation";
import { streamEmit } from "../../stream/streamEmit";
import { helpPrint } from "../help";
import { getLiveStream } from "../../stream/getLiveStream";
import { getTimeLine } from "./getTimeLine";
import { connectTest, switchCramp } from "../../arduinoAccess/arduinoAccess";
// import { uploadStreamModule } from "../../stream/uploadModule/uploadStream";
import { uploadStream } from "../../stream/uploadModule/uploadStream";
import { voiceEmit } from "../voiceEmit";

import { loadScenario } from "../../scenario/loadScenario";
import { execScenario } from "../../scenario/execScenario";
import { bufferSizeChange } from "../../stream/bufferSizeChange";
import { modulationByBPM } from "./modulationByBPM";

import { putLogFile } from "../../logging/putLogFile";
import { text } from "stream/consumers";
import { splitQuantize } from "./splitQuantize";

import { scheduleSplitCmd } from "../../schedule/scheduleSplitCmd";
import { getScheduleFromSplitSpace } from "../../schedule/getScheduleFromSplitSpace";
import { deleteLog } from "../../logging/deleteLog";
import { getTypeArr } from "./getTypeArr";

import { initRedis } from "../../redis/initRedis";

import { splitRandomRate } from "./splitRandomRate";
import { splitModulation } from "./splitModulation";
import { splitArduino } from "./splitArduino";
import { splitVoskCmd } from "./splitVoskCmd";
import { splitRotate } from "./splitRotate";
import { splitToPostgres } from "./splitToPostgres";
import { splitPlaybackWithIndex } from "./splitPlaybackWithIndex";


export const splitSpace = async (
  stringArr: Array<string>,
  // state: cmdStateType,
  source?: string,
) => {
  const arrTypeArr = getTypeArr(stringArr);
  // console.log(arrTypeArr)
  // console.log(stringArr)

  if (arrTypeArr[0] === "number") {
    numTarget(stringArr, arrTypeArr);
    if (stringArr[1] !== "VOICE") {
      voiceEmit(
        stringArr.slice(1).join(" "),
        source !== undefined ? source : "all",
      );
    }
  } else if (Object.keys(parameterList).includes(stringArr[0])) {
    // RANDOMのみRATEとSTREAMがあるので個別処理
    if (stringArr[0] === "RANDOM") {
      splitRandomRate(stringArr);
    } else if (stringArr[0] === "VOICE") {
      //  } else if (stringArr[0] === 'VOICE' && stringArr.length === 2 && arrTypeArr[1] === 'string') {
      if (stringArr[1] === "JA" || stringArr[1] === "JP") {
        cmdState.voiceLang = "ja-JP";
        stringEmit("VOICE: ja-JP");
        if (stringArr.length > 2) {
          const voiceText = stringArr.slice(2).join(" ");
          if (source !== undefined) {
            voiceEmit(voiceText, source);
          } else {
            voiceEmit(voiceText, "all");
          }
        }
      } else if (stringArr[1] === "EN" || stringArr[1] === "US") {
        cmdState.voiceLang = "en-US";
        stringEmit("VOICE: en-US");
        if (stringArr.length > 2) {
          const voiceText = stringArr.slice(2).join(" ");
          if (source !== undefined) {
            voiceEmit(voiceText, source);
          } else {
            voiceEmit(voiceText, "all");
          }
        }
      } else {
        const voiceText = stringArr.slice(1).join(" ");
        if (source !== undefined) {
          voiceEmit(voiceText, source);
        } else {
          voiceEmit(voiceText, "all");
        }
      }
    } else {
      let argVal: number;
      let argProp: string;
      console.log(stringArr);
      console.log(arrTypeArr);
      if (stringArr.length === 2 && arrTypeArr[1] === "number") {
        argVal = Number(stringArr[1]);
      } else if (stringArr.length === 2 && arrTypeArr[1] === "string") {
        argProp = stringArr[1];
      } else if (stringArr.length === 3) {
        if (arrTypeArr[1] === "string" && arrTypeArr[2] === "number") {
          argProp = stringArr[1];
          argVal = Number(stringArr[2]);
        } else if (
          stringArr[0] === "BPM" &&
          arrTypeArr[1] === "number" &&
          arrTypeArr[2] === "number"
        ) {
          argProp = stringArr[1];
          argVal = Number(stringArr[2]);
        }
      }
      parameterChange(parameterList[stringArr[0]], {
        value: argVal,
        property: argProp,
      });
      // stringEmit(io, stringArr[0] + " " + stringArr[1]);
    }
  } else if (stringArr[0] === "ALL") {
    voiceEmit(stringArr.join(" "), source !== undefined ? source : "all");

    if (arrTypeArr[1] === "string" && !streamList.includes(stringArr[1])) {
      clientState.cmdClient.forEach((client, index) => {
        cmdEmit(stringArr[1], client);
      });
      // Object.keys(clientState.client).forEach((target) => {
      //   cmdEmit(stringArr[1], io, target);
      // });
    } else if (arrTypeArr[1] === "number") {
      clientState.cmdClient.forEach((client, index) => {
        // Object.keys(clientState.client).forEach((target) => {
        sinewaveEmit(Number(stringArr[1]), client);
      });
    } else if (streamList.includes(stringArr[1])) {
      streamState.target[stringArr[1]] = [];
      streamEmit(stringArr[1]);
    } else if (stringArr[1] === "CHAT") {
      streamState.target["CHAT"] = clientState.streamClient;
      chatPreparation();
    }
  } else if (
    stringArr[0] === "BUFFER" ||
    (stringArr[0] === "BUFFERSIZE" && arrTypeArr[1] === "number")
  ) {
    const input = Number(stringArr[1]);
    streamState.basisBufferSize = bufferSizeChange(input);
    stringEmit(`BufferSize: ${streamState.basisBufferSize}`);
  } else if (
    (stringArr[1] === "CHAT" ||
      (streamList.includes(stringArr[1]) && stringArr[0] !== "GET")) &&
    (stringArr[0].includes("-") || arrTypeArr[0] === "number")
  ) {
    console.log("route", stringArr);
    const targetArr = stringArr[0].split("-");
    if (
      targetArr.length > 1 &&
      targetArr.every((el) => {
        return !isNaN(Number(el)) && el !== "";
      })
    ) {
      console.log("targetArr", targetArr);
      const targetIdArr = targetArr.map((el) => {
        return Object.keys(clientState.client)[Number(el)];
      });
      console.log("targetIdArr", targetIdArr);
      streamState.target[stringArr[1]] = targetIdArr;
      console.log(streamState.target);
      if (stringArr[1] === "CHAT") {
        console.log("debug");
        chatPreparation();
      } else {
        streamEmit(stringArr[1]);
      }
    }
  } else if (stringArr[0] === "CLEAR") {
    if (stringArr[1] === "BUFFER") {
      const allKeys = await streamsRedis.getAllKeys();
      for (const stream of allKeys) {
        if (
          stream !== "CHAT" &&
          stream !== "EMPTY" &&
          stream !== "KICK" &&
          stream !== "SNARE" &&
          stream !== "HAT"
        ) {
          await streamsRedis.clear(stream);
        }
      }
    } else if (streamList.includes(stringArr[1])) {
      await streamsRedis.clear(stringArr[1]);
    } else if (stringArr[1] === "INDEX") {
      const allKeys = await streamsRedis.getAllKeys();
      for (const stream of allKeys) {
        await streamsRedis.setIndex(stream, 0);
      }
    }
    // } else if (stringArr[0] === "FADE" && Object.keys(cmdList).includes(stringArr[1])) {
  } else if (stringArr[0] === "FADE") {
    fadeCmd(stringArr, arrTypeArr);
    voiceEmit(stringArr.join(" "), source);
  } else if (
    stringArr[0] === "GAIN" &&
    stringArr.length === 3 &&
    Object.keys(cmdState.GAIN).includes(stringArr[1]) &&
    arrTypeArr[2] === "number"
  ) {
    cmdState.GAIN[stringArr[1]] = Number(stringArr[2]);
    console.log(cmdState.GAIN);
    stringEmit(stringArr[1] + " GAIN: " + stringArr[2]);
    // 動作確認用
  } else if (
    stringArr[0] === "GAIN" &&
    Object.keys(cmdState.GAIN).includes(stringArr[1])
  ) {
    if (stringArr.length === 3 && arrTypeArr[2] === "number") {
      cmdState.GAIN[stringArr[1]] = Number(stringArr[2]);
    }
    stringEmit(
      `${stringArr[1]} GAIN: ${String(cmdState.GAIN[stringArr[1]])}`,
      true,
    );

    // } else if (stringArr[0] === 'FIND' && stringArr.length === 3) {
    // findStream(stringArr[1], stringArr[2], io);
  } else if (stringArr[0] === "GET" || stringArr[0] === "YOUTUBE") {
    // if(stringArr[1] === "BUSHBASH") {
    //   stringEmit(io, "GETTING BUSHBASH MEMORY...", true);
    //   const result = await getStream("BUSHBASH");
    //   console.log("get bushbash memory", result);
    //   if(streams["BUSHBASH"] === undefined) {
    //     pushStateStream("BUSHBASH", true);
    //     streams.BUSHBASH = {
    //       audio: [],
    //       video: [],
    //       index: 0,
    //       bufferSize: streamState.basisBufferSize,
    //     };
    //   }
    //   await result.forEach((record) => {
    //     streams.BUSHBASH.video.push(record.video);
    //     streams.BUSHBASH.audio.push(decodeAudio(record.audio));
    //   });

    //   if(result.length > 0) {
    //     stringEmit(io, "GET BUSHBASH MEMORY: SUCCESS");
    //   } else {
    //     stringEmit(io, "GET BUSHBASH MEMORY: FAILED");
    //   }
    // } else {
      stringEmit(`GETTING ${stringArr.slice(1).join(" ")}...`, true);
      if (stringArr[1] === "LIVESTREAM") {
        if (stringArr.length === 2) {
          const result = await getLiveStream("LIVESTREAM");
          console.log("get livestream", result);
          if (result) {
            stringEmit("GET LIVESTREAM: SUCCESS");
          } else {
            stringEmit("GET LIVESTREAM: FAILED");
          }
        } else {
          const qWord = stringArr.slice(1).join(" ");
          console.log("qWord", qWord);
          const result = await getLiveStream("LIVESTREAM", qWord);
          console.log("get livestream", result);
          if (result) {
            stringEmit("GET LIVESTREAM: SUCCESS");
          } else {
            stringEmit("GET LIVESTREAM: FAILED");
          }
        }
      } else {
        const result = await getLiveStream(stringArr[1]);
        console.log("get livestream as ", stringArr[1], result);
        if (result) {
          stringEmit("GET LIVESTREAM: SUCCESS");
        } else {
          stringEmit("GET LIVESTREAM: FAILED");
        }
      }
    // }
  } else if (stringArr[0] === "HELP") {
    helpPrint(stringArr.slice(1));
  } else if (stringArr[0] === "INSERT" || stringArr[0] === "FIND") {
    splitToPostgres(stringArr, arrTypeArr);

    /*
    if (
      stringArr.length === 2 &&
      Object.keys(state.stream.sampleRate).includes(stringArr[1])
    ) {
      insertStream(stringArr[1], io);
    }
    */
  // } else if (
  //   (stringArr[0] === "JOIN" ||
  //     stringArr[0] === "OFFER" ||
  //     stringArr[0] === "ANSWER") &&
  //   stringArr[1] === "ALL"
  // ) {
  //   console.log(`${stringArr[0]} ALL clients to WebRTC room`);
  //   if (stringArr[0] === "JOIN") {
  //     Object.keys(clientState.client).forEach((id) => {
  //       joinOrLeave("JOIN", io, id);
  //     });
  //   } else if (stringArr[0] === "OFFER") {
  //     Object.keys(clientState.client).forEach((id) => {
  //       offerReq(io, id);
  //     });
  //   } else if (stringArr[0] === "ANSWER") {
  //     Object.keys(clientState.client).forEach((id) => {
  //       answerReq(io, id);
  //     });
  //   }
  } else if (stringArr[0] === "LOG") {
    if (
      stringArr[1] === "FILE" ||
      stringArr[1] === "PUT" ||
      stringArr[1] === "EXPORT"
    ) {
      const result = await putLogFile();
      if (result) {
        stringEmit("LOG: PUT SUCCESS");
      } else {
        stringEmit("LOG: PUT FAILED");
      }

      // console.log(result);
      // if(result) {
      //   stringEmit(io, "LOG: SUCCESS");
      // } else {
      //   stringEmit(io, "LOG: FAILED");
      // }
    } else if (stringArr[1] === "IMPORT") {
      const result = getScheduleFromSplitSpace(stringArr);
      if (!result) {
        stringEmit("LOG: IMPORT FAILED");
      }
    } else if (stringArr[1] === "CLEAR") {
      deleteLog();
    }
  } else if (stringArr[0] === "PA") {
    splitPaTarget(stringArr, arrTypeArr);
  } else if (stringArr[0] === "PLAYBACK" && arrTypeArr[1] === "number") {
    splitPlaybackWithIndex(Number(stringArr[1]));

  } else if (stringArr[0] === "QUANTIZE") {
    splitQuantize(stringArr.splice(1));
  } else if (
    stringArr[0] === "RECORD" &&
    stringArr[1] === "AS" &&
    stringArr.length === 3
  ) {
    recordAsOtherEmit(stringArr[2]);
  } else if (stringArr[0] === "REDIS") {
    if (stringArr[1] === "CLEAR") {
      await initRedis();
      stringEmit("REDIS CLEARED");
    }
  } else if (stringArr[0] === "ROTATE") {
    splitRotate("rotation", stringArr.splice(1));
  } else if (stringArr[0] === "SCENARIO" || stringArr[0] === "START") {
    const scenario = await loadScenario(stringArr[1]);
    await execScenario(scenario);
  } else if (stringArr[1] === "SOLO") {
    solo(stringArr, arrTypeArr);
  } else if (stringArr[0] === "STOP") {
    voiceEmit(stringArr.join(" "), source);

    splitStop(stringArr);
    // } else if (stringArr[0] === "FADE") {
  } else if (stringArr[0] === "SWITCH" || stringArr[0] === "ARDUINO") {
    splitRotate("vibration", stringArr.splice(1));
    // splitArduino(stringArr);
  } else if (stringArr[0] === "TIMELAPSE") {
    console.log("timelapse split", stringArr[1]);
    if (stringArr[1] === "FALSE" || stringArr[1] === "OFF") {
      ioState?.io.emit("timelapseFromServer", {
        cmd: "FALSE",
      });
    } else if (stringArr[1] === "TRUE" || stringArr[1] === "ON") {
      ioState?.io.emit("timelapseFromServer", {
        cmd: "TRUE",
      });
    } else if (stringArr[1] === "GET" || stringArr[1] === "FETCH") {
      ioState?.io.emit("timelapseFromServer", {
        cmd: "GET",
      });
    }
  } else if (stringArr[0] === "UPLOAD" && stringArr.length == 2) {
    voiceEmit(stringArr.join(" "), source);

    // const uploadResult = await uploadStream(stringArr);
    // uploadStream(stringArr, io);
    const result = await uploadStream(stringArr);
    console.log(result);
    stringEmit(result, true);
  } else if (stringArr[0] === "VOSK") {
    splitVoskCmd(stringArr.splice(1), arrTypeArr.splice(1));
  } else if (stringArr[0].includes(":")) {
    scheduleSplitCmd(stringArr, source);
  } else if (
    arrTypeArr[1] === "number" &&
    (stringArr[0] === "MODULATION" || stringArr[0] === "MOD")
  ) {
    splitModulation(stringArr, arrTypeArr);
  } else {
    stringEmit(stringArr.join(" "), false);
    if (cmdState.VOICE.length > 0) {
      console.log("voiceEmit split space");
      voiceEmit(stringArr.join(" "), "scenario");
    }
  }
};
