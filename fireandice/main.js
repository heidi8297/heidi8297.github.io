// original radial area chart example pulled from Harry Stevens
// https://bl.ocks.org/HarryStevens/8b14e4a0bed88724926a9a0a63e7eb3b


const fireRad = 210;
const labelRad = 340;
const bubbleRad = 200;


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

// define a circular svg path
function circPath(radiusX,i,n) {
  return `M${radiusX*Math.cos(2*Math.PI*(i-3)/n)},${radiusX*Math.sin(2*Math.PI*(i-3)/n)} A ${radiusX}, ${radiusX}, 0, 0,1, ${radiusX*Math.cos(2*Math.PI*(i-2)/n)},${radiusX*Math.sin(2*Math.PI*(i-2)/n)}`
}

const firePath = "m 61.604534,334.8 c 0.58,0.37 0.91,0.55 0.91,0.55 z m 93.789996,0.55 0.17,-0.13 c -0.19,0.13 -0.26,0.18 -0.17,0.13 z m 3.13,-158.18 c -16.24,-4.15 50.41,-82.89 -68.049996,-177.17 0,0 15.539996,49.38 -62.83,159.57 -74.27,104.35 23.46,168.73 34,175.23 -6.73,-4.35 -47.4,-35.7 9.55,-128.64 11,-18.3 25.53,-34.87 43.499996,-72.16 0,0 15.91,22.45 7.6,71.13 -12.46,73.6 53.84,52.51 54.84,53.54 22.75,26.78 -17.72,73.51 -21.58,76.55 5.49,-3.65 117.71,-78 33,-188.1 -5.99,6.01 -13.8,34.2 -30.03,30.05 z";

const snowPath = "M440.3 345.2l-33.8-19.5 26-7c8.2-2.2 13.1-10.7 10.9-18.9l-4-14.9c-2.2-8.2-10.7-13.1-18.9-10.9l-70.8 19-63.9-37 63.8-36.9 70.8 19c8.2 2.2 16.7-2.7 18.9-10.9l4-14.9c2.2-8.2-2.7-16.7-10.9-18.9l-26-7 33.8-19.5c7.4-4.3 9.9-13.7 5.7-21.1L430.4 119c-4.3-7.4-13.7-9.9-21.1-5.7l-33.8 19.5 7-26c2.2-8.2-2.7-16.7-10.9-18.9l-14.9-4c-8.2-2.2-16.7 2.7-18.9 10.9l-19 70.8-62.8 36.2v-77.5l53.7-53.7c6.2-6.2 6.2-16.4 0-22.6l-11.3-11.3c-6.2-6.2-16.4-6.2-22.6 0L256 56.4V16c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16v40.4l-19.7-19.7c-6.2-6.2-16.4-6.2-22.6 0L138.3 48c-6.3 6.2-6.3 16.4 0 22.6l53.7 53.7v77.5l-62.8-36.2-19-70.8c-2.2-8.2-10.7-13.1-18.9-10.9l-14.9 4c-8.2 2.2-13.1 10.7-10.9 18.9l7 26-33.8-19.5c-7.4-4.3-16.8-1.7-21.1 5.7L2.1 145.7c-4.3 7.4-1.7 16.8 5.7 21.1l33.8 19.5-26 7c-8.3 2.2-13.2 10.7-11 19l4 14.9c2.2 8.2 10.7 13.1 18.9 10.9l70.8-19 63.8 36.9-63.8 36.9-70.8-19c-8.2-2.2-16.7 2.7-18.9 10.9l-4 14.9c-2.2 8.2 2.7 16.7 10.9 18.9l26 7-33.8 19.6c-7.4 4.3-9.9 13.7-5.7 21.1l15.5 26.8c4.3 7.4 13.7 9.9 21.1 5.7l33.8-19.5-7 26c-2.2 8.2 2.7 16.7 10.9 18.9l14.9 4c8.2 2.2 16.7-2.7 18.9-10.9l19-70.8 62.8-36.2v77.5l-53.7 53.7c-6.3 6.2-6.3 16.4 0 22.6l11.3 11.3c6.2 6.2 16.4 6.2 22.6 0l19.7-19.7V496c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16v-40.4l19.7 19.7c6.2 6.2 16.4 6.2 22.6 0l11.3-11.3c6.2-6.2 6.2-16.4 0-22.6L256 387.7v-77.5l62.8 36.2 19 70.8c2.2 8.2 10.7 13.1 18.9 10.9l14.9-4c8.2-2.2 13.1-10.7 10.9-18.9l-7-26 33.8 19.5c7.4 4.3 16.8 1.7 21.1-5.7l15.5-26.8c4.3-7.3 1.8-16.8-5.6-21z";

