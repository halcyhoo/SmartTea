var http = require('http').createServer();
var cron = require("node-cron");
const Pigpio = require('pigpio').Gpio;
var io = require('socket.io')(http);
var settings = require('./settings');
taskManager = require('./taskManager');

var crons = [];
var cronDescriptions = [];

var RED, BLUE, GREEN;

function initPins(){
	RED = new Pigpio(4, {mode: Pigpio.OUTPUT});
	GREEN = new Pigpio(5, {mode: Pigpio.OUTPUT});
	BLUE = new Pigpio(6, {mode: Pigpio.OUTPUT});
	RED.digitalWrite(0);
	GREEN.digitalWrite(0);
	BLUE.digitalWrite(0);
}


function getTemp (){
	var spawn = require('child_process').spawn,
      tcRead = spawn("python3", ["/home/pi/SmartTea/temp.py"]);

	return new Promise((resolve, reject)=>{
		tcRead.stdout.on('data', (data) => {
			console.log(data.toString());
			if(data.toString() != "MAX6675Error"){
				resolve(data.toString());
			}else{
				reject(data.toString());
			}
		});

		tcRead.stderr.on('data', (data) => {
			console.log(data.toString());
			reject(data.toString());
    });

	});

}


function hslToRgb(h, s, l) {
  var r, g, b;

  if (s == 0) {
    r = g = b = l; // achromatic
  } else {
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;

    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [ Math.round(r * 255), Math.round(g * 255), Math.round(b * 255) ];
}


function hue2rgb(p, q, t) {
	if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1/6) return p + (q - p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function animate(startHue, endHue, duration){
	var loop = true;
	var hue = startHue;
	while(loop){
		if(hue == endHue){
			loop = false;
		}else{
			if(startHue > endHue){
				hue--;
			}else{
				hue++;
			}
		}
		var rgb = hslToRgb(hue/100, 1, .5);
		setRGB(rgb[0],rgb[1],rgb[2]);
		await sleep(100);
	}
	return;
}

async function fadeOut(hue){
	var loop = true;
	var l = 50;
	while(loop){
		if(l == 0){
			loop = false;
		}
		l--;
		var rgb = hslToRgb(hue/100, 1, l/100);
		setRGB(rgb[0],rgb[1],rgb[2]);
		await sleep(10);
	}
	return;
}

function setRGB(r, g, b){
	if(r >= 0){
		RED.pwmWrite(r);
	}else{
		RED.pwmWrite(0);
	}
	if(g >= 0){
		GREEN.pwmWrite(g);
	}else{
		GREEN.pwmWrite(0);
	}
	if(b >= 0){
		BLUE.pwmWrite(b);
	}else{
		BLUE.pwmWrite(0);
	}

}

function getTempColor(tempSensor){
	var color = 10;
	for(var temp in settings.tempColors){
		if(tempSensor >= temp){
			color = settings.tempColors[temp];
		}
	}
	return color;
}

module.exports.fadeOut = fadeOut;
module.exports.sleep = sleep;
module.exports.animate = animate;
module.exports.initPins = initPins;
module.exports.setRGB = setRGB;
module.exports.getTemp = getTemp;
module.exports.getTempColor = getTempColor;
module.exports.crons = crons;
module.exports.cronDescriptions = cronDescriptions;
