
let data = [];
let width = 750
let height = 400
dataSet = [];

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

function databind(data) {    // Bind data to custom elements.
  let join = custom.selectAll('custom.circle')
    .data(data);
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



d3.json('circlesMoveToZero.json').then(data => {
  dataSet = data;
}).then( function() {

  databind(dataSet); // Build the custom elements in memory.
  var t = d3.timer(function(elapsed) {
    drawCircles();
    if (elapsed > 300) t.stop();
  }); // Timer running the draw function repeatedly for 300 ms.
})
