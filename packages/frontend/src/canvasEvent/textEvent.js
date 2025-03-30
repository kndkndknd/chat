import { canvasElement } from "./canvasElement";
import { flagState } from "../state";
import * as emoji from "node-emoji";
export function textPrint(text, stx = canvasElement.ctx, strCnvs = canvasElement.cnvs, clear) {
    stx.clearRect(0, 0, strCnvs.width, strCnvs.height);
    // if (clear) {
    //   stx.clearRect(0, 0, strCnvs.width, strCnvs.height);
    // } else {
    //   stx.fillStyle = "white";
    //   stx.fillRect(0, 0, strCnvs.width, strCnvs.height);
    // }
    console.log("textPrint", text);
    if (!flagState.emoji) {
        print(text, stx, strCnvs);
    }
    else {
        print(emoji.random().emoji, stx, strCnvs);
    }
    /*
    if (hlsElement.played.length > 0) {
      setTimeout(() => {
        eraseText(stx, strCnvs);
      }, 100);
    }
    */
}
export function eraseText(stx = canvasElement.ctx, strCnvs = canvasElement.cnvs) {
    stx.clearRect(0, 0, strCnvs.width, strCnvs.height);
}
export function clearTextPrint(text, stx = canvasElement.ctx, strCnvs = canvasElement.cnvs) {
    stx.clearRect(0, 0, strCnvs.width, strCnvs.height);
    print(text, stx, strCnvs);
}
export function erasePrint(ctx = canvasElement.ctx, cnvs = canvasElement.cnvs) {
    ctx.clearRect(0, 0, cnvs.width, cnvs.height);
    //  ctx.fillStyle = 'white';
    //  ctx.fillRect(0, 0, cnvs.width, cnvs.height);
}
const print = (text, target, cnvs = canvasElement.cnvs) => {
    console.log("print: ", text);
    let fontSize = 20;
    let zenkakuFlag = false;
    target.globalAlpha = 1;
    target.fillStyle = "black";
    //if(darkFlag) target.fillStyle = "white"
    let textArr = [text];
    let textLength = 0;
    Array.prototype.forEach.call(text, (s, i) => {
        let chr = text.charCodeAt(i);
        if ((chr >= 0x00 && chr < 0x81) ||
            chr === 0xf8f0 ||
            (chr >= 0xff61 && chr < 0xffa0) ||
            (chr >= 0xf8f1 && chr < 0xf8f4)) {
            textLength += 1;
        }
        else {
            textLength += 2;
            zenkakuFlag = true;
        }
    });
    if (textLength > 20) {
        if (zenkakuFlag) {
            fontSize = Math.floor((cnvs.width * 4) / 3 / 24);
        }
        else {
            fontSize = Math.floor((cnvs.width * 4) / 3 / 18);
        }
        textArr = [""];
        let lineNo = 0;
        Array.prototype.forEach.call(text, (element, index) => {
            if (index % 16 > 0 || index === 0) {
                textArr[lineNo] += element;
            }
            else {
                textArr.push(element);
                lineNo += 1;
            }
        });
    }
    else if (textLength > 2) {
        fontSize = Math.floor((cnvs.width * 4) / 3 / textLength);
    }
    else {
        fontSize = Math.floor((cnvs.height * 5) / 4 / textLength);
    }
    target.font = "bold " + String(fontSize) + "px 'Arial'";
    target.textAlign = "center";
    target.textBaseline = "middle";
    target.strokeStyle = "white";
    if (textArr.length === 1) {
        target.strokeText(text, cnvs.width / 2, cnvs.height / 2);
        target.fillText(text, cnvs.width / 2, cnvs.height / 2);
    }
    else {
        textArr.forEach((element, index) => {
            target.strokeText(element, cnvs.width / 2, cnvs.height / 2 + fontSize * (index - Math.round(textArr.length / 2)));
            target.fillText(element, cnvs.width / 2, cnvs.height / 2 + fontSize * (index - Math.round(textArr.length / 2)));
        });
    }
    target.restore();
};
export function emojiState(state) {
    flagState.emoji = state;
}
