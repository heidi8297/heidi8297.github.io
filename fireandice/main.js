// original radial area chart example pulled from Harry Stevens
// https://bl.ocks.org/HarryStevens/8b14e4a0bed88724926a9a0a63e7eb3b

// this function makes our svg responsive to the size of the container/screen!
// initial version provided by Ben Clinkinbeard and Brendan Sudol
function responsivefy(thisSvg,maxWidth=4000) {
  const container = d3.select(thisSvg.node().parentNode),
    width = parseInt(thisSvg.style('width'), 10),
    height = parseInt(thisSvg.style('height'), 10),
    aspect = width / height;
  thisSvg.attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMinYMid')
    .call(resize);
  d3.select(window).on(
    'resize.' + container.attr('id'),
    resize
  );
  function resize() {
    const w = Math.min(maxWidth,parseInt(container.style('width')));
    thisSvg.attr('width', w);
    thisSvg.attr('height', Math.round(w / aspect));
  }
}

function circPath(radiusX,i,n) {
  return `M${radiusX*Math.cos(2*Math.PI*(i-3)/n)},${radiusX*Math.sin(2*Math.PI*(i-3)/n)} A ${radiusX}, ${radiusX}, 0, 0,1, ${radiusX*Math.cos(2*Math.PI*(i-2)/n)},${radiusX*Math.sin(2*Math.PI*(i-2)/n)}`
}

console.log(circPath(200,1,12));


// Dimensions
const margin = {left: 28, right: 28, top: 28, bottom: 28};
let width, height;

// Data
let data = [];
const days = d3.timeDay.range(new Date(2016, 9, 30), new Date(2017, 10, 2));

const shift = -0.004; //0.1585
// Scales
const xScale = d3.scaleTime()
    .domain(d3.extent(days))
    .range([0+shift*Math.PI, Math.PI * 2 +shift*Math.PI]);

var parseTime = d3.timeParse("%Y-%m-%dT%H:%M:%S");

const yScale = d3.scaleRadial()
    .domain([5, 180]);

// Generators
const areaGenerator = d3.areaRadial()
    .angle(d => xScale(parseTime(d.DATE)))
    .innerRadius(d => yScale(+d.DailyMinimumDryBulbTemperature))
    .outerRadius(d => yScale(+d.DailyMaximumDryBulbTemperature))
    .curve(d3.curveBasis);

const lineGenerator = d3.lineRadial()
    .angle(d => xScale(parseTime(d.DATE)))
    .radius(d => yScale(+d.DailyAverageDryBulbTemperature));


// Elements
const svg = d3.select(".radialChart").append("svg");
const g = svg.append("g");

const xAxis = g.append("g")
    .attr("class", "axis");

console.log(d3.timeMonth.every(1).range(...d3.extent(days)));

const xAxisTicks = xAxis.selectAll(".tick")
    .data(d3.timeMonth.every(1).range(...d3.extent(days)))
  .enter().append("g")
    .attr("class", "tick");

xAxisTicks.append("line")
    .attr("y2", -10);

// https://www.visualcinnamon.com/2015/09/placing-text-on-arcs/
g.selectAll("path.monthLabel")
  .data(d3.timeMonth.every(1).range(...d3.extent(days)))
  .enter().append("path")
  .attr("id",d=>"label"+`${d3.timeFormat("%B")(d)}`)
  .attr("class", "monthLabel")
  .attr("d", (d,i) => circPath(500,i,12))
  .style("fill","none")
  .style("stroke","none")

g.selectAll("text.monthLabel")
  .data(d3.timeMonth.every(1).range(...d3.extent(days)))
  .enter().append("text")
  .append("textPath")
  .attr("xlink:href",d=>"#label"+`${d3.timeFormat("%B")(d)}`)
  .style("text-anchor","middle")
  .style("font-size","0.92rem")
  .attr("startOffset","50%")
  .text(d=>`${d3.timeFormat("%b %G")(d)}`)
  .attr("color","#555555");

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
redraw();


function redraw(resizing){  d3.csv("PDXWeatherDaily20162017.csv").then( function(flatData) {
  console.log(flatData);
  const diameter = Math.min(innerWidth, innerHeight);
  width = diameter - margin.left - margin.right;
  height = diameter - margin.top - margin.bottom;

  yScale.range([0, height / 2]);

  svg.attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .call(responsivefy, 1000);

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

  svg.append("radialGradient")
    .attr("id", "temperature-gradient")
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("cx", 0).attr("cy", 0).attr("r",yScale(30))
    .attr("fx", 0).attr("fy", 0).attr("fr",yScale(85))
  .selectAll("stop")
    .data([
      {offset: "0%", color: "#FF6A00"},
      {offset: "40%", color: "#B8AFA6"},
      {offset: "100%", color: "#21BEE9"}
    ])
  .enter().append("stop")
    .attr("offset", function(d) { return d.offset; })
    .attr("stop-color", function(d) { return d.color; });

  // General update pattern for the area, whose data changes
  const area = g.selectAll(".area")
      .data([flatData]);

  const lineAve = g.selectAll(".lineAverage")
      .data([flatData]);

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

  lineAve.enter().append("path")
    .attr("d", lineGenerator)
    .attr("class","lineAverage")
    .attr("fill", "none");

  });

}
