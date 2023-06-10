import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import * as Https from 'https'
import * as fs from 'fs'


import express from 'express';
/*
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const { fileURLToPath } = require('url');
const Https = require('https')
const fs = require('fs')
const express = require('express');
*/
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// const { createProxyMiddleware } = require('http-proxy-middleware');
// const path = require('path');
// const express = require('express');
// const app = express();

const port = 8888;

app.use(
  '/socket.io',
  createProxyMiddleware({
    target: 'http://localhost:8000',
  })
);

app.use('/', express.static(path.join(__dirname, 'dist')));

app.get('/', (req, res) => {
  console.log('debug')
  console.log(path.join(__dirname, 'assets', 'client.html'))
  res.sendFile(path.join(__dirname, 'assets', 'client.html'));
});

app.get('/snowleopard', (req, res) => {
  res.sendFile(path.join(__dirname, 'assets', 'snowLeopard', 'snowleopard.html'));
});


app.use((err, req, res, next) => {
  console.log(err)
  res.status(500).send('Internal Server Error');
});

/*
app.listen(3000, () => {
  console.log('frontend server start listening');
});
*/
const options = {
  key: fs.readFileSync(path.join(__dirname,'../..','keys/privkey.pem')),
  cert: fs.readFileSync(path.join(__dirname,'../..', 'keys/cert.pem'))
}

const httpsserver = Https.createServer(options,app).listen(port);