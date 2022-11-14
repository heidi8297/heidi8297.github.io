
let data = [];
let width = 750;
let height = 400;
let circleData = [];

// variables needed for transition method
let circleStartInfo = {};
let circleEndInfo = {};
const ease = d3.easeCubicInOut;
const setDuration = 2000;
let timeElapsed = 0;
let interpolators = null;

d3.range(5000).forEach(function(el) {
  data.push({ value: el });
});



let canvas = d3.select('#viz-container')
  .append('canvas')
  .attr('width', width)
  .attr('height', height);

let context = canvas.node().getContext('2d');
let customBase = document.createElement('custom');

let custom = d3.select(customBase); // This is your SVG replacement and the parent of all other elements

function databind(dataSet) {    // Bind data to custom elements.
  let join = custom.selectAll('custom.circle')
    .data(dataSet);
  let enterSel = join.enter()
    .append('custom')
    .attr('class', 'circle')
    .attr("cx", d => 10*d.histogramX)
    .attr("cy", d => 10*d.histogramY)
    .attr('r', 0);

  join.merge(enterSel)
    .transition()
    .attr('r', 4)
    .attr('fillStyle', "#176F90");

  let exitSel = join.exit()
    .transition()
    .attr('r', 0)
    .remove();

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


// THIS FUNCTION NEEDS TO BE REBUILT TO NOT RELY ON DATA BINDING
function drawCircles() {  // draw the elements on the canvas
  context.clearRect(0, 0, width, height); // Clear the canvas.

  // Draw each individual custom element with their properties.
  let elements = custom.selectAll('custom.circle');// Grab all elements you bound data to in the databind() function.
  elements.each(function(d,i) { // For each virtual/custom element...
    let node = d3.select(this);   // This is each individual element in the loop.
    context.fillStyle = node.attr('fillStyle');   // Here you retrieve the colour from the individual in-memory node and set the fillStyle for the canvas paint
    context.globalAlpha = 1;

    context.beginPath();
    context.arc(node.attr("cx"), node.attr("cy"), node.attr("r"), 0, 2*Math.PI, true);
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
    circleStartInfo[i] = {
      'cx': node.gridX,
      'cy': node.gridY,
      'r': 16,
      'fillStyle': "#176F90", // set fill once and then leave it alone
      'opacity': 0
    }
    circleEndInfo[i] = {
      'cx': node.gridX,
      'cy': node.gridY,
      'r': 16,
      'fillStyle': "#176F90", // set fill once and then leave it alone
      'opacity': 0.3
    }
  }
}



d3.json('circlesMoveToZero.json').then(data => {
  circleData = data;
}).then( function() {

  initiateCircleInfo(circleData)

  databind(circleData); // Build the custom elements in memory.
  var t = d3.timer(function(elapsed) {
    drawCircles();
    if (elapsed > 300) t.stop();
  }); // Timer running the draw function repeatedly for 300 ms.
})
