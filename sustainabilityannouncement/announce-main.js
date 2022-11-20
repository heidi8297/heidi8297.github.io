
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




//----------------------------------------------------------------------------
//  ALL THE ACTION
//----------------------------------------------------------------------------

d3.json('circlesMoveToZero.json').then(data => {
  circleData = data;
}).then( function() {

	databind(circleData)

	var t = d3.timer(function(elapsed) {
		drawCircles()
		if (elapsed > 3000) t.stop();
	}); // Timer running the draw function repeatedly for 300 ms.

})
