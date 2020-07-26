const http = require('http');
const os = require('os');

http.createServer((req, res) => {
	console.log(`Received request from ${req.connection.remoteAddress}`);
	res.writeHead(200);
    res.end(`You have reached ${os.hostname()}\n`);
}).listen(8080);
