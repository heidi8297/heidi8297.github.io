
//----------------------------------------------------------------------------
//  DEFINE VARIABLES
//----------------------------------------------------------------------------

let canvasWidth = 750;
let canvasHeight = 400;
let circleData = [];

// variables needed for transition method
let circleStartInfo = {};
let circleEndInfo = {};
const ease = d3.easeCubicInOut;
const setDuration = 2000;
let timeElapsed = 0;
let interpolators = null;

var customBase = document.createElement('custom');
var custom = d3.select(customBase); // This is your SVG replacement and the parent of all other elements


// Color scale: give me a number, I return a color
const colorByNum = d3.scaleOrdinal()
	.domain([0,1,2,3,4,5,6,7,8,9,10,11,12])
	.range(["#FFEE88","#FFEE88","#ffcc6d","#FFAC69","#ff9473","#fe8187","#e278d6","#ad8aff",
		"#7c97ff","#66B9FF","#77DBFD","#83E8D0","#C3E6A6"]);

// used to create semi-randomness in the color order
let colorOffset = 12*Math.random();

let canvas = d3.select('#viz-container')
  .append('canvas')
  .attr('width', canvasWidth)
  .attr('height', canvasHeight);

let context = canvas.node().getContext('2d');



//----------------------------------------------------------------------------
//  DRAWING FUNCTIONS
//----------------------------------------------------------------------------

function databind(data) {
	var allCircles = custom.selectAll('custom.circle')
		.data(data);

	allCircles.join('custom')
		.attr('class', 'circle')
		.attr("cx", d => 5*d.scatterXMobile )
		.attr("cy", d => 15*d.scatterYMobile )
		.attr('r', 14)
		.attr('fillStyle', d => colorByNum(d.index%12))
		.transition().duration(1500)
		.attr("r",100)
		.attr('cx', d => 15*d.scatterXMobile )
		.transition().duration(800)
		.attr("r",10)
		.attr("cx", d=> 20*d.histogramX)
		.attr("cy", d=> canvasHeight - 15*d.histogramY)
		;

	console.log(custom)

} // databind()


// for each transition/animation step, create new interpolator functions to be used for drawing circles
function moveCircles() {
  interpolators = {}
  for (let i = 0; i < circleData.length; i++) {
    interpolators[i] = [
      d3.interpolate(circleStartInfo[i].cx, circleEndInfo[i].cx),
      d3.interpolate(circleStartInfo[i].cy, circleEndInfo[i].cy),
      d3.interpolate(circleStartInfo[i].r, circleEndInfo[i].r),
      d3.interpolate(circleStartInfo[i].opacity, circleEndInfo[i].opacity)
    ];
  }
  timeElapsed = 0;
} // moveCircles()


// iterate through every circle and update the circleStartInfo
//   to allow redrawing a single frame accordingly
function interpCircMove(dt) {
  if (interpolators) {
    timeElapsed += dt;
    let pct = Math.min(ease(timeElapsed / setDuration), 1.0);
    for (let i = 0; i < circleData.length; i++) {
      circleStartInfo[i].cx = Math.floor(interpolators[i][0](pct));
      circleStartInfo[i].cy = Math.floor(interpolators[i][1](pct));
      circleStartInfo[i].r = Math.floor(interpolators[i][2](pct));
      circleStartInfo[i].opacity = interpolators[i][3](pct);
    }
    if (timeElapsed >= setDuration) { interpolators = null; }
  }
} // interpCircMove()


// this function draws one frame onto the canvas
function drawCircles() {  // draw the elements on the canvas
  context.clearRect(0, 0, canvasWidth, canvasHeight); // Clear the canvas.

	var elements = custom.selectAll('custom.circle');// Grab all elements you bound data to in the databind() function.
	elements.each(function(d,i) { // For each virtual/custom element...

  // Draw each individual custom element with their properties.
  //for (let i = 0; i < circleData.length; i++) {
		var node = d3.select(this);   // This is each individual element in the loop.
    //let node = circleData[i];   // This is each individual element in the loop.
    context.fillStyle = node.attr('fillStyle');   // Here you retrieve the colour from the individual in-memory node and set the fillStyle for the canvas paint
    context.globalAlpha = 1;

    context.beginPath();
    context.arc(node.attr('cx'), node.attr('cy'), node.attr('r'), 0, 2*Math.PI, true);
    context.fill();
    context.closePath();

  }); // Loop through each element.

} // drawCircles


// this function activates the animation for the length specified by duration
function animateCircles() {
	moveCircles()
  let dt = 0;
  let t = d3.timer(function(elapsed) {
    //stats.begin();
    interpCircMove(elapsed - dt);
    dt = elapsed;
    drawCircles()
    //stats.end();
    if (elapsed > setDuration) { t.stop() };
	});
} // animateCircles()


// create dicts to keep track of circle positions for the transitions
function initiateCircleInfo(dataSet) {
  for (let i = 0; i < dataSet.length; i++) {
    let node = circleData[i]
    let numOneToTwelve = Math.round(i/12 + 2*Math.random() -1 + colorOffset)
    circleStartInfo[i] = { // represents the starting points of the circles for each transition
      'cx': 20*node.scatterX,
      'cy': canvasHeight-13*node.scatterY,
      'class': numOneToTwelve,
      'r': 7,
      'fillStyle': colorByNum(numOneToTwelve), // set fill once and then leave it alone
      'opacity': 0
    }
    circleEndInfo[i] = { // represents the ending points of the circles for each transition
      'cx': 16*node.histogramX,
      'cy': canvasHeight-12*node.histogramY,
      'class': numOneToTwelve,
      'r': 7,
      'fillStyle': colorByNum(numOneToTwelve), // set fill once and then leave it alone
      'opacity': 0.3
    }
  }
}


//----------------------------------------------------------------------------
//  TRANSITIONS - DEFINE POSITIONS FOR THE CIRCLES AT EVERY STEP
//----------------------------------------------------------------------------
function transition1() {  // "grid" of events with summary numbers
	for (let i = 0; i < circleData.length; i++) {
		let node = circleData[i];
		circleEndInfo[i] = {
			'cx': 10+18.5*node.scatterXMobile,
			'cy': -20+canvasHeight - 11.5*node.scatterYMobile,
			'r': 26,
			'opacity': 0.25
	}}
} // transition1()



//----------------------------------------------------------------------------
//  ALL THE ACTION
//----------------------------------------------------------------------------

d3.json('circlesMoveToZero.json').then(data => {
  circleData = data;
}).then( function() {

  //initiateCircleInfo(circleData)
  //animateCircles(transition1)
	//setTimeout(animateCircles(transition1),7000)

	databind(circleData)

	var t = d3.timer(function(elapsed) {
		drawCircles()
		if (elapsed > 3000) t.stop();
	}); // Timer running the draw function repeatedly for 300 ms.


	// transition1()
	// animateCircles()
	// update circleEndInfo with new positions
	// sleep or similar
	// animateCircles()
	// repeat...


})
