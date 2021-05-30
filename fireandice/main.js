// original radial area chart example pulled from Harry Stevens
// https://bl.ocks.org/HarryStevens/8b14e4a0bed88724926a9a0a63e7eb3b


// define a set of scalars for scaling the different elements of the viz
// this way they can be adjusted in one place
const lineRad = 110;
const labelRad = 100;
const bubbleRad = 115;
const bubbleRad2 = 0.05;
const hazeRad = 138;
const hazeRad2 = 4;
const fireLineScale = 0.0004;
const fireIconScale = 0.025;
const iceScale = 86;
const iceIconScale = 0.012;
const snowIconScale = 0.015;
const lineWidth = 1.5;
const annotSize = 0.28;


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

// define some functions for creating "text wrap" for svg text elements
// functions from Carys Mills
// https://medium.com/@CarysMills/wrapping-svg-text-without-svg-2-ecbfb58f7ba4
function getTextWidth(text, font = "500 12px sans-serif") {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = font;
  return context.measureText(text).width;
}
function breakString(word, maxWidth, hyphenCharacter='-') {
  const characters = word.split("");
  const lines = [];
  let currentLine = "";
  characters.forEach((character, index) => {
    const nextLine = `${currentLine}${character}`;
    const lineWidth = getTextWidth(nextLine);
    if (lineWidth >= maxWidth) {
      const currentCharacter = index + 1;
      const isLastLine = characters.length === currentCharacter;
      const hyphenatedNextLine = `${nextLine}${hyphenCharacter}`;
      lines.push(isLastLine ? nextLine : hyphenatedNextLine);
      currentLine = "";
    } else {
      currentLine = nextLine;
    }
  });
  return { hyphenatedStrings: lines, remainingWord: currentLine };
}
function wrapLabel(label, maxWidth) {
  const words = label.split(" ");
  const completedLines = [];
  let nextLine = "";
  words.forEach((word, index) => {
    const wordLength = getTextWidth(`${word} `);
    const nextLineLength = getTextWidth(nextLine);
    if (wordLength > maxWidth) {
      const { hyphenatedStrings, remainingWord } = breakString(word, maxWidth);
      completedLines.push(nextLine, ...hyphenatedStrings);
      nextLine = remainingWord;
    } else if (nextLineLength + wordLength >= maxWidth) {
      completedLines.push(nextLine);
      nextLine = word;
    } else {
      nextLine = [nextLine, word].filter(Boolean).join(" ");
    }
    const currentWord = index + 1;
    const isLastWord = currentWord === words.length;
    if (isLastWord) {
      completedLines.push(nextLine);
    }
  });
  return completedLines.filter(line => line !== "");
}



// define a circular svg (arc) path for month labels
function circPath(radiusX,i,n) {
  return `M${radiusX*Math.cos(2*Math.PI*(i-3)/n)},${radiusX*Math.sin(2*Math.PI*(i-3)/n)} A ${radiusX}, ${radiusX}, 0, 0,1, ${radiusX*Math.cos(2*Math.PI*(i-2)/n)},${radiusX*Math.sin(2*Math.PI*(i-2)/n)}`
}

// define the icon paths
// icons all from FontAwesome
const firePath = "m 61.604534,334.8 c 0.58,0.37 0.91,0.55 0.91,0.55 z m 93.789996,0.55 0.17,-0.13 c -0.19,0.13 -0.26,0.18 -0.17,0.13 z m 3.13,-158.18 c -16.24,-4.15 50.41,-82.89 -68.049996,-177.17 0,0 15.539996,49.38 -62.83,159.57 -74.27,104.35 23.46,168.73 34,175.23 -6.73,-4.35 -47.4,-35.7 9.55,-128.64 11,-18.3 25.53,-34.87 43.499996,-72.16 0,0 15.91,22.45 7.6,71.13 -12.46,73.6 53.84,52.51 54.84,53.54 22.75,26.78 -17.72,73.51 -21.58,76.55 5.49,-3.65 117.71,-78 33,-188.1 -5.99,6.01 -13.8,34.2 -30.03,30.05 z";

