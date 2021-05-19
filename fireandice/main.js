// original radial area chart example pulled from Harry Stevens
// https://bl.ocks.org/HarryStevens/8b14e4a0bed88724926a9a0a63e7eb3b

// this function makes our svg responsive to the size of the container/screen!
// initial version provided by Ben Clinkinbeard and Brendan Sudol
function responsivefy(thisSvg,maxWidth=4000) {
  // container will be the DOM element that the svg is appended to
  // we then measure the container and find its aspect ratio
  const container = d3.select(thisSvg.node().parentNode),
    width = parseInt(thisSvg.style('width'), 10),
    height = parseInt(thisSvg.style('height'), 10),
    aspect = width / height;

  // set viewBox attribute to the initial size control scaling without
  // preserveAspectRatio
  // resize svg on inital page load
  thisSvg.attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMinYMid')
    .call(resize);

  // add a listener so the chart will be resized when the window resizes
  // multiple listeners for the same event type requires a namespace, i.e.,
  // 'click.foo'
  // api docs: https://goo.gl/F3ZCFr
  d3.select(window).on(
    'resize.' + container.attr('id'),
    resize
  );

  // this is the code that resizes the chart
  // it will be called on load and in response to window resizes
  // gets the width of the container and resizes the svg to fill it
  // while maintaining a consistent aspect ratio
  function resize() {
    const w = Math.min(maxWidth,parseInt(container.style('width')));
    thisSvg.attr('width', w);
    thisSvg.attr('height', Math.round(w / aspect));
  }
}


// Dimensions
const margin = {left: 28, right: 28, top: 28, bottom: 28};
let width, height;

// Data
let data = [];
const days = d3.timeDay.range(new Date(2019, 0, 1), new Date(2020, 0, 1));

// Scales
const xScale = d3.scaleTime()
    .domain(d3.extent(days))
    .range([0, Math.PI * 2]);

const yScale = d3.scaleRadial()
    .domain([0, 60]);

// Generators
const areaGenerator = d3.areaRadial()
    .angle(d => xScale(d.date))
    .innerRadius(d => yScale(d.v0))
    .outerRadius(d => yScale(d.v1))
    .curve(d3.curveBasis);

// Elements
const svg = d3.select(".radialChart").append("svg");
const g = svg.append("g");

const xAxis = g.append("g")
    .attr("class", "axis");

const xAxisTicks = xAxis.selectAll(".tick")
    .data(d3.timeMonth.every(1).range(...d3.extent(days)))
  .enter().append("g")
    .attr("class", "tick");

xAxisTicks.append("text")
    .attr("dy", -15)
    .text(d => `${d3.timeFormat("%b")(d)}.`);

xAxisTicks.append("line")
    .attr("y2", -10);

const yAxis = g.append("g")
    .attr("class", "axis");

const yAxisTicks = yAxis.selectAll(".tick")
    .data(yScale.ticks(4).slice(1))
  .enter().append("g")
    .attr("class", "tick");

const yAxisCircles = yAxisTicks.append("circle");

const yAxisTextTop = yAxisTicks.append("text")
    .attr("dy", -5)
    .text(d => d);

const yAxisTextBottom = yAxisTicks.append("text")
    .attr("dy", 12)
    .text(d => d);

// Updater
const duration = 750;
makeData();
redraw();
onresize = _ => redraw(true);
d3.interval(_ => {
  makeData();
  redraw();
}, duration * 2);

function redraw(resizing){
  const diameter = Math.min(innerWidth, innerHeight);
  width = diameter - margin.left - margin.right;
  height = diameter - margin.top - margin.bottom;

  yScale.range([0, height / 2]);

  svg.attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .call(responsivefy);

  g.attr("transform", `translate(${margin.left + width / 2}, ${margin.top + height / 2})`);

  xAxisTicks
      .attr("transform", (d, i, e) => {
        const point = [width / 2, 0];
        const angle = i / e.length * 360;
        const rotated = geometric.pointRotate(point, 270 + angle);
        return `translate(${rotated}) rotate(${angle})`;
      });

  yAxisCircles.attr("r", d => yScale(d));

  yAxisTextTop.attr("y", d => yScale(d));

  yAxisTextBottom.attr("y", d => -yScale(d));

  // General update pattern for the area, whose data changes
  const area = g.selectAll(".area")
      .data([data]);

  if (resizing){
    area.attr("d", areaGenerator);
  }
  else {
    area.transition().duration(duration)
      .attr("d", areaGenerator);
  }

  area.enter().append("path")
    .attr("class", "area")
    .attr("d", areaGenerator)
    .style("opacity", 0)
    .transition().duration(duration)
      .style("opacity", 1);
}

// Functions for generating random data
function makeData(){
  let v0 = randBetween(5, 25);
      v1 = randBetween(40, 60);

  data = days.map(date => {
    v1 = Math.min(v1 + random([-1, 1]), 60)
    v0 = Math.min(Math.max(v0 + random([-1, 1]), 1), v1 - 5)
    const obj = {
      date,
      v1,
      v0
    };
    return obj;
  });
}

function randBetween(min, max){
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function random(arr){
  return arr[randBetween(0, arr.length - 1)];
}
