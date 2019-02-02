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
//Dependencies
var express = require('express')
var app = express();
var http = require('http').Server(app);
//used for sending frames to client
var io = require('socket.io')(http);
var fs = require('fs');

app.use(express.static('js'))
app.use(express.static('models'))
app.use(express.static('assets'))

/**
saves the timestamp of the previous reset to prevent
firing too many resets
@see handleReset()
*/
previousReset = undefined;
/**
Needed to differentiate between an explode event start and update
@see fistProximity()
*/
pullStart = false;
/**
Needed to prevent excpetions when not connected to client
*/
isConnected = false;
/**
Global connection to clients
*/
gSocket = null
/**
Array containing all 3D models
*/
models = fs.readdirSync('./models/');
/**
JSON file containing settings
*/
settingsFile = fs.readFileSync('./parameters.json')
/**
Index in the array of the currently used 3D model
*/
modelIndex = 0;
/**
Information about the model for the client
*/
modelInformation = {
  "type": 'unimog',
  "model": ''
}
settings = JSON.parse(settingsFile);
console.log(models)

models.forEach(file => {
  console.log(file);
});

/**
FIXME: NOT IMPLEMENTED.
Used to send parameters from the client to the server
*/
function handleParameters(jsonString) {
  console.log(jsonString);
}

//Initializing Socket.io and server
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

//FIXME: find hand with highest grabStrength
/**
This function sends the movement of the hand to the clients
to translate the model
*/
function handleTranslation(frame) {
  gSocket.emit('translateModel', { "x" : frame.hands[0].palmVelocity[0],
                                   "y" : frame.hands[0].palmVelocity[1],
                                   "z": frame.hands[0].palmVelocity[2]}
              )
}

/**
This function handles the reset gesture.
A reset is supposed to be recognized whenever the palms of both hands touch.
This function checks if both hands have a close proximity in all axes.
A further check is made to ensure that a reset is not triggered more than once a second.
Uses settings.resetThresholds and settings.resetTimeout
@see root entry point: onFrame()
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

/**
This function tells the client in percent how far both grabbing hands are apart
from each other on the x-axis. This information is then used to explode a model.
minimum and maximum distances are set in the parameters.
@params {Object} - An object containing information about the hands
*/
function handleExplode(hands) {
  var distanceX = Math.abs(hands[0].palmPosition[0] - hands[1].palmPosition[0]);
  console.log(`distanceX: ${distanceX}`)
  if(distanceX < settings.gesture.explode.minDistance) {
    distanceX = settings.gesture.explode.minDistance;
  } else if(distanceX > settings.gesture.explode.maxDistance) {
    distanceX = settings.gesture.explode.maxDistance;
  }
  var percentage = (distanceX - settings.gesture.explode.minDistance) / (settings.gesture.explode.maxDistance - settings.gesture.explode.minDistance);
  console.log(`percentage: ${percentage}`)
  gSocket.emit('uncoverModel', percentage)
}

/**
This function is used to detect the beginning of the explosion gesture.
@param {Object} - An object containing information about the hands
*/
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

/**
This functions helps to detected all two-hand gestures,
i. e. explosion and reset.
*/
function twoHands(frame) {
  if(frame.hands[0].grabStrength >= settings.grabStrength && frame.hands[1].grabStrength >= settings.grabStrength) {
    if(settings.pullApart) {
      fistProximity(frame.hands);
    }
  } else {
    if(settings.reset) {
      handleReset(frame.hands);
    }
  }
}

/**
Set after the first valid frame has been received to control the number
of frames sent to the client by checking the difference timestamps.
@see onFrame()
*/
var previousFrame;
/**
This function serves as an entry point for frames from the controller.
As there is no way to set the number of frames received from the controller
the timestamp between frames is checked to handle this.
60 fps should be the targeted framerate as the client does not expect more.
Detected gesture are not handled here

@see handleGesture()
*/
function onFrame(frame)
{
	globalFrame = frame;
	if(frame.valid && frame.hands && frame.hands.length !== 0 && (!previousFrame || (frame.timestamp - previousFrame.timestamp > settings.frametime))) {
    previousFrame = frame;
		if(isConnected) {
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

/**
Used to tell if the swipe detected is valid according to the parameters.
@see handleSwipe()
*/
function isWholeSwipe(start, current) {
  if(start) {
    console.log(`distance: ${current[0] - start[0]}`)
    var maxVal = Math.max(current[0], start[0]);
    var minVal = Math.min(current[0], start[0]);
    return (maxVal - minVal) > settings.gesture.swipe.minLength; //NOTE: externalized value: swipe.minLength
  }
  return false;
}

/**
Used to calculate the direction of the circle gesture.
@param {Object} - the object containing information about the gesture
@see handleCircle()
@see handleGesture()
*/
function direction(gesture) {
  var pointableID = gesture.pointableIds[0];
  var direction = globalFrame.pointable(pointableID).direction;
  var dotProduct = Leap.vec3.dot(direction, gesture.normal);

  return (dotProduct  >  0);
}

/**
Variable containing information whether the circle gesture is clockwise.
@see handleCircle()
*/
clockwise = true;
/**
This function is used to handle the circle gesture
@param {Object} - the object containing information about the gesture
@see handleGesture() - the root caller of this function
*/
function handleCircle(gesture) {
  console.log(gesture.state)
  if(gesture.state == 'start') {
    clockwise = direction(gesture);
    console.log('START Circling, Clockwise:', clockwise)
  } else if(gesture.state == 'update') {
        console.log('update' + globalFrame.timestamp)
        if(isConnected) {
          gSocket.emit('rotateModel', clockwise ? 0:1); //NOTE: externalized value: circle.multiplier
          console.log('emitted rotation')
		    }
    } else if(gesture.state == 'stop') {
      console.log('END')
    }
}

/**
This function handles the swipe gesture
@param {Object} - the object containing information about the gesture
@see handleGesture() - the root caller of this function
*/
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

/**
This function is the first entry point for detected built-in gestures
from the controller.
*/
function handleGesture(gesture) {
  if(gesture.type == 'circle' && settings.circle) {
      handleCircle(gesture);
		} else if(gesture.type == 'swipe' && settings.swipe) {
      handleSwipe(gesture);
		}
}

/**
This function initializes the communication to the leap controller
*/
function initLeap() {
  Leap = require('leapjs');
  controller = new Leap.Controller({enableGestures: true});
  controller.connect();
  controller.on('frame', onFrame);
  controller.on('gesture', handleGesture);
}

//Starting the server
http.listen(3000, function() {
	console.log('listening on *:3000');
});
