"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadStream = exports.pushStateStream = exports.pcm2arr = void 0;
var states_1 = require("./states");
var pcm = require('pcm');
var fs = require('fs');
var util = require('util');
var exec = require('child_process').exec;
var readDir = util.promisify(fs.readdir);
var readFile = util.promisify(fs.readFile);
var execPromise = util.promisify(exec);
var pcm2arr = function (url) {
    var tmpBuff = new Float32Array(states_1.basisBufferSize);
    var rtnBuff = [];
    var i = 0;
    pcm.getPcmData(url, { stereo: true, sampleRate: 44100 }, function (sample, channel) {
        tmpBuff[i] = sample;
        i++;
        if (i === states_1.basisBufferSize) {
            rtnBuff.push(tmpBuff);
            tmpBuff = new Float32Array(states_1.basisBufferSize);
            i = 0;
        }
    }, function (err, output) {
        if (err) {
            console.log("err");
            throw new Error(err);
        }
        console.log('pcm.getPcmData(' + url + '), {stereo: true, sampleRate: 44100}, (sample, channel)=>{function}');
    });
    return rtnBuff;
};
exports.pcm2arr = pcm2arr;
var pushStateStream = function (streamName, states) {
    states.current.stream[streamName] = false;
    states.previous.stream[streamName] = false;
    states.stream.sampleRate[streamName] = 44100;
    states.stream.glitch[streamName] = false;
    states.stream.grid[streamName] = false;
    states.stream.latency[streamName] = 1000;
    states.stream.random[streamName] = false;
    states.stream.randomrate[streamName] = false;
};
exports.pushStateStream = pushStateStream;
var uploadStream = function (stringArr, io) { return __awaiter(void 0, void 0, void 0, function () {
    var timeArr, timeArr, files, _loop_1, i, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                //  let ss = "00:00:00"
                //  let t = "00:00:20"
                switch (stringArr.length) {
                    case 4:
                        if (stringArr[3].includes(":")) {
                            timeArr = stringArr[3].split(":");
                            if (timeArr.length === 3) {
                                states_1.uploadParams.t = stringArr[3];
                            }
                            else if (timeArr.length === 2) {
                                states_1.uploadParams.t = "00:" + stringArr[3];
                            }
                        }
                    case 3:
                        if (stringArr[2].includes(":")) {
                            timeArr = stringArr[2].split(":");
                            if (timeArr.length === 3) {
                                states_1.uploadParams.ss = stringArr[2];
                            }
                            else if (timeArr.length === 2) {
                                states_1.uploadParams.ss = "00:" + stringArr[2];
                            }
                        }
                        else if (stringArr[2] === "FULL") {
                            states_1.uploadParams.t = "FULL";
                            states_1.uploadParams.ss = "FULL";
                        }
                        break;
                    case 2:
                        break;
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 7, , 8]);
                return [4 /*yield*/, readDir(states_1.uploadParams.mediaDir)];
            case 2:
                files = _a.sent();
                _loop_1 = function (i) {
                    var f, streamName_1, fSplit_1, tmpBuff_1, rtnBuff, i_1, _b, sndConvert, imgConvert, files_1, jpgs_1;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                f = files[i];
                                if (!(f != undefined && f.split(".")[0] === stringArr[1])) return [3 /*break*/, 10];
                                console.log(f);
                                streamName_1 = stringArr[1];
                                fSplit_1 = f.split(".");
                                if (!(streamName_1 in states_1.streams)) {
                                    states_1.streams[streamName_1] = { audio: [], video: [], bufferSize: states_1.basisBufferSize };
                                }
                                tmpBuff_1 = new Float32Array(states_1.basisBufferSize);
                                rtnBuff = [];
                                i_1 = 0;
                                _b = fSplit_1[1].toLowerCase();
                                switch (_b) {
                                    case "mov": return [3 /*break*/, 1];
                                    case "mp4": return [3 /*break*/, 1];
                                    case "aac": return [3 /*break*/, 7];
                                    case "m4a": return [3 /*break*/, 7];
                                    case "mp3": return [3 /*break*/, 7];
                                    case "wav": return [3 /*break*/, 7];
                                    case "aif": return [3 /*break*/, 7];
                                    case "aiff": return [3 /*break*/, 7];
                                }
                                return [3 /*break*/, 9];
                            case 1:
                                sndConvert = "";
                                imgConvert = "";
                                sndConvert = 'ffmpeg -i ' + states_1.uploadParams.mediaDir + f + ' -vn -acodec aac ' + states_1.uploadParams.mediaDir + fSplit_1[0] + '.aac';
                                imgConvert = 'ffmpeg -i ' + states_1.uploadParams.mediaDir + f + ' -r 5.4 -f image2 "' + states_1.uploadParams.mediaDir + fSplit_1[0] + '%06d.jpg"';
                                if (states_1.uploadParams.ss !== "FULL" && states_1.uploadParams.t !== "FULL") {
                                    sndConvert = sndConvert + ' -ss ' + states_1.uploadParams.ss + ' -t ' + states_1.uploadParams.t;
                                    imgConvert = imgConvert + ' -ss ' + states_1.uploadParams.ss + ' -t ' + states_1.uploadParams.t;
                                }
                                return [4 /*yield*/, execPromise(sndConvert)];
                            case 2:
                                _c.sent();
                                return [4 /*yield*/, execPromise(imgConvert)
                                    // let j = 0
                                ];
                            case 3:
                                _c.sent();
                                // let j = 0
                                return [4 /*yield*/, pcm.getPcmData(states_1.uploadParams.mediaDir + streamName_1 + ".aac", { stereo: true, sampleRate: 22050 }, function (sample, channel) {
                                        tmpBuff_1[i_1] = sample;
                                        i_1++;
                                        if (i_1 === states_1.basisBufferSize) {
                                            // rtnBuff.push(tmpBuff);
                                            //console.log(tmpBuff)
                                            console.log("push audio buff");
                                            states_1.streams[streamName_1].audio.push(tmpBuff_1);
                                            /*
                                            if(streams[streamName].length === 0) {
                                              streams[streamName].push({audio:tmpBuff, bufferSize: basisBufferSize})
                                              console.log(streams[streamName][streams[streamName].length-1].bufferSize)
                                            } else {
                                              // if(streams[streamName].length >= j+1 && streams[streamName][j].video !== undefined) {
                                              if(streams[streamName].length >= j+1) {
                                                streams[streamName][j].audio = tmpBuff
                                                streams[streamName][j].bufferSize = basisBufferSize
                                              console.log(streams[streamName][j].bufferSize)
                                              }
                                              j++
                                            }
                                            */
                                            tmpBuff_1 = new Float32Array(states_1.basisBufferSize);
                                            i_1 = 0;
                                        }
                                    }, function (err, output) {
                                        if (err) {
                                            console.log("err");
                                            throw new Error(err);
                                        }
                                        // streams[streamName].push({audio:rtnBuff})
                                        console.log('pcm.getPcmData(' + streamName_1 + '.aac, { stereo: true, sampleRate: 44100 })');
                                        //                console.log(streams[streamName].audio.length);
                                        execPromise("rm " + states_1.uploadParams.mediaDir + streamName_1 + ".aac");
                                    })];
                            case 4:
                                // let j = 0
                                _c.sent();
                                return [4 /*yield*/, readDir(states_1.uploadParams.mediaDir)];
                            case 5:
                                files_1 = _c.sent();
                                jpgs_1 = [];
                                return [4 /*yield*/, files_1.forEach(function (file) { return __awaiter(void 0, void 0, void 0, function () {
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0:
                                                    if (!(file.includes(fSplit_1[0]) && file.includes('.jpg'))) return [3 /*break*/, 2];
                                                    return [4 /*yield*/, jpgs_1.push(file)];
                                                case 1:
                                                    _a.sent();
                                                    _a.label = 2;
                                                case 2: return [2 /*return*/];
                                            }
                                        });
                                    }); })];
                            case 6:
                                _c.sent();
                                // console.log(jpgs)
                                // const jpgs = await readDir(uploadParams.mediaDir);
                                jpgs_1.forEach(function (element) { return __awaiter(void 0, void 0, void 0, function () {
                                    var img, base64str;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, readFile(states_1.uploadParams.mediaDir + element)];
                                            case 1:
                                                img = _a.sent();
                                                return [4 /*yield*/, new Buffer(img).toString('base64')
                                                    // console.log(base64str)
                                                ];
                                            case 2:
                                                base64str = _a.sent();
                                                // console.log(base64str)
                                                states_1.streams[streamName_1].video.push('data:image/jpeg;base64,' + String(base64str));
                                                return [4 /*yield*/, execPromise('rm ' + states_1.uploadParams.mediaDir + element)];
                                            case 3:
                                                _a.sent();
                                                io.emit('stringsFromServer', { strings: "UPLOADED", timeout: true });
                                                return [2 /*return*/];
                                        }
                                    });
                                }); });
                                /*
                                if(streams[streamName].length === 0) {
                                  jpgs.forEach(async (element) => {
                                    const img = await readFile(uploadParams.mediaDir + element)
                                    const base64str = await new Buffer(img).toString('base64')
                                    // console.log(base64str)
                                    streams[streamName].push('data:image/jpeg;base64,' + String(base64str))
                                    await execPromise('rm ' + uploadParams.mediaDir + element)
                                    io.emit('stringsFromServer',{strings: "UPLOADED", timeout: true})
                                    
                                  })
                                } else {
                                  await streams[streamName].forEach(async (element, index) => {
                      //              if(jpgs[j] != undefined && jpgs[j].includes(fSplit[0]) && jpgs[j].includes(".jpg")){
                                    console.log(process.env.HOME + uploadParams.mediaDir + jpgs[index])
                                    const img = await readFile(uploadParams.mediaDir + jpgs[index])
                                    const base64str = await new Buffer(img).toString('base64')
                                    // console.log(base64str)
                                    element.video = 'data:image/jpeg;base64,' + String(base64str)
                                    await execPromise('rm ' + uploadParams.mediaDir + jpgs[index])
                                    io.emit('stringsFromServer',{strings: "UPLOADED", timeout: true})
                                  });
                                  
                                }
                                */
                                console.log("video file");
                                //コマンド、パラメータにUPLOAD対象を追加
                                states_1.streamList.push(streamName_1);
                                (0, exports.pushStateStream)(streamName_1, states_1.states);
                                return [3 /*break*/, 10];
                            case 7: return [4 /*yield*/, pcm.getPcmData(states_1.uploadParams.mediaDir + f, { stereo: true, sampleRate: 22050 }, function (sample, channel) {
                                    tmpBuff_1[i_1] = sample;
                                    i_1++;
                                    if (i_1 === states_1.basisBufferSize) {
                                        states_1.streams[streamName_1].audio.push(tmpBuff_1);
                                        tmpBuff_1 = new Float32Array(states_1.basisBufferSize);
                                        i_1 = 0;
                                    }
                                }, function (err, output) {
                                    if (err) {
                                        console.log("err");
                                        throw new Error(err);
                                    }
                                    console.log('pcm.getPcmData(' + f + ', { stereo: true, sampleRate: 44100 })');
                                    io.emit('stringsFromServer', { strings: "UPLOADED", timeout: true });
                                })];
                            case 8:
                                _c.sent();
                                states_1.streamList.push(streamName_1);
                                (0, exports.pushStateStream)(streamName_1, states_1.states);
                                return [3 /*break*/, 10];
                            case 9:
                                console.log("not media file");
                                io.emit('stringsFromServer', { strings: "NO MEDIA FILE", timeout: true });
                                _c.label = 10;
                            case 10: return [2 /*return*/];
                        }
                    });
                };
                i = 0;
                _a.label = 3;
            case 3:
                if (!(i <= files.length)) return [3 /*break*/, 6];
                return [5 /*yield**/, _loop_1(i)];
            case 4:
                _a.sent();
                _a.label = 5;
            case 5:
                i++;
                return [3 /*break*/, 3];
            case 6:
                console.log(files);
                return [3 /*break*/, 8];
            case 7:
                e_1 = _a.sent();
                console.error(e_1);
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); };
exports.uploadStream = uploadStream;
//# sourceMappingURL=upload.js.map