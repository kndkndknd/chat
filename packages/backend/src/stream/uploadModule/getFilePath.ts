import * as fs from "fs";
import util from "util";

const exec = require("child_process").exec;
var readDir = util.promisify(fs.readdir);
var readFile = util.promisify(fs.readFile);
var execPromise = util.promisify(exec);

import {
  streams,
  cmdList,
  streamList,
  parameterList,
  states,
  uploadParams,
  basisBufferSize,
} from "../../states";


export const getFilePath = async (fileString) => {
  const files = await readDir(uploadParams.mediaDir);
  // mediaDir内を順番にファイル名スキャン
  for (let i = 0; i <= files.length; i++) {
    let f = files[i];
    //ドット区切りがあり、ドット区切りの手前がstringArr[1]と同じ場合
    if (f != undefined && f.split(".")[0] === fileString) {
      return f
    }
  }
  return "";
}
