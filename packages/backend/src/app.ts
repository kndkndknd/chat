import * as fs from 'fs'
/*
import * as child_process from "child_process";
const exec = child_process.exec
*/
import * as os from 'os'
import * as util from 'util'

import { default as Express } from "express"
import * as path from "path"
import { default as favicon } from 'serve-favicon'

import * as Https from 'https'
import * as Http from 'http'
import { ioServer } from './socket/ioServer'





//https鍵読み込み
/*
const options = {
  key: fs.readFileSync(path.join(__dirname,'../../..','keys/privkey.pem')),
  cert: fs.readFileSync(path.join(__dirname,'../../..', 'keys/cert.pem'))
}
*/


const app = Express();

app.use(Express.static(path.join(__dirname, '..', 'client')));
app.use(favicon(path.join(__dirname, '..' ,'lib/favicon.ico')));


const port = 8000;
//const httpsserver = Https.createServer(options,app).listen(port);
const httpserver = Http.createServer(app).listen(port)
console.log(`Server listening on port ${port}`)

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


ioServer(httpserver)