// Leap = require('leapjs');
var express = require('express')
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');

app.use(express.static('js'))
app.use(express.static('models'))

lastFrame = null;
previous = 0;
xDelta = 0;
isConnected = false;
gSocket = null
models = fs.readdirSync('./models/');
modelIndex = 0;
console.log(models)

models.forEach(file => {
  console.log(file);
});

io.on('connection', function(socket) {
	console.log("connected")
	isConnected = true;
	gSocket = socket;
});
app.get('/', function(req, res) {
	console.log("Client IP: " + req.connection.remoteAddress)
	res.sendFile(__dirname + '/index.html');
});

// var controller = new Leap.Controller({ enableGestures: true});
// controller.connect();
// console.log(controller.config);

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
globalFrame = null;
// controller.on('frame', onFrame);
function onFrame(frame)
{
	globalFrame = frame;
	if(frame.hands && frame.hands.length !== 0) {
		//console.log(getMovementDirection(frame))
		//isGrabbing(frame);
		if(isConnected) {
			//console.log(frame.hands[0].palmVelocity[0],frame.hands[0].palmVelocity[1], frame.hands[0].grabStrength)
			if(frame.hands[0].grabStrength > 0.6) {
				gSocket.emit('translateModel', { "x" : frame.hands[0].palmVelocity[0],
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

function isWholeSwipe(start, current) {
	return start && (current[0] - start[0]) > 100;
}

// controller.on('gesture', function(gesture) {
// 	if(gesture.type == 'circle') {
// 		console.log(gesture.state)
// 		if(gesture.state == 'start') {
// 			console.log('START')
// 		} else if(gesture.state == 'update') {
// 					pointableIds = gesture.pointableIds;
// 					pointableIds.forEach(function(pointableId) {
// 					var pointable = globalFrame.pointable(pointableId);
// 					console.log(`center: ${gesture.center}, radius: ${gesture.radius}`)
// 					console.log(pointable.stabilizedTipPosition)
// 					console.log(`input ${(pointable.tipPosition[0] - gesture.center[0]) / gesture.radius}`)
// 					deg = Math.acos((pointable.tipPosition[0] - gesture.center[0]) / gesture.radius)
// 					console.log(deg);
// 					gSocket.emit('rotateModel', deg * 100);
// 					deg2 = Math.asin((pointable.tipPosition[1] - gesture.center[1]) / gesture.radius)
// 					console.log(deg2)
// 				});
// 			} else if(gesture.state == 'stop') {
// 				console.log('END')
// 			}
// 		} else if(gesture.type == 'swipe') {
// 			if(gesture.state == 'start') {
// 				console.log('START SWIPE')
// 				start = gesture.startPosition;
// 			} else if(gesture.state == 'stop') {
// 				console.log('STOP SWIPE', start, gesture.position)
// 				if(isWholeSwipe(start, gesture.position)) {
// 					modelIndex = (modelIndex + 1) % models.length;
// 					console.log(`changing Model to ${models[modelIndex]}`)
// 					gSocket.emit('changeModel', models[modelIndex])
// 					console.log('WHOLE SWIPE', start, gesture.position)
// 				}
// 				start = null;
// 			}
// 			if(gesture.direction[0] > 0) {
//                   swipeDirection = "right";
// 									if(gesture.state == 'update') {
// 										// if(isWholeSwipe(start, gesture.position)) {
// 										// 	// modelIndex = (modelIndex + 1) % models.length;
// 										// 	// console.log(`changing Model to ${models[modelIndex]}`)
// 										// 	// gSocket.emit('changeModel', models[modelIndex])
// 										// 	console.log('WHOLE SWIPE', start, gesture.position)
// 										// }
// 										console.log('UPDATE SWIPE')
// 									}
//               } else {
//                   swipeDirection = "left";
//               }
// 		}
// });


http.listen(3000, function() {
	console.log('listening on *:3000');
});