const icePath = "M511.4 37.9C515.1 18.2 500 0 480 0H32C10.6 0-4.8 20.7 1.4 41.2l87.1 273.4c2.5 7.2 12.7 7.2 15.1 0L140 190.5l44.2 187.3c1.9 8.3 13.7 8.3 15.6 0l46.5-196.9 34.1 133.4c2.3 7.6 13 7.6 15.3 0l45.8-172.5 66.7 363.8c1.7 8.6 14 8.6 15.7 0l87.5-467.7z"

// Dimensions
const margin = {left: 10, right: 10, top: 10, bottom: 10};
let width, height;

// Data
let data = [];
const days = d3.timeDay.range(new Date(2016, 9, 30), new Date(2017, 10, 2));

const shift = -0.008; //0.1585
// Scales
const xScale = d3.scaleTime()
    .domain(d3.extent(days))
    .range([0+shift*Math.PI, Math.PI * 2 +shift*Math.PI]);

const daysReal = d3.timeDay.range(new Date(2016, 10, 31), new Date(2017, 11, 1));

const xScaleReal = d3.scaleTime()
  .domain(d3.extent(days))
  .range([1.5*Math.PI, (2+ 1.5)*Math.PI]);

const parseTime = d3.timeParse("%Y-%m-%dT%H:%M:%S");
const parseFireDate = d3.timeParse("%e-%b-%y");

const yScale = d3.scaleRadial()
    .domain([5, 300]);

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
    .attr("y2", 680);

// add month labels and make them follow the curvature of the circle
// https://www.visualcinnamon.com/2015/09/placing-text-on-arcs/
g.selectAll("path.monthLabel")
  .data(d3.timeMonth.every(1).range(...d3.extent(days)))
  .enter().append("path")
  .attr("id",d=>"label"+`${d3.timeFormat("%B%Y")(d)}`)
  .attr("class", "monthLabel")
  .attr("d", (d,i) => circPath(labelRad,i,12));

g.selectAll("text.monthLabel")
  .data(d3.timeMonth.every(1).range(...d3.extent(days)))
  .enter().append("text")
  .attr("class","monthLabel")
  .append("textPath")
  .attr("xlink:href",d=>"#label"+`${d3.timeFormat("%B%Y")(d)}`)
  .attr("startOffset","50%")
  .text(d=>`${d3.timeFormat("%b %Y")(d)}`);

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
redraw();


function redraw(){  d3.csv("PDXWeatherDaily20162017.csv").then( function(flatData) {
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

  // create the color gradient for the temperature line graph
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

  // area chart for high/low temperature data
  const area = g.selectAll(".area")
      .data([flatData]);

  // line chart for average temperature data
  const lineAve = g.selectAll(".lineAverage")
      .data([flatData]);

  area.attr("d", areaGenerator);

  area.enter().append("path")
    .attr("class", "area")
    .attr("d", areaGenerator)
    .style("opacity", 1);

  lineAve.enter().append("path")
    .attr("d", lineGenerator)
    .attr("class","lineAverage")
    .attr("fill", "none");

  console.log(flatData);

  g.selectAll("circle.fireice")
    .data(flatData)
    .enter().append("circle")
    .attr("class","fireice")
    .attr("cx", d=> bubbleRad*Math.cos(xScaleReal(parseTime(d.DATE))))
    .attr("cy", d=> bubbleRad*Math.sin(xScaleReal(parseTime(d.DATE))))
    .attr("r", d=> 10*(d.DailyPrecipitation === "T" ? 0.001 : d.DailyPrecipitation))
    .attr("opacity",0.7)
    .attr("fill","#86E0E9")

  });
}  // end of flatData / csv loading


d3.csv("PDXWildfires2017.csv").then( function(fireData) {

  g.selectAll("line.wildfire")
    .data(fireData)
    .enter().append("line")
    .attr("class","wildfire")
    .attr("x1", d => fireRad*Math.cos(xScaleReal(parseFireDate(d.StartDate))))
    .attr("y1", d => fireRad*Math.sin(xScaleReal(parseFireDate(d.StartDate))))
    .attr("x2", d => (fireRad+0.0016*parseFloat(d.AcresBurned))*Math.cos(xScaleReal(parseFireDate(d.StartDate))) )
    .attr("y2", d => (fireRad+0.0016*parseFloat(d.AcresBurned))*Math.sin(xScaleReal(parseFireDate(d.StartDate))) );

  g.selectAll("path.fireIcon")
    .data(fireData)
    .enter().append("path")
    .attr("class","fireIcon")
    .attr("d",firePath)
    .attr("opacity",0.9)
    .attr("transform",d=>`translate (${(fireRad+8+0.0016*parseFloat(d.AcresBurned))*Math.cos(xScaleReal(parseFireDate(d.StartDate)))},${(fireRad+8+0.0016*parseFloat(d.AcresBurned))*Math.sin(xScaleReal(parseFireDate(d.StartDate)))})  rotate (${(180/Math.PI)*xScale(parseFireDate(d.StartDate))}) scale(.06) translate (${-110},${-168})`);

    console.log(fireData);

});
