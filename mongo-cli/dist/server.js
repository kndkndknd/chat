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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const multer_1 = __importDefault(require("multer"));
const app = (0, express_1.default)();
const upload = (0, multer_1.default)();
app.use(body_parser_1.default.text({ type: "application/text" }));
app.post("/api/stream", upload.fields([{ name: "json" }, { name: "floatArray" }]), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // JSONデータの処理
    const json = JSON.parse(req.body.json);
    /*
    if (
      !req.files ||
      !req.files["floatArray"] ||
      req.files["floatArray"].length === 0
    ) {
      res.status(400).send("no files received");
      return;
    }
    */
    const parts = req.files;
    const buffer = parts["floatArray"];
    const audio = new Float32Array(req.files["floatArray"][0].buffer.buffer);
    // バイナリデータの処理
    // const binary = req.files?.[0]?.buffer;
    /*
  const binary = req.file
  const audio = new Float32Array(binary);
  */
    console.log(audio);
    console.log(json);
    // 処理結果を返す
    res.send(`JSON: ${JSON.stringify(json)}, Binary: ${audio}`);
}));
app.listen(3000, () => {
    console.log("Server started on port 3000");
});
