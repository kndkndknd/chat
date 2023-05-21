import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import multer from "multer";

const app = express();
const upload = multer();

app.use(bodyParser.text({ type: "application/text" }));

app.post(
  "/api/stream",
  upload.fields([{ name: "json" }, { name: "floatArray" }]),
  async (req: Request, res: Response) => {
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
    const buffer = parts["floatArray"]
    
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
  }
);

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
