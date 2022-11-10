// scroll to top of page on refresh (prevents issues of rendering things in the wrong order)
// from https://www.designcise.com/web/tutorial/how-to-force-scroll-to-the-top-of-the-page-on-page-reload-using-javascript
if (history.scrollRestoration) {
    history.scrollRestoration = 'manual';
} else {
    window.onbeforeunload = function () {
        window.scrollTo(0, 0);
    }
}


let mobile = false;
// for smaller devices/screens, move the viz container div above the graphic prose div
//   this allows us to create a "stacked" view for the viz and the text (phone)
//   and thus allows the viz-container to take up the width of the screen
// on tablet (or landscape-view phone) this allows us to put the viz on the left
//   and hopefully scale to fit 100% of the height (or close enough)
function orderPrimaryElements() {
  let viewWidth = Math.min( window.innerWidth, screen.width);
  // let viewHeight = Math.min( window.innerHeight, screen.height);
  (() => {
    const list = document.querySelector(".library__graphic");
    if (viewWidth < 1000) {
      mobile = true;
      list.appendChild(document.querySelector(".graphic__prose"));
      document.querySelector(".zoomInstruct").innerHTML = "If the visualization doesn't fit your screen, try pinching to zoom out.<br /><br />"
    } else {
      list.appendChild(document.querySelector(".vizWrapper"));
    }
  })();
}
orderPrimaryElements()
window.addEventListener('resize', orderPrimaryElements);

// hide mobilewarning message when user clicks "proceed anyway" button
function proceedAnyway() {
  d3.select(".mobileWarning").style("display", "none")
}

function goHome() {
  window.location = "https://heidistockton.com"
}