const snowPath = "M440.3 345.2l-33.8-19.5 26-7c8.2-2.2 13.1-10.7 10.9-18.9l-4-14.9c-2.2-8.2-10.7-13.1-18.9-10.9l-70.8 19-63.9-37 63.8-36.9 70.8 19c8.2 2.2 16.7-2.7 18.9-10.9l4-14.9c2.2-8.2-2.7-16.7-10.9-18.9l-26-7 33.8-19.5c7.4-4.3 9.9-13.7 5.7-21.1L430.4 119c-4.3-7.4-13.7-9.9-21.1-5.7l-33.8 19.5 7-26c2.2-8.2-2.7-16.7-10.9-18.9l-14.9-4c-8.2-2.2-16.7 2.7-18.9 10.9l-19 70.8-62.8 36.2v-77.5l53.7-53.7c6.2-6.2 6.2-16.4 0-22.6l-11.3-11.3c-6.2-6.2-16.4-6.2-22.6 0L256 56.4V16c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16v40.4l-19.7-19.7c-6.2-6.2-16.4-6.2-22.6 0L138.3 48c-6.3 6.2-6.3 16.4 0 22.6l53.7 53.7v77.5l-62.8-36.2-19-70.8c-2.2-8.2-10.7-13.1-18.9-10.9l-14.9 4c-8.2 2.2-13.1 10.7-10.9 18.9l7 26-33.8-19.5c-7.4-4.3-16.8-1.7-21.1 5.7L2.1 145.7c-4.3 7.4-1.7 16.8 5.7 21.1l33.8 19.5-26 7c-8.3 2.2-13.2 10.7-11 19l4 14.9c2.2 8.2 10.7 13.1 18.9 10.9l70.8-19 63.8 36.9-63.8 36.9-70.8-19c-8.2-2.2-16.7 2.7-18.9 10.9l-4 14.9c-2.2 8.2 2.7 16.7 10.9 18.9l26 7-33.8 19.6c-7.4 4.3-9.9 13.7-5.7 21.1l15.5 26.8c4.3 7.4 13.7 9.9 21.1 5.7l33.8-19.5-7 26c-2.2 8.2 2.7 16.7 10.9 18.9l14.9 4c8.2 2.2 16.7-2.7 18.9-10.9l19-70.8 62.8-36.2v77.5l-53.7 53.7c-6.3 6.2-6.3 16.4 0 22.6l11.3 11.3c6.2 6.2 16.4 6.2 22.6 0l19.7-19.7V496c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16v-40.4l19.7 19.7c6.2 6.2 16.4 6.2 22.6 0l11.3-11.3c6.2-6.2 6.2-16.4 0-22.6L256 387.7v-77.5l62.8 36.2 19 70.8c2.2 8.2 10.7 13.1 18.9 10.9l14.9-4c8.2-2.2 13.1-10.7 10.9-18.9l-7-26 33.8 19.5c7.4 4.3 16.8 1.7 21.1-5.7l15.5-26.8c4.3-7.3 1.8-16.8-5.6-21z";

const icePath = "M511.4 37.9C515.1 18.2 500 0 480 0H32C10.6 0-4.8 20.7 1.4 41.2l87.1 273.4c2.5 7.2 12.7 7.2 15.1 0L140 190.5l44.2 187.3c1.9 8.3 13.7 8.3 15.6 0l46.5-196.9 34.1 133.4c2.3 7.6 13 7.6 15.3 0l45.8-172.5 66.7 363.8c1.7 8.6 14 8.6 15.7 0l87.5-467.7z"

const rainPath = "m 288,256 c 53,0 96,-42.1 96,-94 C 384,122 326.9,41.3 300.8,6.4 294.4,-2.1 281.6,-2.1 275.2,6.4 249.1,41.3 192,122 192,162 c 0,51.9 43,94 96,94 z";


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

const yScale = d3.scaleLinear()
  .domain([0, 80]);

const diameter = Math.min(innerWidth, innerHeight);
width = 1.35*(diameter - margin.left - margin.right);
height = (diameter - margin.top - margin.bottom);

yScale.range([0, height / 3.5]);

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
const g = svg.append("g").attr("class","centered");


// DEFINE A SET OF GRADIENTS
// Create the svg:defs element
var svgDefs = svg.append('defs');

