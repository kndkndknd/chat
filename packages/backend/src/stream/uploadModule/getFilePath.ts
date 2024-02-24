import * as fs from "fs";
import util from "util";
import * as path from "path";

// const exec = require("child_process").exec;
// var readDir = util.promisify(fs.readdir);
// var readFile = util.promisify(fs.readFile);
// var execPromise = util.promisify(exec);

import {
  streams,
  cmdList,
  streamList,
  parameterList,
  states,
  uploadParams,
  basisBufferSize,
} from "../../states";

export const getFilePath = async (fileString, mediaDirPath) => {
  console.log(uploadParams);
  console.log(mediaDirPath);
  const files = await fs.readdirSync(mediaDirPath);
  // mediaDir内を順番にファイル名スキャン
  for (let i = 0; i <= files.length; i++) {
    let f = files[i];
    //ドット区切りがあり、ドット区切りの手前がstringArr[1]と同じ場合
    if (f != undefined && f.split(".")[0] === fileString) {
      console.log(f);
      return f;
    }
  }
  return "";
};
