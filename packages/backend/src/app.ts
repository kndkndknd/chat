import * as fs from "fs";
import { default as Express } from "express";
import * as path from "path";
import { default as favicon } from "serve-favicon";
import * as Https from "https";
import { ioServer } from "./socket/ioServer";
import { states } from "./states";
import { connectTest } from "./arduinoAccess/connectTest";
// import { switchCtrl } from "./arduinoAccess/switch";

const port = 8000;
const app = Express();

app.use(Express.static(path.join(__dirname, "..", "client")));
app.use(favicon(path.join(__dirname, "..", "lib/favicon.ico")));

//const httpsserver = Https.createServer(options,app).listen(port);
const options = {
  key: fs.readFileSync(
    path.join(__dirname, "../../../..", "keys/chat/privkey.pem")
  ),
  cert: fs.readFileSync(
    path.join(__dirname, "../../../..", "keys/chat/cert.pem")
  ),
};

const httpserver = Https.createServer(options, app).listen(port);
console.log(`Server listening on port ${port}`);

app.get("/", function (req, res, next) {
  try {
    res.sendFile(path.join(__dirname, "..", "client/html", "index.html"));
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Something went wrong" });
  }
});

app.get("/snowleopard", function (req, res, next) {
  try {
    res.sendFile(path.join(__dirname, "..", "client/html", "snowLeopard.html"));
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Something went wrong" });
  }
});

connectTest().then((result) => {
  states.arduino.connected = result;
});

/*
const socketOptions = {
  cors: {
    origin: function (origin, callback) {
      const isTarget = origin != undefined && origin.includes("localhost") !== null;
      return isTarget ? callback(null, origin) : callback('error invalid domain');
    },
    credentials: true
  },
  maxHttpBufferSize: 1e8,
};
*/

// const io = new Server(httpsserver, socketOptions)

ioServer(httpserver);