// define gradients
var gradRain = svgDefs.append('linearGradient').attr('id', 'gradRain');
gradRain.append('stop').attr('class', 'stop-left').attr('offset', '0.15');
gradRain.append('stop').attr('class', 'stop-right').attr('offset', '0.85');
var gradHaze = svgDefs.append('radialGradient').attr('id', 'gradHaze');
gradHaze.append('stop').attr('class', 'stop-1').attr('offset', '0.04');
gradHaze.append('stop').attr('class', 'stop-2').attr('offset', '0.51');
gradHaze.append('stop').attr('class', 'stop-3').attr('offset', '0.76');
gradHaze.append('stop').attr('class', 'stop-4').attr('offset', '0.99');


const xAxis = g.append("g")
    .attr("class", "axis");

console.log(d3.timeMonth.every(1).range(...d3.extent(days)));

const xAxisTicks = xAxis.selectAll(".tick")
    .data(d3.timeMonth.every(1).range(...d3.extent(days)))
  .enter().append("g")
    .attr("class", "tick");

const yAxis = g.append("g")
    .attr("class", "axis");

const yAxisTicks = yAxis.selectAll(".tick")
    .data(yScale.ticks(0).slice(1))
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

  xAxisTicks.append("line")
      .attr("y2", yScale(680));

  svg.attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .call(responsivefy, 1200);

  g.attr("transform", `translate(${margin.left + width / 2}, ${margin.top + height / 2})`);

  xAxisTicks.attr("transform", (d, i, e) => {
    const point = [width / 2, 0];
    const angle = i / e.length * 360;
    const rotated = geometric.pointRotate(point, 270 + angle);
    return `translate(${rotated}) rotate(${angle})`;
  });

  // add month labels and make them follow the curvature of the circle
  // https://www.visualcinnamon.com/2015/09/placing-text-on-arcs/
  const monthLabels = g.append("g").attr("class","monthLabels");
  monthLabels.selectAll("path.monthLabel")
    .data(d3.timeMonth.every(1).range(...d3.extent(days)))
    .enter().append("path")
    .attr("id",d=>"label"+`${d3.timeFormat("%B%Y")(d)}`)
    .attr("class", "monthLabel")
    .attr("d", (d,i) => circPath(yScale(labelRad),i,12));

  monthLabels.selectAll("text.monthLabel")
    .data(d3.timeMonth.every(1).range(...d3.extent(days)))
    .enter().append("text")
    .attr("class","monthLabel")
    .append("textPath")
    .style("font-size", yScale(4.5).toString()+"px")
    .attr("xlink:href",d=>"#label"+`${d3.timeFormat("%B%Y")(d)}`)
    .attr("startOffset","50%")
    .text(d=>`${d3.timeFormat("%b %Y")(d)}`);

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
  const areaGroup = g.append("g").attr("class","areaGroup");
  const area = areaGroup.selectAll(".area")
      .data([flatData]);

  // line chart for average temperature data
  const lineAve = areaGroup.selectAll(".lineAverage")
      .data([flatData]);

  area.attr("d", areaGenerator);

  area.enter().append("path")
    .attr("class", "area")
    .attr("d", areaGenerator)
    .style("opacity", 1);

  lineAve.enter().append("path")
    .attr("d", lineGenerator)
    .attr("class","lineAverage")
    .attr("stroke-width", yScale(0.9).toString()+"px")
    .attr("fill", "none");

  console.log(flatData);

  // add teardrop icons for precipitation
  const rainGroup = g.append("g").attr("class","rainGroup");
  rainGroup.selectAll("path.rain")
    .data(flatData).enter()
    .filter(d => d.DailyPrecipitation !== "")
    .append("path")
    .attr("class", "rain")
    .attr("d",rainPath)
    .attr("transform",d=>`translate (${yScale(bubbleRad)*Math.cos(xScaleReal(parseTime(d.DATE)))},${yScale(bubbleRad)*Math.sin(xScaleReal(parseTime(d.DATE)))})  rotate (${(180/Math.PI)*xScale(parseTime(d.DATE))}) scale(${yScale(bubbleRad2)*(d.DailyPrecipitation === "T" ? 0.001 : d.DailyPrecipitation )}) translate (${-285},${-128})`);

  // add circles to represent smoke or haze
  const hazeGroup = g.append("g").attr("class","hazeGroup");
  hazeGroup.selectAll("circle.haze")
    .data(flatData).enter()
    .filter(d => d.HazeSourceCount !== "")
    .append("circle")
    .attr("class","haze")
    .attr("cx", d=> yScale(hazeRad)*Math.cos(xScaleReal(parseTime(d.DATE))))
    .attr("cy", d=> yScale(hazeRad)*Math.sin(xScaleReal(parseTime(d.DATE))))
    .attr("r", d=> yScale(hazeRad2*(d.HazeSourceCount)));

  // add lines for snow
  const snowLines = g.append("g").attr("class","snowLines");
  snowLines.selectAll("line.snow")
    .data(flatData).enter()
    .filter(d => d.DailySnowfallWE !== "")
    .append("line")
    .attr("stroke-width",yScale(lineWidth))
    .attr("class", "snow" )
    .attr("x1", d => yScale(lineRad)*Math.cos(xScaleReal(parseTime(d.DATE))))
    .attr("y1", d => yScale(lineRad)*Math.sin(xScaleReal(parseTime(d.DATE))))
    .attr("x2", d => (yScale(lineRad+iceScale*parseFloat(d.DailySnowfallWE)))*Math.cos(xScaleReal(parseTime(d.DATE))) )
    .attr("y2", d => (yScale(lineRad+iceScale*parseFloat(d.DailySnowfallWE)))*Math.sin(xScaleReal(parseTime(d.DATE))) );

  // add lines for ice
  const iceLines = g.append("g").attr("class","iceLines");
  iceLines.selectAll("line.ice")
    .data(flatData).enter()
    .filter(d => d.IceInches !== "")
    .append("line")
    .attr("stroke-width",yScale(lineWidth))
    .attr("class", "ice" )
    .attr("x1", d => yScale(lineRad)*Math.cos(xScaleReal(parseTime(d.DATE))))
    .attr("y1", d => yScale(lineRad)*Math.sin(xScaleReal(parseTime(d.DATE))))
    .attr("x2", d => (yScale(lineRad+iceScale*parseFloat(d.IceInches)))*Math.cos(xScaleReal(parseTime(d.DATE))) )
    .attr("y2", d => (yScale(lineRad+iceScale*parseFloat(d.IceInches)))*Math.sin(xScaleReal(parseTime(d.DATE))) );

  // add snowflake icons
  const snowflakeGroup = g.append("g").attr("class","snowflakes");
  snowflakeGroup.selectAll("path.snow")
    .data(flatData).enter()
    .filter(d => d.DailySnowfallWE !== "")
    .append("path")
    .attr("class", "snow")
    .attr("d",snowPath)
    .attr("transform",d=>`translate (${(yScale(lineRad+5+iceScale*parseFloat(d.DailySnowfallWE)))*Math.cos(xScaleReal(parseTime(d.DATE)))},${(yScale(lineRad+5+iceScale*parseFloat(d.DailySnowfallWE)))*Math.sin(xScaleReal(parseTime(d.DATE)))})  rotate (${(180/Math.PI)*xScale(parseTime(d.DATE))}) scale(${yScale(snowIconScale)}) translate (${-224},${-256})`);

  // add icicle icons
  const icicleGroup = g.append("g").attr("class","icicles");
  icicleGroup.selectAll("path.ice")
    .data(flatData).enter()
    .filter(d => d.IceInches !== "")
    .append("path")
    .attr("class", "ice")
    .attr("d",icePath)
    .attr("transform",d=>`translate (${(yScale(lineRad+4+iceScale*parseFloat(d.IceInches)))*Math.cos(xScaleReal(parseTime(d.DATE)))},${(yScale(lineRad+4+iceScale*parseFloat(d.IceInches)))*Math.sin(xScaleReal(parseTime(d.DATE)))})  rotate (${(180/Math.PI)*xScale(parseTime(d.DATE))}) scale(${yScale(iceIconScale)}) translate (${-256},${-256})`);

  d3.select(".legendOverlay").raise();  // bring the legend overlay group to the front of the svg

  });  // end of flatData / csv loading

}  // end of redraw() function


