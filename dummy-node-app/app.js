const http = require('http');
const os = require('os');

let count = 0;
const shouldFail = process.argv.length > 2;

console.log(`should fail: ${shouldFail}`);

const handler = (req, res) => {
	console.log(`Received request from ${req.connection.remoteAddress}`);

	if (shouldFail) {
		count += 1;
		if  (count > 5) {
			res.writeHead(500);
			res.end();
			return;
		}
	}

	res.writeHead(200);
	res.end(`You have reached ${os.hostname()}\n`);
	return;
};

http.createServer(handler).listen(8080);
