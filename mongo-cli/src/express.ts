import { findData, insertData } from "./mongo";

import express from 'express';
import multer from 'multer';

const app = express();

const upload = multer({ dest: 'uploads/' });

app.post('/insert', upload.array('files'), (req, res, next) => {
    console.log(req.files); // ファイル情報がここに格納されます
    res.status(200).send("Files uploaded successfully.");
});

app.listen(3000, () => console.log('App is listening on port 3000'));