d3.csv("PDXWildfires2017.csv").then( function(fireData) {

  const fireGroup = g.append("g").attr("class","fireGroup");
  fireGroup.selectAll("line.wildfire")
    .data(fireData).enter()
    .append("line")
    .attr("stroke-width",yScale(lineWidth))
    .attr("class",function(d) {
      if (d.DaysUntilContainment <= 31) {return "wildfire level1"}
      else if (d.DaysUntilContainment <= 70) {return "wildfire level2"}
      else if (d.DaysUntilContainment <= 100) { return "wildfire level3" }
      else { return "wildfire level4"}
    } )
    .attr("x1", d => yScale(lineRad)*Math.cos(xScaleReal(parseFireDate(d.StartDate))))
    .attr("y1", d => yScale(lineRad)*Math.sin(xScaleReal(parseFireDate(d.StartDate))))
    .attr("x2", d => (yScale(lineRad+fireLineScale*parseFloat(d.AcresBurned)))*Math.cos(xScaleReal(parseFireDate(d.StartDate))) )
    .attr("y2", d => (yScale(lineRad+fireLineScale*parseFloat(d.AcresBurned)))*Math.sin(xScaleReal(parseFireDate(d.StartDate))) );

  fireGroup.selectAll("path.fireIcon")
    .data(fireData).enter()
    .append("path")
    .attr("class",function(d) {
      if (d.DaysUntilContainment <= 31) {return "fireIcon level1"}
      else if (d.DaysUntilContainment <= 70) {return "fireIcon level2"}
      else if (d.DaysUntilContainment <= 100) { return "fireIcon level3" }
      else { return "fireIcon level4"}
    } )
    .attr("d",firePath)
    .attr("opacity",0.9)
    .attr("transform",d=>`translate (${(yScale(lineRad+5+fireLineScale*parseFloat(d.AcresBurned)))*Math.cos(xScaleReal(parseFireDate(d.StartDate)))},${(yScale(lineRad+5+fireLineScale*parseFloat(d.AcresBurned)))*Math.sin(xScaleReal(parseFireDate(d.StartDate)))})  rotate (${(180/Math.PI)*xScale(parseFireDate(d.StartDate))}) scale(${yScale(fireIconScale)}) translate (${-110},${-168})`);

  d3.select(".legendOverlay").raise();  // bring the legend overlay group to the front of the svg

});





