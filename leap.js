/*MIT License

Copyright (c) 2019 Gabriel Dimitrov, Julian Leuze

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

/*
TODO clockwise rotation
*/
const args = process.argv;
console.log(`Starting with args: ${args}`);
if(args.length < 3 || args[2] !== 'noleap') {
  console.log('Initializing leap')
  initLeap();
} else {
  console.log('Gabriel mode... initializing leap skipped')
}
var Leap;
var globalFrame;
var express = require('express')
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');

app.use(express.static('js'))
app.use(express.static('models'))
app.use(express.static('assets'))

previousReset = undefined;
lastFrame = null;
pullStart = false;
isConnected = false;
gSocket = null
models = fs.readdirSync('./models/');
settingsFile = fs.readFileSync('./parameters.json')
modelIndex = 0;
modelInformation = {
  "type": 'unimog',
  "model": ''
}
settings = JSON.parse(settingsFile);
console.log(models)

models.forEach(file => {
  console.log(file);
});

function handleParameters(jsonString) {
  console.log(jsonString);
}

io.on('connection', function(socket) {
	console.log("connected")
	isConnected = true;
	gSocket = socket;
  gSocket.on('parameters', handleParameters)
});

app.get('/', function(req, res) {
	console.log("Client IP: " + req.connection.remoteAddress)
	res.sendFile(__dirname + '/index.html');
});

app.get('/welcome.htm', function(req, res) {
	console.log("Client IP: " + req.connection.remoteAddress)
	res.sendFile(__dirname + '/welcome.htm');
});

function handleTranslation(frame) {
  gSocket.emit('translateModel', { "x" : frame.hands[0].palmVelocity[0],
              "y" : frame.hands[0].palmVelocity[1],
              "z": frame.hands[0].palmVelocity[2]}
  )
  xAbs = Math.abs(frame.hands[0].palmVelocity[0]);
  yAbs = Math.abs(frame.hands[0].palmVelocity[1]);
  // if(xAbs > 15) {
    console.log(`x: ${xAbs}`);
  // }
  // if(yAbs > 15) {
    console.log(`y: ${yAbs}`);
  // }
}

/*
This function handles the reset gesture.
A reset is supposed to be recognized whenever the palms of both hands touch.
This function checks if both hands have a close proximity in all axes.
A further check is made to ensure that a reset is not triggered more than once a second.
Uses settings.resetThresholds and settings.resetTimeout
*/
function handleReset(hands) {
  var resetBool = true;
  h1 = hands[0].palmPosition
  h2 = hands[1].palmPosition
  distance = [];
  for(var i = 0; i < 3; i++) {
    distance[i] = Math.abs(h1[i] - h2[i]).toFixed(2)
    //NOTE: externalized value
    if(distance[i] >= settings.resetThresholds[i]) {
      resetBool = resetBool && false;
    }
  }
  //reset timeout is in micros, NOTE: Externalized value
  if(resetBool && (!previousReset || (globalFrame.timestamp - previousReset >= settings.resetTimeout))) {
    previousReset = globalFrame.timestamp;
    console.log("RESET")
    gSocket.emit('resetModel');
  }
  console.log(distance);
}

function handleExplode(hands) {
  var distanceX = Math.abs(hands[0].palmPosition[0] - hands[1].palmPosition[0]);
  console.log(`distanceX: ${distanceX}`)
  if(distanceX < 100) {
    distanceX = 100
  } else if(distanceX > 400) {
    distanceX = 400;
  }
  var percentage = (distanceX - 100) / 300;
  console.log(`percentage: ${percentage}`)
  gSocket.emit('uncoverModel', percentage)
}

//FIXME: DUPLICATE
function fistProximity(hands) {
  if(!pullStart) {
    var fistBool = true;
    h1 = hands[0].palmPosition
    h2 = hands[1].palmPosition
    distance = [];
    for(var i = 0; i < 3; i++) {
      distance[i] = Math.abs(h1[i] - h2[i]).toFixed(2)
      //NOTE: externalized value
      if(distance[i] >= settings.explodeThresholds[i]) {
        fistBool = fistBool && false;
      }
    }
    if(fistBool) {
      pullStart = true;
    }
    console.log(`fistBool: ${fistBool}`)
  } else {
    handleExplode(hands);
  }
}

