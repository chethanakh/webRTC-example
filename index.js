const fs = require('fs');
const https = require('https')
const express = require('express');
const app = express();
const PORT = 3000;
app.use(express.static(__dirname))

const key = fs.readFileSync('./cert/cert.key');
const cert = fs.readFileSync('./cert/cert.crt');

const expressServer = https.createServer({ key, cert }, app);

expressServer.listen(PORT);