// add annotations

// Warmest November on record
const annotNovText = wrapLabel("Warmest November on record", 110)
const annotNov = g.append("g")
  .attr("class","annotation nov");
const annotNovSpans = annotNov.append("text")
  .attr("y", yScale(-140))
  .attr("text-anchor","middle")
  .style("opacity",0);
annotNovText.forEach(function(string) {
  annotNovSpans.append('svg:tspan')
  .text(string)
  .attr("font-size",yScale(annotSize).toString()+"rem")
  .attr('x', yScale(36))
  .attr('dy', yScale(5))
});
annotNovSpans.transition()
  .duration(1000)
  .delay(3000)
  .style("opacity",1);

// city-wide gridlock due to unexpected snow
const annotSnowpocText = wrapLabel("Unexpected snowfall on December 14th led to a city-wide gridlock for the afternoon commute.  It took me 4.5 hours to get home including a 2 mile walk in the snow.",230);
const annotSnowpoc = g.append("g")
  .attr("class","annotation snowpoc")
  .style("opacity",0);
const annotSnowpocSpans = annotSnowpoc.append("text")
  .attr("y", yScale(-140));
annotSnowpocText.forEach(function(string) {
  annotSnowpocSpans.append('svg:tspan')
  .text(string)
  .attr("font-size",yScale(annotSize).toString()+"rem")
  .attr('x', yScale(101))
  .attr('dy', yScale(5))
});
annotSnowpoc.append("line")
  .attr("class","annotation snowpoc")
  .attr("x1", yScale(91))
  .attr("y1", yScale(-95))
  .attr("x2", yScale(99))
  .attr("y2", yScale(-124));
annotSnowpoc.transition()
  .duration(1000)
  .delay(6000)
  .style("opacity",1);

// ice storms
const annotStormText = wrapLabel("Imagine an entire city coated in half an inch of solid ice.  Now imagine that happening several times in the course of a few weeks.  That was the winter of 2016/2017.",140);
const annotStorm = g.append("g")
  .attr("class","annotation storm")
  .style("opacity",0);
const annotStormSpans = annotStorm.append("text")
  .attr("y", yScale(-15));
annotStormText.forEach(function(string) {
  annotStormSpans.append('svg:tspan')
  .text(string)
  .attr("font-size",yScale(annotSize).toString()+"rem")
  .attr('x', yScale(139))
  .attr('dy', yScale(5))
});
annotStorm.transition()
  .duration(1000)
  .delay(10000)
  .style("opacity",1);