function twoHands(frame) {
  if(frame.hands[0].grabStrength >= settings.grabStrength && frame.hands[1].grabStrength >= settings.grabStrength) {
    if(settings.pullApart) {
      // handlePullApart(frame.hands);
      fistProximity(frame.hands);
    }
  } else {
    if(settings.reset) {
      handleReset(frame.hands);
    }
  }
}

var tempFrame;
function onFrame(frame)
{
	globalFrame = frame;
	if(frame.valid && frame.hands && frame.hands.length !== 0 && (!tempFrame || (frame.timestamp - tempFrame.timestamp > settings.frametime))) {
    tempFrame = frame;
		if(isConnected || true) {
      if(frame.hands.length >= 2) {
        twoHands(frame)
      } else if(frame.hands.length == 1) {
        //NOTE: Externalized Value: grabStrength
   			if(frame.hands[0].grabStrength >= settings.grabStrength && settings.translation) {
           handleTranslation(frame);
   			}
      }
		}
	}
}

function isWholeSwipe(start, current) {
  if(start) {
    console.log(`distance: ${current[0] - start[0]}`)
    var maxVal = Math.max(current[0], start[0]);
    var minVal = Math.min(current[0], start[0]);
    return (maxVal - minVal) > settings.gesture.swipe.minLength; //NOTE: externalized value: swipe.minLength
  }
  return false;
}

function direction(gesture) {
  var pointableID = gesture.pointableIds[0];
  var direction = globalFrame.pointable(pointableID).direction;
  var dotProduct = Leap.vec3.dot(direction, gesture.normal);

  return (dotProduct  >  0);
}

clockwise = true;
function handleCircle(gesture) {
  console.log(gesture.state)
  if(gesture.state == 'start') {
    clockwise = direction(gesture);
    console.log('START Circling, Clockwise:', clockwise)
  } else if(gesture.state == 'update') {
        // pointableIds = gesture.pointableIds;
        // pointableIds.forEach(function(pointableId) {
        // var pointable = globalFrame.pointable(pointableId);
        // console.log(`center: ${gesture.center}, radius: ${gesture.radius}`)
        // console.log(pointable.stabilizedTipPosition)
        // input = [0, pointable.tipPosition[0] - gesture.center[0], pointable.tipPosition[1] - gesture.center[1], gesture.radius]
        // console.log(input)
        console.log('update' + globalFrame.timestamp)
        if(isConnected) {
          gSocket.emit('rotateModel', clockwise ? 0:1); //NOTE: externalized value: circle.multiplier
          console.log('emitted rotation')
		  //console.error(`[${pointable.tipPosition[0] - gesture.center[0]}, ${pointable.tipPosition[1] - gesture.center[1]}, ${gesture.radius}]`)
		    }
      // });
    } else if(gesture.state == 'stop') {
      console.log('END')
    }
}

function handleSwipe(gesture) {
  if(gesture.state == 'start') {
    console.log('START SWIPE')
    start = gesture.startPosition;
  } else if(gesture.state == 'stop') {
    console.log('STOP SWIPE', start, gesture.position, `speed: ${gesture.speed}`)
    if(isWholeSwipe(start, gesture.position)) {
      if(gesture.direction[0] > 0) {
        console.log('Swipe to right')
        modelIndex = (modelIndex + 1) % models.length;
        modelInformation.model = models[modelIndex]
        gSocket.emit('changeModel', modelInformation)
      } else {
        console.log('swipe to left')
        modelIndex--;
        if(modelIndex < 0) {
          modelIndex = models.length -1;
        }
        modelInformation.model = models[modelIndex]
        gSocket.emit('changeModel', modelInformation)
      }
      console.log(`changing Model to ${models[modelIndex]}`)
      console.log('WHOLE SWIPE', start, gesture.position)
    }
    start = null;
  }
}

function handleGesture(gesture) {
  if(gesture.type == 'circle' && settings.circle) {
      handleCircle(gesture);
		} else if(gesture.type == 'swipe' && settings.swipe) {
      handleSwipe(gesture);
		}
}

function initLeap() {
  Leap = require('leapjs');
  controller = new Leap.Controller({enableGestures: true});
  controller.connect();
  controller.on('frame', onFrame);
  controller.on('gesture', handleGesture);
}


http.listen(3000, function() {
	console.log('listening on *:3000');
});