// one function to rule them all
// this function handles all the viz + updates, it is used in the setupWaypointsTriggers.js script
window.createGraphic = function(graphicSelector) {

	//----------------------------------------------------------------------------
	// DEFINE INITIAL VARIABLES AND FUNCTIONS
	//----------------------------------------------------------------------------
	let data = [];
	let mapData = [];
	let eventData = [];
	let eventsByType = [];
	let deathsByType = [];
  let eventsStackedByType = [];
	let firstTenYears = [];
	let lastTenYears = [];
  let eventChangesByType = [];
  let deathChangesByType = [];
	let eventsByYear = [];
	let eventsFlat = [];
  let infoState = "show";  // default to showing the legends
  let currentPane = "0";
  // determines the sort/stack order of the area segments in the stacked area chart
  const typeGroups = ["flood","storm","earthquake","landslide","extreme temperature","drought","volcanic activity"]

  // variables for the events by year animation in pane THREE
  const startingYearInc = 1960;
  const yearPausePoint = 2018.7; // the point at which to pause events by year animation
  const yearCountAnim = yearPausePoint - startingYearInc;
  const yearStop = 2021; // the point at which to reveal ALL events
  const fpsTarget = 10;   // I like 10 here
  const msTarget = Math.floor(1000/fpsTarget)
  let framesPerYear = 5;  // I like 5 here
  let yearInc = 1960;
  let readyFor2ndAnim = false;

	// variables needed for transition method
  let lockInc = 0;
	let circleStartInfo = {};
	let circleEndInfo = {};
	const ease = d3.easeCubicInOut;
	const setDuration = 2000;
	let timeElapsed = 0;
	let interpolators = null;

	// dataset to swtich between color of a circle (in the hidden canvas) and the node data
  let colToCircle = {};
  let tooltipLock = false; // be able to turn off tooltips during part of the viz story

	const canvasWidth = 4000;
	const canvasHeight = 3200;

	// this should be the same size as defined in CSS
	const dispWidth = 1000;
	const dispHeight = 800;
	const scaleFactor = canvasWidth/dispWidth;

	const speedFactor = 1.6;
  let colorblindMode = false;

	let setupComplete = false;

  // detect if offscreenCanvas is supported by the browser
  if (typeof OffscreenCanvas !== "undefined") {
      offscreenSupported = true;
  } else {
      offscreenSupported = false;
  }

  // check to see if colorblind mode has been activated
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  (urlParams.get('colorblind') == null) ? colorblindMode = false : colorblindMode = true



	// given a set of x y coordinates and a set of rectangular shapes (specified by x1 x2 y1 y2)
	//   determine if the set of x y coordinates falls inside of any of the rectangular shapes
	// this function will be used in the styling of the opening (grid) view of each event
	function insideTheWalls(x,y,rectangles) {
	// x,y = numbers, rectangles = array of objects where each object = [{x1: 1, x2: 3, y1: 3, y2: 4}]
		let result = false;
		rectangles.forEach(function(rect) {
			// check if x,y falls inside the confines of rect
			if (x >= rect['x1'] && x <= rect['x2'] && y >= rect['y1'] && y <= rect['y2']) {result = true}
		})
		return result;
	}

	// define the coordinates of some text boxes to sit inside the "grid" view of each event
	const textRectangles = [
		{'x1':229, 'x2':471, 'y1':104, 'y2':202},
		{'x1':430, 'x2':780, 'y1':252, 'y2':350},
		{'x1':80, 'x2':493, 'y1':410, 'y2':507},
		{'x1':469, 'x2':910, 'y1':579, 'y2':667}
	]

	// define custom margins for each pane
	function margins(paneNum, units = 1) {
	// paneNum is an integer from 1-10, units = 0 for canvas, 1 for svg
	// returns an object of the form {top: 120, right: 120, bottom: 120, left: 120}
	// usage:  margins(2,1).right  = give me the righthand margin for the 2nd pane in svg units
		let fScale;
		units === 0 ? fScale = scaleFactor : fScale = 1 ;
		if (paneNum === 2) { // bar chart - event count by type
			return {top: fScale*85, right: fScale*30, bottom: fScale*60, left: fScale*30}
		} else if (paneNum === 3) {
      return {top: fScale*39, right: fScale*30, bottom: fScale*30, left: fScale*85}
    } else if (paneNum === 4) { // bar chart - total death toll by type
			return {top: fScale*80, right: fScale*30, bottom: fScale*60, left: fScale*30}
		}

		// default margins
		return {top: fScale*80, right: fScale*30, bottom: fScale*30, left: fScale*30}
	}

	// complementary function to the one above, but returns the actual values of left and right instead of the margins
	function paneDim(paneNum, units = 1) { // units = 0 for canvas, 1 for svg
		let draw;
		units === 0 ? draw = {right: canvasWidth, bottom: canvasHeight} : draw = {right: dispWidth, bottom: dispHeight}
		return {
			top: margins(paneNum, units).top,
			right: draw.right - margins(paneNum, units).right,
			bottom: draw.bottom - margins(paneNum, units).bottom,
			left: margins(paneNum, units).left
		}
	}

  // define markers for pane 5 (A & B) to be used in various places
  let markers5 = { L1: 0.07, L2: 0.41, R1: 0.59, R2: 0.93 }

	function capitalize(word) { return word[0].toUpperCase() + word.slice(1) }

  // define settings for standard transitions
  function fadeOutStd(transition) {
    transition.duration(speedFactor*800).attr("opacity",0)
  }
  function fadeInStd(transition) {
    transition.duration(speedFactor*800).attr("opacity",1)
  }

  // define tooltips for each pane
  function paneTooltips(paneNum, d) {
    if (paneNum === "3A") {
      return capitalize(d.disasterType) + " in " +d.country +"<br>"+d.year +
        (d.deaths > 0 ? "<br>Deaths: " +d3.format(",")(d.deaths) : "") + "<br>Location count: " + d.geoIdCount
    } else {
      return capitalize(d.disasterType) + " in " +d.country +"<br>"+d.year +
        (d.deaths > 0 ? "<br>Deaths: " +d3.format(",")(d.deaths) : "")
    }
  }

	//Generates the next color in the sequence, going from 0,0,0 to 255,255,255.
	//From: https://bocoup.com/weblog/2d-picking-in-canvas
	let nextCol = 1;
	function genColor() {
		let ret = [];
		if (nextCol < 16777215) {   // via http://stackoverflow.com/a/15804183
				ret.push(nextCol & 0xff); // R
				ret.push((nextCol & 0xff00) >> 8); // G
				ret.push((nextCol & 0xff0000) >> 16); // B
        // you could set this to increment by 1, but I was having a lot of color
        //   collisions which were resulting in incorrect tooltips being displayed
        // this fix doesn't eliminate the issue, but it does minimize it
        // the increment used is based on needing 9000 unique colors
        nextCol += 1800;
		}
		let col = "rgb(" + ret.join(',') + ")";
		return col;
	}

	// let stats = new Stats();
	// stats.setMode(0); // 0: fps, 1: ms, 2: mb
  //
	// // align top-left
	// stats.domElement.style.position = 'fixed';
	// stats.domElement.style.left = '0px';
	// stats.domElement.style.top = '0px';
  //
	// document.body.appendChild( stats.domElement );



	//----------------------------------------------------------------------------
	// INITIALIZE DRAWING SPACES AND TOOLTIP FUNCTIONALITY
	//----------------------------------------------------------------------------

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

	// activate tooltip when the mouse moves over an event circle (not available on mobile)
  if (!mobile) {
    mainCanvas.on('mousemove', function(e) {
      drawCircles(hiddenCtx, true); // draw the hidden canvas
      let mouseX = e.layerX || e.offsetX;
      let mouseY = e.layerY || e.offsetY;
      // pick the color from the mouse position
      let pickedCol = hiddenCtx.getImageData(scaleFactor*mouseX, scaleFactor*mouseY, 1, 1).data;
      let colKey = 'rgb(' + pickedCol[0] + ',' + pickedCol[1] + ',' + pickedCol[2] + ')';
      let nodeData = colToCircle[colKey];  // get the data from our map!
      if (nodeData) {
        // Show the tooltip only when there is nodeData found by the mouse
        tooltipMain.style('opacity', 0.88)
          .style('left', mouseX + 5 + 'px')
          .style('top', mouseY + 5 + 'px')
          .html(paneTooltips(currentPane, nodeData));
      } else { // Hide the tooltip when the mouse doesn't find nodeData
        tooltipMain.style('opacity', 0);
      }
    });

    // hide tooltip when mouse leaves main canvas (not sure why 'd =>' is needed here, but it errors w/o)
    mainCanvas.on("mouseout", d => tooltipMain.style("opacity", 0));
  }




	//----------------------------------------------------------------------------
	// STEPS / TRANSITIONS
	//----------------------------------------------------------------------------

	// actions to take on each step of our scroll-driven story
	var steps = [
		function step0() {  // pane ONE
			let stepInc = lockInc += 1;
			textIntroNums1.transition() // pane ONE
				.duration(speedFactor*800)
				.attr("opacity",0.92)
			deactivatePane2()
			transitionPane1()
			animateCircles(stepInc)
		}, // step0()

		function step1() {  // pane TWO
			let stepInc = lockInc += 1;
			textIntroNums1.transition() // pane ONE
				.duration(speedFactor*500)
				.attr("opacity",0)
			barsByTypeG.transition() // pane TWO
				.duration(speedFactor*1100)
				.attr('opacity',1)
			deactivatePane3()
      deactivatePane3A()
			transitionPane2()
			animateCircles(stepInc)
		}, // step1()

		function step2() {  // pane THREE A
			console.log(document.getElementsByTagName('*').length,"DOM elements")
			let stepInc = lockInc += 1;
			deactivatePane2()
      deactivatePane3B()
			mapGroup.transition().call(fadeInStd) // pane THREE
      svgBgPane3A.transition().call(fadeInStd) // pane THREE A
      stackedAreaAux3.transition().delay(speedFactor*600).call(fadeInStd) // pane THREE
      stackedAreaBgRect.transition() // pane THREE
        .duration(0)
        .attr('opacity',1)
      // since we haven't reset the 'currentPane' variable yet, we can use it to tell
      //   which pane the user is coming from, and transition accordingly
      if (currentPane === "2") { // must be scrolling DOWN
        stackedAreaRevealRect.transition()
          .duration(0)
          .attr("x",paneDim(3).left)
          .attr('width',paneDim(3).right - paneDim(3).left)
          .attr("opacity",1)
      } else if (currentPane === "3B") { // must be scrolling UP
        stackedAreaRevealRect.transition().call(fadeInStd)
          .attr("x",paneDim(3).left)
          .attr('width',paneDim(3).right - paneDim(3).left)
      }
      stackedAreaPaths.transition().call(fadeInStd)
      d3.select(".sizeLegend1").style("display", "block") // pane THREE
			transitionPane3()
			animateCircles(stepInc,true)
      tooltipLock = true // turn off tooltips during the 'events by year' animation
      // events by year animation
      // made more complicated (but more performant!) by not using d3 transitions
      let secondAnim = d3.interval(function() {
        if (readyFor2ndAnim && stepInc === lockInc && yearInc <= yearStop) {
          let percentComplete = yearInc >= yearPausePoint ? 1 : (yearInc - startingYearInc)/yearCountAnim;
          let paneWidth = paneDim(3).right-paneDim(3).left
          stackedAreaRevealRect.transition()
            .duration(msTarget)
            .ease(d3.easeLinear)
            .attr('x',paneDim(3).left + percentComplete*paneWidth)
            .attr('width', (1-percentComplete)*paneWidth )
          sliderRect.transition()
            .duration(msTarget)
            .ease(d3.easeCubicInOut)
            .attr("x",Math.min(scaleXyear3(yearInc)-3,paneDim(3).right-3))
          mainGraphTitle.transition()
            .duration(0)
            .text(Math.floor(Math.min(2018,yearInc)))
          setOpacityForCircles()
          drawCircles(mainCtx)
          yearInc += (1/framesPerYear)
        } else if (stepInc !== lockInc || yearInc > yearStop) {
          if (yearInc > yearStop) {  // end with all events being displayed
            setOpacityForCircles(false, 0.3) // set all opacities equal to 0.3
            drawCircles(mainCtx)
            mainGraphTitle.transition()
              .duration(0)
              .text("1960-2018")
            titleHiderPane3A.transition()
              .duration(0)
              .attr("opacity", 1)
            // this step isn't necessary, but improves the transition if you're scrolling up
            stackedAreaRevealRect.transition()
              .duration(0)
              .attr("x",paneDim(3).left)
              .attr('width',paneDim(3).right - paneDim(3).left)
              .attr("opacity",0)
          }
          // reset variables and then stop the animation
          readyFor2ndAnim = false;
          tooltipLock = false; // turn tooltips back on
          yearInc = startingYearInc; // reset to starting point
          secondAnim.stop();
        }
      }, msTarget )

		} // step2()



	] // steps



	//----------------------------------------------------------------------------
	// UPDATE / SETUP FUNCTIONS - scales, svg elements, legends, annotations
	//----------------------------------------------------------------------------

	// update our chart
	function update(step) {
    if (setupComplete) { steps[step].call() }
	}

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

  function updateGraphTitles(paneIdentifier) {
    currentPane = paneIdentifier;
    mainGraphTitle.transition() // fade out
      .duration(speedFactor*700)
      .style("opacity",0)
      .transition() // change text
      .duration(0)
      .text(graphTitles[paneIdentifier])
      .transition() // fade in
      .duration(speedFactor*700)
      .style("opacity",1)

    d3.selectAll(".subtitle").transition() // clear subtitles
      .duration(speedFactor*700)
      .style("opacity",0)
      .transition()
      .duration(0)
      .text("")


  }


	// initiate the scales and all elements in the svg (background map, bar charts, etc)
	function setupCharts() {

		// the sole color scale for disaster circles - based on disaster type
    if (colorblindMode) {
      typeColor = d3.scaleOrdinal()
  			.domain(["drought","earthquake","flood","storm","extreme temperature","landslide","volcanic activity"])
  			.range(["#BBBBBB","#CC3311","#33BBEE","#0077BB","#EE7733","#009988","#EE3377"]);
      document.querySelector(".colorblindMsg").innerHTML = "You are currently viewing "+
        "this page in colorblind mode.  <a href='http://heidistockton.com/naturaldisasters'>Click here</a> to return to normal color mode."
    } else {
      typeColor = d3.scaleOrdinal()
  			.domain(["drought","earthquake","flood","storm","extreme temperature","landslide","volcanic activity"])
  			.range(["#A96830","#693410","#176F90","#394C97","#BE7C11","#2B6A2F","#B13D06"]);
    }

		// SVG setup

    // ALL SCALES set in SVG units and converted to canvas units when needed
    function createScales() {
      // pane TWO - event counts by type
      scaleXeventCount = d3.scaleLinear()
        .domain([0, d3.max(eventsByType,d => d[1])])
        .range([ paneDim(2).left, paneDim(2).right - 60 ]); // 60 makes space for the label
      scaleYtypes = d3.scaleBand()
        .domain(["volcanic activity","extreme temperature","drought","landslide","earthquake","storm","flood"])
        .range([ paneDim(2).bottom , paneDim(2).top ])
        .paddingInner(0.35);

      // pane THREE - world map animated
      scaleXyear3 = d3.scaleLinear()
        .domain([1960,2018])
        .range([paneDim(3).left + 3, paneDim(3).right - 3]); // making space for the "slider" rectangle
      scaleYeventCount3 = d3.scaleLinear()
        .domain([0, d3.max(eventsByYearCounts,d => d[1])])
        .range([paneDim(3).bottom, 0.77*paneDim(3).bottom])
      scaleRgeo = d3.scaleSqrt()
        .domain([1, d3.max(eventsFlat,d => d.geoIdCount)])
        .range([3,54])

      // pane THREE B - comparison of first 10 years vs last 10
      // the hard-coded 55 in the xScale is used to account for the fact that part
      //   of pane 3B needs different margins than the rest
      scaleXpct3B = d3.scaleLinear()
        .domain([0,1])
        .range([paneDim(3).left-55, paneDim(3).right])
      scaleYpct3B = d3.scaleLinear()
        .domain([0,1])
        .range([paneDim(3).top, paneDim(3).bottom])


    }; // createScales()
    createScales()


    // CREATE OTHER NECESSARY SVG ELEMENTS

    // pane ONE - create display text
    function createDisplayText() {
      textIntroNums1 = svgForeground.append("g") // this explanatory text shows up on the first pane
        .attr("class", "textIntroNums1") // this is purely to make the group easy to see in 'inspect'
        .attr("opacity",0)
      textIntroNums1.append("text") // "59 years"
        .attr("class", "pane1text yearCount")
        .attr("x", (textRectangles[0]["x1"]+textRectangles[0]["x2"])/2 )
        .attr("y", 23+(textRectangles[0]["y1"]+textRectangles[0]["y2"])/2 );
      textIntroNums1.append("text") // "8,982 disasters"
        .attr("class", "pane1text eventCount")
        .attr("x", (textRectangles[1]["x1"]+textRectangles[1]["x2"])/2 )
        .attr("y", 20+(textRectangles[1]["y1"]+textRectangles[1]["y2"])/2 );
      textIntroNums1.append("text") // "3,428,650 lives lost"
        .attr("class", "pane1text deathCount")
        .attr("x", (textRectangles[2]["x1"]+textRectangles[2]["x2"])/2 )
        .attr("y", 18+(textRectangles[2]["y1"]+textRectangles[2]["y2"])/2 );
      textIntroNums1.append("text") // "countless lives altered"
        .attr("class", "pane1text livesCount")
        .attr("x", (textRectangles[3]["x1"]+textRectangles[3]["x2"])/2 )
        .attr("y", 18+(textRectangles[3]["y1"]+textRectangles[3]["y2"])/2 );

      // using .innerHTML here so I can include tspans (for separate text sizing)
      document.querySelector(".pane1text.yearCount").innerHTML = "<tspan>59</tspan> years"
      document.querySelector(".pane1text.eventCount").innerHTML = "<tspan>8,982</tspan> disasters"
      document.querySelector(".pane1text.deathCount").innerHTML = "<tspan>3,428,650</tspan> lives lost"
      document.querySelector(".pane1text.livesCount").innerHTML = "<tspan>Countless</tspan> lives altered"
    }; // createDisplayText
    createDisplayText()

		// panes THREE and EIGHT - world map
		function createMap() {
			mapGroup = svgBackground.append('g')
        .attr("class","mapGroup")
				.attr('width', dispWidth)
				.attr('height', dispHeight)
        .attr("opacity", 0);
			projection = d3.geoNaturalEarth1()
				.scale((dispWidth / 1.65) / Math.PI) // smaller values of 1.5 = more zoomed in
				.translate([-30+ dispWidth / 2, (0.48)* dispHeight]);
			let geoPath = d3.geoPath(projection);
			// draw the map and set the opacity to 0
			d3.json("map.geojson").then( function(worldData){
				mapGroup.selectAll('path')
					.data(worldData.features)
					.join('path')
					.attr('fill', '#EAE0DB')
					.attr('opacity', 0.9)
					.attr('d', geoPath);
			});
		}
		createMap()

    // pane THREE - rectangle to block out antarctica from view (without creating a second map)
    // MUST GET CREATED AFTER MAP, BUT BEFORE OTHER SVG ELEMENTS
    stackedAreaBgRect = svgBackground.append('rect')
      .attr("class","maskingRect3A")
      .attr("x", paneDim(3).left)
      .attr("y", 3*paneDim(3).bottom/4)  // needs to be the same as the value found in scaleYeventCount3
      .attr("width", paneDim(3).right - paneDim(3).left )
      .attr("height", paneDim(3).bottom/4)
      .attr("fill", "#fbf9f9")
      .attr("opacity",0);

		// pane TWO - create a bar chart of disaster counts by type
		function createBars2() {
			barsByTypeG = svgBackground.append("g")
				.attr("class", "eventsByType2") // this is purely to make the group easy to see in 'inspect'
				.attr("opacity",0)
			barsByTypeG.selectAll("rect.typeBg") // background bars
				.data(eventsByType)
				.join("rect")
				.attr("class","typeBg")
				.attr("x", d => scaleXeventCount(0) )
				.attr("y", d => scaleYtypes(d[0]) )
				.attr("width", paneDim(2).right-paneDim(2).left )
				.attr("height", scaleYtypes.bandwidth() )
				.attr("fill","#EFE8E4")
				.attr("opacity", 0.7);
			barsByTypeG.selectAll("rect.typeCounts") // event count bars
				.data(eventsByType)
				.join("rect")
				.attr("class","typeCounts")
				.attr("x", d => scaleXeventCount(0) )
				.attr("y", d => scaleYtypes(d[0]) )
				.attr("width", d => scaleXeventCount(d[1]) - paneDim(2).left )
				.attr("height", scaleYtypes.bandwidth() )
				.attr("fill", d => typeColor(d[0]) )
				.attr("opacity", 0.65);
			eventsByTypeLabels = barsByTypeG.append("g")
        .attr("class","eventsByTypeLabels")
			eventsByTypeLabels.selectAll("text") // disaster type names
				.data(eventsByType)
				.join("text")
        .attr("class", "typeLabels pane2")
				.text(d => d[0])
				.attr("x", paneDim(2).left)
				.attr("y", d => scaleYtypes(d[0])+scaleYtypes.bandwidth()+17 );
			eventsByTypeLabels.selectAll("text.count") // eventCounts
				.data(eventsByType)
				.join("text")
				.attr("class","count")
				.text(d => d3.format(",")(d[1]))
				.attr("x", d => scaleXeventCount(d[1])+5 )
				.attr("y", d => scaleYtypes(d[0])+scaleYtypes.bandwidth()/2+5 );
		}
		//createBars2()

		// pane THREE - stacked area chart of events by year (colored by type)
		function createStackedArea3() {
			stackedAreaG3 = svgBackground.append('g')
				.attr("class", "stackedAreaG3")
				//.attr("opacity", 0)
      stackedAreaPaths = stackedAreaG3.append('g')
        .attr("class", "stackedAreaPaths")
        .attr("opacity",0)
			stackedAreaPaths.selectAll("path")
				.data(eventsStackedByType)
				.join("path")
					.style("fill", function(d) { type = typeGroups[d.key] ;  return typeColor(type); })
					.style("stroke", "none")
          .style("opacity", 0.78 )
					.attr("d", d3.area()
						.curve(d3.curveNatural)
						.x((d,i) => scaleXyear3(d.data.key) )
						.y0( function(d) {
							return scaleYeventCount3(d[0])
						}   )
						.y1( d => scaleYeventCount3(d[1]) )
				)
      // pane THREE A - rectangle to progressively reveal stacked area chart
      // MUST GET CREATED AFTER STACKED AREA
      stackedAreaRevealRect = stackedAreaG3.append('rect')
        .attr("class", "stackedAreaRevealRect")
        .attr("x", paneDim(3).left)
        .attr("y", 3*paneDim(3).bottom/4)  // needs to be the same as the value found in scaleYeventCount3
        .attr("width", paneDim(3).right - paneDim(3).left )
        .attr("height", paneDim(3).bottom/4)
        .attr("fill", "#fbf9f9")
        .attr("opacity",0)
		}
		createStackedArea3()

    // need to create this bar chart AFTER the stacked area sections in order to have a clean transition
    //   from pane 2 to pane 3A (it allows the "reveal rect" to show up instantly without looking weird)
    createBars2()


    function buildRestOfPane3() {
      // pane THREE B - rectangle to "hide" the middle section of the stacked area chart
      stackedAreaHideRect = svgBackground.append("rect")
        .attr("class", "stackedAreaHideRect")
        .attr("x", scaleXyear3(1969.5) )
        .attr("y", Math.min(...scaleYeventCount3.range()) )
        .attr("width", scaleXyear3(2008.5) - scaleXyear3(1969.5) )
        .attr("height", Math.max(...scaleYeventCount3.range()) - Math.min(...scaleYeventCount3.range()) )
        .attr("fill", "#fbf9f9")
        .attr("opacity", 0)

      svgBgPane3A = svgBackground.append("g")
        .attr("class", "svgBgPane3A")
        .attr("opacity", 0)
      svgBgPane3A.append("line") // slider line
        .attr("class", "annotLine")
        .attr("x1", scaleXyear3(1960) )
        .attr("y1", paneDim(3).top + 6  )
        .attr("x2", scaleXyear3(2018) )
        .attr("y2", paneDim(3).top + 6 )
      sliderRect = svgBgPane3A.append("rect") // slider box
        .attr("class", "sliderRect")
        .attr("x", scaleXyear3(1960) )
        .attr("y", paneDim(3).top )
        .attr("width", 6 )
        .attr("height", 12 )
        .attr("fill", "#bdb6b1")
        .attr("stroke", "#7f7269")
      titleHiderPane3A = svgBgPane3A.append("rect") // rectangle to hide the left part of the slider bar at the very end
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 137)
        .attr("height", 70)
        .attr("fill","#fbf9f9")
        .attr("opacity",0)
      stackedAreaAux3 = svgForeground.append("g") // auxiliary components for stacked area chart (subtitle, axis)
        .attr("class", "stackedAreaAux3")
        .attr("opacity", 0)
      stackedAreaAux3.append("text") // subtitle for stacked area chart
        .attr("class","animationSubtitle")
        .text("Events by year")
        .attr("x", 30)
        .attr("y", Math.min(...scaleYeventCount3.range())+8)
      stackedAreaAux3.append("g") // axis for stacked area chart
        .attr("class", "eventCountAxis")
        .attr("transform", `translate(${65},0)`)      // This controls the horizontal position of the Axis
        .call(d3.axisLeft(scaleYeventCount3)
          .ticks(4)
        )

      // pane THREE B - rectangle to represent the future
      svgBgPane3B = svgBackground.append("g")
        .attr("class","svgBgPane3B")
        .attr("opacity",0)
      svgBgPane3B.append("rect")
        .attr("x", scaleXpct3B(0.7) )
        .attr("y", scaleYpct3B(0.1))
        .attr("width", scaleXpct3B(0.95) - scaleXpct3B(0.7))
        .attr("height", scaleYpct3B(0.45) - scaleYpct3B(0.1))
        .attr("fill", "#EFE8E4")
      svgBgPane3B.append("text")
        .attr("class", "qMark")
        .text("?")
        .attr("text-anchor", "middle")
        .attr("x", scaleXpct3B(0.7)+(scaleXpct3B(0.95) - scaleXpct3B(0.7))/2)
        .attr("y", scaleYpct3B(0.1) + (scaleYpct3B(0.45) - scaleYpct3B(0.1))/2)
        .attr("dy", 17)
      svgBgPane3B.append("line") // 1960-1969
        .attr("class", "dotted annotLine")
        .attr("x1", scaleXpct3B(0.05 + 0.125) )
        .attr("y1", scaleYpct3B(0.1 + 0.35 + 0.02) + 30 )
        .attr("x2", scaleXyear3(1960) + (scaleXyear3(1969.5)-scaleXyear3(1960))/2 )
        .attr("y2", Math.min(...scaleYeventCount3.range()) + 140 )
      svgBgPane3B.append("line") // 2009-2018
        .attr("class", "dotted annotLine")
        .attr("x1", scaleXpct3B(0.375 + 0.125) )
        .attr("y1", scaleYpct3B(0.1 + 0.35 + 0.02) + 30 )
        .attr("x2", scaleXyear3(2008.5) + (scaleXyear3(2018)-scaleXyear3(2008.5))/2 )
        .attr("y2", Math.min(...scaleYeventCount3.range()) +20 )
    }
    buildRestOfPane3()




		// create dicts to keep track of circle positions for the transitions
		function initiateCircleInfo() {
			for (let i = 0; i < eventsFlat.length; i++) {
				let node = eventsFlat[i]
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

		setupComplete = true;
	}  // setupCharts

  function createAnnotations() {
    let annotAttr3B = [
      {
        note: { label: "1960-1969" },
        x: scaleXpct3B(0.05 + 0.125),
        y: scaleYpct3B(0.1 + 0.35 + 0.02),
        dx: 0, dy: 0, wrap: 100
      },
      {
        note: { label: "2009-2018" },
        x: scaleXpct3B(0.375 + 0.125),
        y: scaleYpct3B(0.1 + 0.35 + 0.02),
        dx: 0, dy: 0, wrap: 100
      }
    ]
    let makeAnnotations3B = d3.annotation()
      .annotations(annotAttr3B)
      .disable('connector')
      .type(d3.annotationLabel)
    annotations3B = svgBgPane3B.append("g")
      .attr("class", "annotations3B")
      .call(makeAnnotations3B)



  }



	//----------------------------------------------------------------------------
	// TRANSITION FUNCTIONS - define the new target locations for each event circle
	//----------------------------------------------------------------------------

	// update circleEndInfo with new target formatting for each eventCircle
	function transitionPane1() {  // "grid" of events with summary numbers
    updateGraphTitles("1")
		for (let i = 0; i < eventsFlat.length; i++) {
			let node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': node.gridX,
				'cy': node.gridY,
				'r': 16,
				'opacity': 0.4
		}}
	} // transitionPane1()

	function transitionPane2() {  // horizontal bar chart of event counts by type
    updateGraphTitles("2")
		for (let i = 0; i < eventsFlat.length; i++) {
			let node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': 7+scaleFactor*scaleXeventCount(node.jitter2*(node.typeCount-14)),
				'cy': scaleFactor*(scaleYtypes(node.disasterType)+scaleYtypes.bandwidth()*node.jitter),
				'r': 16,
				'opacity': 0.4
		}}
	} // transitionPane2()

	function transitionPane3() {  // world map animation of events by year
    updateGraphTitles("3A")
		for (let i = 0; i < eventsFlat.length; i++) {
			let node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': scaleFactor*projection([node.longitude,node.latitude])[0],
				'cy': scaleFactor*projection([node.longitude,node.latitude])[1],
				'r': scaleFactor*scaleRgeo(node.geoIdCount),
				'opacity': 0
		}}
	} // transitionPane3()

	function transitionPane3B() {  // world map follow up - comparison of first and last 10 years
    updateGraphTitles("3B")
		for (let i = 0; i < eventsFlat.length; i++) {
			let node = eventsFlat[i];
      let cx = 0
      let cy = 0
      if (node.year <= 1969) {
        cx = scaleFactor*scaleXpct3B(0.05 + node.jitter*0.25)
        cy = scaleFactor*scaleYpct3B(0.1 + node.jitter2*0.35)
      } else if (node.year >= 2009) {
        cx = scaleFactor*scaleXpct3B(0.375 + node.jitter*0.25)
        cy = scaleFactor*scaleYpct3B(0.1 + node.jitter2*0.35)
      } else {
        cx = node.jitter*canvasWidth
        cy = canvasHeight*1.1
      }
			circleEndInfo[i] = {
				'cx': cx,
				'cy': cy,
				'r': 20,
				'opacity': 0.4
		}}
	} // transitionPane3B()



	//----------------------------------------------------------------------------
	//  DRAWING FUNCTIONS
	//----------------------------------------------------------------------------

	// given a yearValue (year + random offset), the current year increment,
  //   a fade duration (in years) and a maximum opacity => returns an OPACITY
  // result makes each event show up suddenly within its year and then slowly fade
	function eventOpacity(yearValue, currentInc, fadeDur, maxOpac = 0.8) {
		if (currentInc < yearValue) {return 0}
		else if (currentInc <= yearValue+fadeDur) {
      return maxOpac*( 1 - ( (currentInc-yearValue)/fadeDur ) )
		} else {return 0}
	}

  // iterate through every event and update the opacity value of circleStartInfo
  //   to allow redrawing a single frame accordingly (for pane THREE part TWO)
  function setOpacityForCircles( varies = true, value = 0 ) {
    for (let i = 0; i < eventsFlat.length; i++) {
      if (varies && yearInc > yearPausePoint) {  // pause the opacity changes at 2019
        circleStartInfo[i].opacity = eventOpacity(eventsFlat[i].yearCounter, yearPausePoint, 3)
      } else if (varies) {
        circleStartInfo[i].opacity = eventOpacity(eventsFlat[i].yearCounter, yearInc, 3)
      } else {
        circleStartInfo[i].opacity = value
      }
    }
  }

	// on each waypoint trigger, create new interpolator functions to be used for drawing circles
	function moveCircles() {
		interpolators = {}
		for (let i = 0; i < eventsFlat.length; i++) {
			interpolators[i] = [
				d3.interpolate(circleStartInfo[i].cx, circleEndInfo[i].cx),
				d3.interpolate(circleStartInfo[i].cy, circleEndInfo[i].cy),
				d3.interpolate(circleStartInfo[i].r, circleEndInfo[i].r),
				d3.interpolate(circleStartInfo[i].opacity, circleEndInfo[i].opacity)
			];
		}
		timeElapsed = 0;
	} // moveCircles()

	// iterate through every event and update the circleStartInfo
	//   to allow redrawing a single frame accordingly
	function interpCircMove(dt) {
		if (interpolators) {
			timeElapsed += dt;
			let pct = Math.min(ease(timeElapsed / setDuration), 1.0);
			for (let i = 0; i < eventsFlat.length; i++) {
				circleStartInfo[i].cx = Math.floor(interpolators[i][0](pct));
				circleStartInfo[i].cy = Math.floor(interpolators[i][1](pct));
				circleStartInfo[i].r = Math.floor(interpolators[i][2](pct));
				circleStartInfo[i].opacity = interpolators[i][3](pct);
			}
			if (timeElapsed >= setDuration) { interpolators = null; }
		}
	} // interpCircMove()

	// for each event, read the corresponding circleStartInfo entry and draw it on the canvas
	// this function clears and redraws one frame onto the canvas
	function drawCircles(chosenCtx, hidden = false) {
		chosenCtx.clearRect(0,0,canvasWidth,canvasHeight);
		for (let i = 0; i < eventsFlat.length; i++) {
			let node = eventsFlat[i];
			// set the fillstyle depending on whether we're using the mainCtx or the hiddenCtx
			//   mainCtx gets the colors based on disaster type, hiddenCtx gets unique colors for each circle
			if (hidden && tooltipLock === false) { // don't activate tooltips if the lock is activated
        if (node.color == null) {
          // If we have never drawn the node to the hidden canvas get a new color for it and put it in the dictionary.
          node.color = genColor();
          colToCircle[node.color] = node;
        }
        // On the hidden canvas each circle gets a unique color.
        chosenCtx.fillStyle = node.color;
				chosenCtx.globalAlpha = 1;
      } else {
        chosenCtx.fillStyle = circleStartInfo[i].fill;  // color based on disaster type
				chosenCtx.globalAlpha = circleStartInfo[i].opacity
      }

			chosenCtx.beginPath();
			chosenCtx.arc(circleStartInfo[i].cx, circleStartInfo[i].cy, circleStartInfo[i].r, 0, 2*Math.PI, true);
			chosenCtx.fill()
			chosenCtx.closePath()
		}
	} // drawCircles()

	// this function activates the animation for the length specified by duration
	function animateCircles(currentInc, secondAnimNeeded=false) {
		moveCircles()
		let dt = 0;
		let t = d3.timer(function(elapsed) {
			//stats.begin();
			interpCircMove(elapsed - dt);
			dt = elapsed;
			drawCircles(mainCtx)
			//stats.end();
			if (elapsed > setDuration || currentInc !== lockInc) {
        if (secondAnimNeeded) {readyFor2ndAnim = true; }
        t.stop()
      };
		});
	} // animateCircles()



  //----------------------------------------------------------------------------
	//  PANE DEACTIVATION FUNCTIONS
	//----------------------------------------------------------------------------

  // mostly used for hiding/fading out svgs, these functions are each used at
  //   least twice, once on scrolling up and once on scrolling down
  // they are used within the "step" functions (activated on scroll)

  function deactivatePane2() {
    barsByTypeG.transition() // pane TWO
      .duration(speedFactor*700)
      .attr('opacity',0)
  }
  function deactivatePane3() {
    stackedAreaBgRect.transition().call(fadeOutStd) // pane THREE
      .delay(speedFactor*200)
    stackedAreaPaths.transition()
      .duration(speedFactor*600)
      .attr("opacity",0)
    stackedAreaAux3.transition().call(fadeOutStd) // pane THREE
  }
  function deactivatePane3A() {
    mapGroup.transition().call(fadeOutStd) // pane THREE
    stackedAreaRevealRect.transition()
      .duration(speedFactor*1000)
      .attr("x",paneDim(3).left)
      .attr('width',paneDim(3).right - paneDim(3).left)
      .attr("opacity",0)
    svgBgPane3A.transition().call(fadeOutStd)
    titleHiderPane3A.transition() // pane THREE A
      .delay(speedFactor*300)
      .duration(speedFactor*300)
      .attr("opacity", 0)
    d3.select(".sizeLegend1").style("display", "none") // pane THREE
  }
  function deactivatePane3B() {
    stackedAreaHideRect.transition().call(fadeOutStd)
    svgBgPane3B.transition().call(fadeOutStd) // pane THREE B
  }




  //----------------------------------------------------------------------------
	//  DATA WRANGLING
	//----------------------------------------------------------------------------

	// load/parse the main data file and store as 'data'
	// then set up the charts and kick off the updater function
	d3.csv('pend-gdis-aug-v2.csv', function(d) {
		return {
			id: d.id,
			country: d.country,
			iso3: d.iso3,
			year: +d.year,
			geoId: +d.geo_id,
			disasterType: d.disastertype.trim(),
			disasterNum: d.disasterno,
			latitude: +d.latitude,
			longitude: +d.longitude,
			deathsPerDisaster: +d.deathsPerDisaster,
			damagesPerDisaster: +d.damagesAdjPerDisaster,
			gdpInUsdPerCountry: +d.GdpInUsdPerCountry,
			populationPerCountry: +d.PopulationPerCountry,
			disasterSubtype: d.DisasterSubtype,
			startDate: new Date(+d.year, (d.StartMonth != "")? +d.StartMonth : 0, (d.StartDay != "")? +d.StartDay : 1),
			totalAffected: +d.TotalAffected,
			otherNotes: d.OtherNotes
		}
	}).then(disData => {
		data = disData;

		// rollup/collapse the data in various ways to support the different visualization components
		eventData = Array.from(d3.rollup(
			data,
			function(v) {
        jitter = Math.random()
        jitter2 = Math.random()
				return {
					disasterNum: d3.min(v, d => d.disasterNum),
			    geoIdCount: v.length,
					country: d3.min(v, d => d.country),  // can probably make this better at some point
          gdpInUsdPerCountry: d3.mean(v, d => d.gdpInUsdPerCountry), // average across all locations recorded
					year: d3.min(v, d => +d.year),
					disasterType: d3.min(v, d => d.disasterType),
					latitude: d3.mean(v, d => +d.latitude),
					longitude: d3.mean(v, d => +d.longitude),
			    deaths: d3.min(v, d => d.deathsPerDisaster ),
					damages: d3.min(v, d => d.damagesPerDisaster ),
					disasterSubtype: d3.min(v, d => d.disasterSubtype),
					startDate: d3.min(v, d => d.startDate),
					totalAffected: d3.min(v, d => d.totalAffected),
					otherNotes: d3.min(v, d => d.otherNotes),
					jitter: jitter,
					jitter2: jitter2,
          jitter3: (jitter+3*jitter2)%1,
          yearCounter: d3.min(v, d => +d.year + Math.floor(framesPerYear*Math.random())/framesPerYear),
          offsetX: 0,
          offsetY: 0
		  	};
			},
		  d => d.disasterNum
		).values()).filter(d => d.disasterType != "mass movement (dry)"); // remove this disaster type

		// count total events of each type
		eventsByType = Array.from(
			d3.rollup(eventData, v => v.length, d => d.disasterType).entries()
		).sort((a,b) => d3.descending(+a[1], +b[1]) );
		eventsByTypeObject = Object.fromEntries(eventsByType); // create an object to use below

		// get total death toll by disaster type
		deathsByType = Array.from(
			d3.rollup(eventData, v => d3.sum(v, d => d.deaths), d => d.disasterType).entries()
		);
		deathsByTypeObject = Object.fromEntries(deathsByType); // create an object to use below

    // get median death count of each type
    medianDeathsByType = d3.rollup(eventData, v => d3.median(v, d => d.deaths), d => d.disasterType)

    medianDeathsByType = Array.from(
      d3.rollup(eventData, v => d3.median(v, d => d.deaths), d => d.disasterType).entries()
    );

		// create sets for the first ten years of events and for the last ten years
		firstTenYears = eventData.filter(d => d.year <= 1969)
		lastTenYears = eventData.filter(d => d.year >= 2009)

    // count total events and deaths of each type from the subsets we just created
    eventsByTypeFirst10 = d3.rollup(firstTenYears, v => v.length, d => d.disasterType)
    eventsByTypeLast10 = d3.rollup(lastTenYears, v => v.length, d => d.disasterType)
    deathsByTypeFirst10 = d3.rollup(firstTenYears, v => d3.sum(v, d => d.deaths), d => d.disasterType)
    deathsByTypeLast10 = d3.rollup(lastTenYears, v => d3.sum(v, d => d.deaths), d => d.disasterType)


		// count total events by year
		eventsByYearCounts = Array.from(
			d3.rollup(eventData, v => v.length, d => d.year).entries()
		).sort((a,b) => d3.ascending(+a[0], +b[0]) );

		// group events by year, then sort each set of yearly events by type
		eventsByYear = d3.group(eventData, d => d.year);
		for (let key of eventsByYear.keys()) {
			eventsByYear.get(key).sort(function(a, b) {
				// within each year - sort by disaster number
				return b.disasterNum-a.disasterNum;
			})
			eventsByYear.get(key).forEach(function(event, index, theArray) {
				theArray[index].vertNum = index;
			});
			eventsFlat = eventsFlat.concat(eventsByYear.get(key))
		}
		console.log(eventsFlat.length,"events")

		// creating the 'stacked' data for the area chart was a major pain.
		//   there surely is a better/cleaner way to to this, but I don't want to look
		//   at this part of the code anymore.  :)
		// ultimately this section 'stacks' the eventsByYear data by TYPE
		//   each type will be represented on top of each other (by a unique color)

		// this is the first data step - it approximates the results of d3.nest, I think?
		let eventsByYearNest = Array.from(eventsByYear, ([key,values]) => ({key, values}));

		// need a slightly different format as input for d3.stack including generating a 'count' value for EVERY disaster type
		let newEventsByYearNest = [];
		for (let i = 0; i < eventsByYearNest.length; i++) {
			let valuePairs = d3.rollup(eventsByYearNest[i].values, v => v.length, d => d.disasterType) // map of the form {'flood'=>5, 'storm'=>6}
			let newValuePairs = typeGroups.map( function(type) {   // sort by type and fill in with zeros for any missing values
				return ({type: type, count: (valuePairs.get(type) ? valuePairs.get(type) : 0) })
			} )
			newEventsByYearNest.push ({ key: eventsByYearNest[i].key, values: newValuePairs })
		}
		newEventsByYearNest.sort((a,b) => a.key - b.key) // sort by year

		// finally, create the 'stacked' data for the area chart
		eventsStackedByType = d3.stack()
			.keys([0,1,2,3,4,5,6]) // indices for each value in typeGroups
			.value( (d,key) => d.values[key].count )
			(newEventsByYearNest)

		// add data to specify coordinates for the grid of all circles
		const rowCount = 110; // max number of circles in any row
		let manipulatedIndex = 0; // we use this to ensure no circles are overlapping the specified textRectangles
		eventsFlat.forEach(function(event, index, theArray) {
			let xySet = false;
			while (xySet === false) {
				let rowNum = Math.floor(manipulatedIndex/rowCount);
				let xCoor = 0;
				let yCoor = 0;
				if (rowNum%2 == 0) {
					xCoor = 6+(manipulatedIndex*9)%(rowCount*9)
				} else {  // shift odd rows by 5 pixels to create a different/compact grid type
					xCoor = 11+(manipulatedIndex*9)%(rowCount*9)
				}
				yCoor = 8+8*Math.floor(manipulatedIndex/rowCount)

				// if the x,y coordinates fall INSIDE one of the specified textRectangles, then
				//   increment the manipulatedIndex and try again.  this will leave the textRectangles
				//   clear of circles so we can add text
				if (insideTheWalls(xCoor,yCoor,textRectangles) === false) {
					xySet = true;
					theArray[index].gridX = scaleFactor*xCoor;
					manipulatedIndex >= 10890 ? yCoor += 10 : yCoor = yCoor;  // "bump" the LAST two circles off the canvas
					theArray[index].gridY = scaleFactor*yCoor;
				}
				manipulatedIndex += 1
			}
			// for each event, also log the total event count and death toll for that disaster type
			theArray[index].typeCount = eventsByTypeObject[event.disasterType]
			theArray[index].typeDeathCount = deathsByTypeObject[event.disasterType]
		});

		// INITIALIZE THE VISUALIZATION
		init()

	})   // end d3.csv.then

	return {
		update: update,
	}
} // window.createGraphic