// Warmest August on record
const annotAugText = wrapLabel("Warmest August on record", 100)
const annotAug = g.append("g")
  .attr("class","annotation aug")
  .style("opacity",0);
const annotAugSpans = annotAug.append("text")
  .attr("y", yScale(-50))
  .attr("text-anchor","middle");
annotAugText.forEach(function(string) {
  annotAugSpans.append('svg:tspan')
  .text(string)
  .attr("font-size",yScale(annotSize).toString()+"rem")
  .attr('x', yScale(-170))
  .attr('dy', yScale(5))
});
annotAug.transition()
  .duration(1000)
  .delay(14000)
  .style("opacity",1);

// Eagle Creek fire
const annotFireGorgeText = wrapLabel("The devastating Eagle Creek Fire began on September 2nd after someone ignited fireworks during a burn ban.", 170)
const annotFireGorge = g.append("g")
  .attr("class","annotation gorge")
  .style("opacity",0);
const annotFireGorgeSpans = annotFireGorge.append("text")
  .attr("y", yScale(-115));
annotFireGorgeText.forEach(function(string) {
  annotFireGorgeSpans.append('svg:tspan')
  .text(string)
  .attr("font-size",yScale(annotSize).toString()+"rem")
  .attr('x', yScale(-191))
  .attr('dy', yScale(5))
});
annotFireGorge.append("line")
  .attr("class","annotation gorge")
  .attr("x1", yScale(-150))
  .attr("y1", yScale(-97))
  .attr("x2", yScale(-123))
  .attr("y2", yScale(-77));
annotFireGorge.transition()
  .duration(1000)
  .delay(16500)
  .style("opacity",1);



// add legend overlay
const legendOverlay = g.append("g").attr("class","legendOverlay");
legendOverlay.append("rect")
  .attr("x",yScale(-192))
  .attr("y",yScale(-144))
  .attr("width",yScale(192*2))
  .attr("height",yScale(144*2))
  .style("fill","black")
  .attr("opacity",0.56);

// legend description for temperature line/area chart
legendTempText = wrapLabel("Line shows daily average temperature (degrees F), area shows high/low daily temperatures.", 130);
const legendTemp = legendOverlay.append("g")
  .attr("class","legend temp");
const legendTempSpans = legendTemp.append("text")
  .attr("y", yScale(0));
legendTempText.forEach(function(string) {
  legendTempSpans.append('svg:tspan')
  .text(string)
  .attr("font-size",yScale(annotSize).toString()+"rem")
  .attr('x', yScale(-40))
  .attr('dy', yScale(5))
});
legendTemp.append("line")
  .attr("class","legend temp")
  .attr("x1", yScale(-53))
  .attr("y1", yScale(25))
  .attr("x2", yScale(-42))
  .attr("y2", yScale(13));

// legend description for fire lines
legendFireText = wrapLabel("Orange lines represent wildfires in Oregon - length indicates number of acres burned.  The Chetno Bar fire shown here burned 191,125 acres (8th largest in OR history).", 150);
const legendFire = legendOverlay.append("g")
  .attr("class","legend fire");
const legendFireSpans = legendFire.append("text")
  .attr("y", yScale(-10));
legendFireText.forEach(function(string) {
  legendFireSpans.append('svg:tspan')
  .text(string)
  .attr("font-size",yScale(annotSize).toString()+"rem")
  .attr('x', yScale(-190))
  .attr('dy', yScale(5))
});
legendFire.append("line")
  .attr("class","legend fire")
  .attr("x1", yScale(-148))
  .attr("y1", yScale(22))
  .attr("x2", yScale(-133))
  .attr("y2", yScale(45));

// legend description for fire colors
legendContText = wrapLabel("Color indicates time to containment (darker = longer) ranging from 8 to 114 days.  This one took 113 days.", 160);
const legendCont = legendOverlay.append("g")
  .attr("class","legend cont");
const legendContSpans = legendCont.append("text")
  .attr("y", yScale(70));
legendContText.forEach(function(string) {
  legendContSpans.append('svg:tspan')
  .text(string)
  .attr("font-size",yScale(annotSize).toString()+"rem")
  .attr('x', yScale(-150))
  .attr('dy', yScale(5))
});
legendCont.append("line")
  .attr("class","legend cont")
  .attr("x1", yScale(-150))
  .attr("y1", yScale(57))
  .attr("x2", yScale(-140))
  .attr("y2", yScale(70));

