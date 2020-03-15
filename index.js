var http = require('http').createServer(handler);
var fs = require('fs');
var io = require('socket.io')(http);
var Gpio = require('onoff').Gpio;
var cron = require("node-cron");
functions = require('./functions');
settings = require('./settings');
taskManager = require('./taskManager');

var pushButton = new Gpio(23, 'in', 'rising', {debounceTimeout: 10});
var liftSwitch = new Gpio(24, 'in', 'falling', {debounceTimeout: 10});
var heater = new Gpio(22, 'out');

var tempSensor = 0;
var state = "off";
var ledColor = 1;
var connected = true;
var updatePeriod = 3000;
var lifted = false;

functions.initPins();

http.listen(8080);

function handler (req, res) {
  let returnFile, contentType;
  switch(req.url){
    case "/":
      returnFile = '/public/index.html';
      contentType = 'text/html';
      break;
    case "/styles.css":
      returnFile = '/public/styles.css';
      contentType = 'text/css';
      break;
    case "/script.js":
      returnFile = '/public/script.js';
      contentType = 'text/javascript';
      break;
    default:
      returnFile = '/public/index.html';
      contentType = 'text/html';
      break;
  }

  fs.readFile(__dirname + returnFile, function(err, data) {
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/html'});
      return res.end("404 Not Found");
    }
    res.writeHead(200, {'Content-Type': contentType});
    res.write(data);
    return res.end();
  });
}

var tempTimer = setInterval(function() {
  var gt = functions.getTemp();
  gt.then(t=>{
    tempSensor = t;
    io.emit('temp', t);
  }).catch(t=>{
    console.log("Got temp error", t);
  });
}, updatePeriod);


pushButton.watch(function (err, value) {
  if (err) {
    console.error('There was an error', err);
    return;
  }
  if(state == "off"){
    startHeat(100,false);
  }else{
    state = "cancel";
  }
});

liftSwitch.watch(function (err, value) {
  if (err) {
    console.error('There was an error', err);
    return;
  }
  lifted = true;
});

io.sockets.on('connection', function (socket) {
  socket.emit('temp', tempSensor);
  socket.emit('state', state);
  socket.emit('schedules', functions.cronDescriptions);

  socket.on('startHeat', function(data) {
    if(state == "off"){
      startHeat(Number(data.t), data.keepWarm);
    }
  });

  socket.on('cancel', function(data) {
    state = "cancel";
  });

  socket.on('addSchedule', function(data) {
    addSchedule(data.schedule, data.t, data.keepWarm);
  });

  socket.on('clearSchedules', function(data) {
    clearSchedule();
    socket.emit('schedules', functions.cronDescriptions);
  });

});

function addSchedule (cronString, temp, keepWarm){
  var job = cron.schedule(cronString, ()=>{startHeat(temp, keepWarm)});
  const id = taskManager.add(job);
  functions.crons.push(job);
  functions.cronDescriptions.push({id, cronString, temp, keepWarm});
  io.emit('schedules', functions.cronDescriptions);
}

function clearSchedule (){

	for(let t = 0; t<functions.cronDescriptions.length; t++){
		taskManager.get(t).destroy();
	}
	functions.cronDescriptions = [];
}

async function startHeat (temp, keepWarm){
  if(state != "off"){
    return;
  }
  var heating = true;
	var tempReached = false;
  var notificationSent = false;
  var lastColor;
  lifted = false;
  state = "heating";
  io.emit('targetTemp', temp);
  io.emit('state', state);
	while(heating){
    await functions.getTemp().then(t=>{
      tempSensor = t;
      io.emit('temp', t);
    });

		if(tempSensor < temp){
			//turn on heater
      heater.writeSync(1);
		}else{
      // Temp reached
      tempReached = true;

      //turn off heater
      heater.writeSync(0);

      if(!notificationSent){
        // Send notification
        notificationSent = true;
      }

      if(!keepWarm || (keepWarm && lifted)){
        heating = false;
        state = "off";
        io.emit('state', state);
        await functions.fadeOut(ledColor);
      }else{
        state = "keepingWarm";
        io.emit('state', state);
      }

		}

    if(tempReached && lifted){
      heating = false;
      state = "off";
      heater.writeSync(0);
      io.emit('state', state);
      await functions.fadeOut(ledColor);
    }

    if(state == "cancel"){
      heating = false;
      state = "off";
      io.emit('state', state);
      heater.writeSync(0);
      await functions.fadeOut(ledColor);
    }

    var color = functions.getTempColor(tempSensor);
    if((!lastColor || color != lastColor) && (state == "heating" || state == "keepingWarm")){
      lastColor = color;
      await functions.animate(ledColor, color, 100).then(()=>{ledColor=color;});
    }

	}

}
