import * as fs from "fs";
import { default as Express } from "express";
import * as path from "path";
import { default as favicon } from "serve-favicon";
import * as Https from "https";
import { fileURLToPath } from "url";
import { ioServer } from "./socket/ioServer";
import { spawn } from "child_process";
// import { states } from "./states";
// import { switchCtrl } from "./arduinoAccess/switch";
import { networkInterfaces } from "os";

const port = 8000;
const app = Express();
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const __dirname = import.meta.dirname;
// console.log(__dirname);

app.use(Express.static(path.join(__dirname, "..", "static")));
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

function getIpAddress() {
  const nets = networkInterfaces();
  const net = nets["en0"]?.find((v) => v.family == "IPv4");
  return !!net ? net.address : null;
}

const host = getIpAddress();
console.log(`Server listening on ${host}:${port}`);

app.get("/", function (req, res, next) {
  try {
    res.sendFile(path.join(__dirname, "..", "static", "html", "index.html"));
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Something went wrong" });
  }
});

// app.get("/:name", function (req, res, next) {
//   const name = req.params.name;
//   try {
//     if (name == "") {
//       res.sendFile(path.join(__dirname, "..", "static", "html", "index.html"));
//     } else if (
//       name == "snowleopard" ||
//       name == "sl" ||
//       name === "snow" ||
//       name == "2008" ||
//       name == "2009"
//     ) {
//       res.sendFile(
//         path.join(__dirname, "..", "static", "html", "snowleopard.html")
//       );
//     }
//     // res.sendFile(path.join(__dirname, "..", "static", "html", "index.html"));
//   } catch (error) {
//     console.log(error);
//     res.json({ success: false, message: "Something went wrong" });
//   }
// });
app.get("/snowleopard", function (req, res, next) {
  try {
    console.log("snowleopard");
    res.sendFile(
      path.join(__dirname, "..", "static", "html", "snowleopard.html")
    );
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Something went wrong" });
  }
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