// legend description for teardrops (precipitation)
legendRainText = wrapLabel("Raindrop sizes indicate precipitation amounts (inches).  This large raindrop represents 2.19'', the wettest day ever recorded in February in Portland.", 150);
const legendRain = legendOverlay.append("g")
  .attr("class","legend rain");
const legendRainSpans = legendRain.append("text")
  .attr("y", yScale(35));
legendRainText.forEach(function(string) {
  legendRainSpans.append('svg:tspan')
  .text(string)
  .attr("font-size",yScale(annotSize).toString()+"rem")
  .attr('x', yScale(130))
  .attr('dy', yScale(5))
});
legendRain.append("line")
  .attr("class","legend rain")
  .attr("x1", yScale(125))
  .attr("y1", yScale(21))
  .attr("x2", yScale(136))
  .attr("y2", yScale(34));

// legend description for haze circles
legendHazeText = wrapLabel("The hazy grey circles represent days when haze and/or smoke was detected.  Size indicates how many sources (out of 3) recorded haze or smoke on that day.", 200);
const legendHaze = legendOverlay.append("g")
  .attr("class","legend haze");
const legendHazeSpans = legendHaze.append("text")
  .attr("y", yScale(-140));
legendHazeText.forEach(function(string) {
  legendHazeSpans.append('svg:tspan')
  .text(string)
  .attr("font-size",yScale(annotSize).toString()+"rem")
  .attr('x', yScale(-140))
  .attr('dy', yScale(5))
});
legendHaze.append("line")
  .attr("class","legend haze")
  .attr("x1", yScale(-110))
  .attr("y1", yScale(-110))
  .attr("x2", yScale(-100))
  .attr("y2", yScale(-100));


// legend description for snow/ice lines
legendIceText = wrapLabel("Blue lines indicate quantities of ice and snow (in equivalent inches of water).", 155);
const legendIce = legendOverlay.append("g")
  .attr("class","legend ice");
const legendIceSpans = legendIce.append("text")
  .attr("y", yScale(-100));
legendIceText.forEach(function(string) {
  legendIceSpans.append('svg:tspan')
  .text(string)
  .attr("font-size",yScale(annotSize).toString()+"rem")
  .attr('x', yScale(127))
  .attr('dy', yScale(5))
});
legendIce.append("line")
  .attr("class","legend ice")
  .attr("x1", yScale(106))
  .attr("y1", yScale(-93))
  .attr("x2", yScale(124))
  .attr("y2", yScale(-90));

// legend (annotation) description for the snowiest day
legendSnowText = wrapLabel("10.64'' of snow (0.89'' water equivalent) recorded January 11th.", 110);
const legendSnow = legendOverlay.append("g")
  .attr("class","legend snow");
const legendSnowSpans = legendSnow.append("text")
  .attr("y", yScale(-38));
legendSnowText.forEach(function(string) {
  legendSnowSpans.append('svg:tspan')
  .text(string)
  .attr("font-size",yScale(annotSize).toString()+"rem")
  .attr('x', yScale(147))
  .attr('dy', yScale(5))
});
legendSnow.append("line")
  .attr("class","legend snow")
  .attr("x1", yScale(149))
  .attr("y1", yScale(-45))
  .attr("x2", yScale(153))
  .attr("y2", yScale(-38));


// define attribution texts for the bottom-right of the legend overlay
const attributions = legendOverlay.append("g").attr("class","legend attributions");

attributions.append("text")
  .attr("y", yScale(145))
  .attr("text-anchor","end")
  .append("svg:tspan")
  .text("Icons from FontAwesome")
  .attr("font-size",yScale(annotSize).toString()+"rem")
  .attr('x', yScale(190))
  .attr('dy', yScale(-6))
  .append("svg:tspan")
  .text("Data from NOAA, Wikipedia")
  .attr("font-size",yScale(annotSize).toString()+"rem")
  .attr('x', yScale(190))
  .attr('dy', yScale(-6))
  .append("svg:tspan")




// add mouseover event to show legend overlay
var item = document.getElementById("infoIcon");
item.addEventListener("mouseover", show, false);
item.addEventListener("mouseout", hide, false);
function show() {legendOverlay.style("opacity",1)}
function hide() {legendOverlay.style("opacity",0)}
