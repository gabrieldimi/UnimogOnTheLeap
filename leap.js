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

lastFrame = null;
pullStart = false;
isConnected = false;
gSocket = null
models = fs.readdirSync('./models/');
settingsFile = fs.readFileSync('./parameters.json')
modelIndex = 0;
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

function handleReset(hands) {
  console.log(`hand1Normal: ${hands[0].palmNormal}, hand2Normal: ${hands[1].palmNormal} `)
  //NOTE: Externalized value
  if(Math.abs(hands[0].palmNormal[1]) > settings.palmNormalThreshold && Math.abs(hands[1].palmNormal[1]) > settings.palmNormalThreshold) {
    console.log('EMIT reset')
    gSocket.emit('resetModel');
  }
}

function handlePullApart(hands) {
  console.log(`
    ----------------
    ${globalFrame.timestamp}
    left hand fingers
    ----------------`)
    fingersLeft = hands[0].fingers
    fingersRight = hands[1].fingers
    var fourExtension = true;
    for(var i =0; i < fingersLeft.length; i++) {
      console.log(`${fingersLeft[i].type}, extended? ${fingersLeft[i].extended}` )
      if(fingersLeft[i].type === 1 || fingersLeft[i].type === 2) {
        fourExtension = fourExtension && fingersLeft[i].extended
      }
      if(fingersLeft[i].type !== 1 && fingersLeft[i].type !== 2) {
        fourExtension = fourExtension && !fingersLeft[i].extended
      }
    }
    console.log(`
      ----------------
      right hand fingers
      ----------------`)
    for(var i =0; i < fingersRight.length; i++) {
      console.log(`${fingersRight[i].type}, extended? ${fingersRight[i].extended}` )
      if(fingersRight[i].type === 1 || fingersRight[i].type === 2) {
        fourExtension = fourExtension && fingersRight[i].extended
      }
      if(fingersRight[i].type !== 1 && fingersRight[i].type !== 2) {
        fourExtension = fourExtension && !fingersRight[i].extended
      }
    }
    if(fourExtension) {
      distance = Math.abs(hands[0].palmPosition[0] - hands[1].palmPosition[0]);
      if(distance <= settings.uncover.minThreshold) {
        console.log('pullSTART')
        pullStart = true;
        return;
      }
      console.log(`distance: ${distance}`)
      if(distance >= settings.uncover.triggerThreshold && pullStart) {
        pullStart = false;
        console.log('uncover event')
        gSocket.emit('uncoverModel')
      }
    }
}

var tempFrame;
function onFrame(frame)
{
	globalFrame = frame;
	if(frame.valid && frame.hands && frame.hands.length !== 0 && (!tempFrame || (frame.timestamp - tempFrame.timestamp > settings.frametime))) {
    tempFrame = frame;
		if(isConnected) {
       //NOTE: Externalized Value: grabStrength
			if(frame.hands[0].grabStrength >= settings.grabStrength && settings.translation) {
        handleTranslation(frame);
			}

      if(frame.hands.length >= 2) {
        if(settings.reset) {
          handleReset(frame.hands);
        }
        if(settings.pullApart) {
          handlePullApart(frame.hands);
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
        pointableIds = gesture.pointableIds;
        pointableIds.forEach(function(pointableId) {
        var pointable = globalFrame.pointable(pointableId);
        console.log(`center: ${gesture.center}, radius: ${gesture.radius}`)
        console.log(pointable.stabilizedTipPosition)
        input = [0, pointable.tipPosition[0] - gesture.center[0], pointable.tipPosition[1] - gesture.center[1], gesture.radius]
        console.log(input)
        if(isConnected) {
          gSocket.emit('rotateModel', 0, pointable.tipPosition[0] - gesture.center[0], pointable.tipPosition[1] - gesture.center[1], gesture.radius); //NOTE: externalized value: circle.multiplier
		  //console.error(`[${pointable.tipPosition[0] - gesture.center[0]}, ${pointable.tipPosition[1] - gesture.center[1]}, ${gesture.radius}]`)
		}
      });
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
        gSocket.emit('changeModel', models[modelIndex])
      } else {
        console.log('swipe to left')
        modelIndex--;
        if(modelIndex < 0) {
          modelIndex = models.length -1;
        }
        gSocket.emit('changeModel', models[modelIndex])
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
