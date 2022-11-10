

// this function makes our svg responsive to the size of the container/screen!
// initial version provided by Ben Clinkinbeard and Brendan Sudol
function responsivefy(thisSvg,maxWidth=4000) {
  console.log("running responsivefy");
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



const canvasWidth = 4000;
const canvasHeight = 3200;

// this should be the same size as defined in CSS
const dispWidth = 1000;
const dispHeight = 800;
const scaleFactor = canvasWidth/dispWidth;
eventData = [];


function initializeDrawingSpaces() {
  // create an svg which we will use for our world map / background image
  svgBackground = d3.select("#viz-container").append('svg')
    .attr("class", "svgBackground"); // this is purely to make it easy to see in 'inspect'

  // create variables for referring to the 'canvas' element in HTML and to its CONTEXT
  //   the latter of which will be used for rendering our elements to the canvas
  // note that defining the width/height of the drawing space is distinct from
  //   setting the size in CSS
  mainCanvas = d3.select('#viz-container')
    .append('canvas')
    .attr('width', canvasWidth)
    .attr('height', canvasHeight)
    .attr("class", "mainCanvas"); // this is purely to make it easy to see in 'inspect'
  mainCtx = mainCanvas.node().getContext('2d');

  // create an svg which we will use for axes and/or other plotting needs
  svgForeground = d3.select("#viz-container").append('svg')
    .attr("class", "svgForeground"); // this is purely to make it easy to see in 'inspect'

  // create a text element for our graph titles
  mainGraphTitle = svgForeground.append("text")
    .attr("class","graphTitle")
    .text("This is my graph title")
    .attr("x", 30)
    .attr("y", 50)
    .style("opacity",0)

  // create a map to keep track of the graph titles
  graphTitles = {
    "1": "",
    "2": "Total event counts by disaster type",
    "3A": "1960",
    "3B": "An unsettling increase in frequency"
  }


  // create a hidden canvas in which each circle will have a different color
  // we can use this for tooltips
  let hiddenCanvas  = d3.select('#viz-container')
    .append('canvas')
    .attr('width', canvasWidth)
    .attr('height', canvasHeight)
    .style('display','none')
    .attr("class", "hiddenCanvas"); // this is purely to make it easy to see in 'inspect'
  hiddenCtx = hiddenCanvas.node().getContext("2d");

  // Define the div for two tooltips - one for the viz container and one for the entire page
  tooltipMain = d3.select('#viz-container').append("div")
    .attr("class", "tooltip tooltipMain");
  tooltipAux = d3.select('body').append("div")
    .attr("class", "tooltip tooltipAux");


  //const offscreen = document.querySelector('.mainCanvas').transferControlToOffscreen();
  //const mainWorker = new Worker('mainWorker.js');

}
initializeDrawingSpaces()


// initialize the visualization
function init() {
  let stepInc = lockInc += 1;
  setupCharts()
  createAnnotations()
  // the below is just 'animateCircles' without the 'moveCircles' step
  let dt = 0;
  let t = d3.timer(function(elapsed) {
    //stats.begin();
    interpCircMove(elapsed - dt);
    dt = elapsed;
    drawCircles(mainCtx)
    //stats.end();
    if (elapsed > setDuration || stepInc !== lockInc) t.stop();
  });
  update(0)
}; // init()


// create dicts to keep track of circle positions for the transitions
function initiateCircleInfo() {
  for (let i = 0; i < eventData.length; i++) {
    let node = eventData[i]
    circleStartInfo[i] = {
      'cx': node.gridX,
      'cy': node.gridY,
      'r': 16,
      'fill': typeColor(node.disasterType), // set fill once and then leave it alone
      'opacity': 0
    }
    circleEndInfo[i] = {
      'cx': node.gridX,
      'cy': node.gridY,
      'r': 16,
      'fill': typeColor(node.disasterType), // set fill once and then leave it alone
      'opacity': 0.3
    }
  }
}
initiateCircleInfo()



d3.json('circlesMoveToZero.json', function(d) {
  return {
    id: 1,
    country: "Hello",
    iso3: 43,
    otherNotes: ""
  }
  }).then(disData => {
  data = disData;

  // rollup/collapse the data in various ways to support the different visualization components
  eventData = data;

  init()

})
