Leap = require('leapjs');
var express = require('express')
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('js'))
app.use(express.static('models'))

lastFrame = null;
previous = 0;
xDelta = 0;
isConnected = false;
gSocket = null

io.on('connection', function(socket) {
	console.log("connected")
	isConnected = true;
	gSocket = socket;
});
app.get('/', function(req, res) {
	console.log("Client IP: " + req.connection.remoteAddress)
	res.sendFile(__dirname + '/index.html');
});

var controller = new Leap.Controller();
controller.connect();

function getMovementDirection(frame) {
		var hand = frame.hands[0];
		var velocityX = hand.palmVelocity[0];
		console.log(velocityX);
		if(Math.abs(velocityX) > 5) {
			
			if(velocityX > 5.0) {
				return 1;			
			} else if(velocityX < -5.0) 
				return -1;
		}
		return 0;
}

function getDelta(frame) {
	var hand = frame.hands[0];
	xDelta = hand.direction[0] - previous;
	previous = hand.direction[0];
	return xDelta;
}

function getPosition(frame) {
	var hand = frame.hands[0];
	return hand.palmPosition[0];
}

function isGrabbing(frame) {
	var hand = frame.hands[0];
	console.log(hand.grabStrength);
}

controller.on('frame', onFrame);
function onFrame(frame)
{
	if(frame.hands && frame.hands.length !== 0) {
		//console.log(getMovementDirection(frame))
		//isGrabbing(frame);
		if(isConnected) {
			//console.log(frame.hands[0].palmVelocity[0],frame.hands[0].palmVelocity[1], frame.hands[0].grabStrength)
			if(frame.hands[0].grabStrength > 0.6) {
				gSocket.emit('translate', { "x" : frame.hands[0].palmVelocity[0],
										"y" : frame.hands[0].palmVelocity[1],
										"z": frame.hands[0].palmVelocity[2]}
				)
				xAbs = Math.abs(frame.hands[0].palmVelocity[0]);
				yAbs = Math.abs(frame.hands[0].palmVelocity[1]);
				if(xAbs > 15) {
					console.log(`x: ${xAbs}`);
				}
				if(yAbs > 15) {
					console.log(`y: ${yAbs}`);
				}
			}
			/*console.log({ "velocity" : frame.hands[0].palmVelocity[0],
								   "grabStrength" : frame.hands[0].grabStrength,
									"velocityY": frame.hands[0].palmVelocity[1]})*/
		}
		//console.log(getDelta(frame));
		//console.log(getPosition(frame));
	}
}


http.listen(3000, function() {
	console.log('listening on *:3000');
});
