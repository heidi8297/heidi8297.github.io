// scroll to top of page on refresh (prevents issues of rendering things in the wrong order)
// from https://www.designcise.com/web/tutorial/how-to-force-scroll-to-the-top-of-the-page-on-page-reload-using-javascript
if (history.scrollRestoration) {
    history.scrollRestoration = 'manual';
} else {
    window.onbeforeunload = function () {
        window.scrollTo(0, 0);
    }
}

// hide mobilewarning message when user clicks "proceed anyway" button
function proceedAnyway() {
  d3.select(".mobileWarning").style("display", "none")
}

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
	let deadliestEvents = [];
	let lollipopEvents = [];
	let firstTenYears = [];
	let lastTenYears = [];
  let eventChangesByType = [];
  let deathChangesByType = [];
  let eventsByTypeFirstLast = [];
  let deathsByTypeFirstLast = [];
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
  const fpsTarget = 11;   // I like 9 here
  const msTarget = Math.floor(1000/fpsTarget)
  let framesPerYear = 4;  // I like 5 here
  let yearInc = 1960;
  let readyFor2ndAnim = false;
  let revealRectComplete = false;

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

	const speedFactor = 1.5;
  let colorblindMode = false;

	let setupComplete = false;

  // check to see if colorblind mode has been activated
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  (urlParams.get('colorblind') == null) ? colorblindMode = false : colorblindMode = true

	// create an svg path in a teardrop shape of specified size, spacer and orientation
	// size = radius of circle, spacer = pixels from origin
	function teardrop(size=10, spacer=3, orientation=0) {
		switch (orientation) {
		  case 0:  // top right from origin    "M0,0 l0,-10 a10,10 0 1,1 10,10 l-10,0"
		    return `M${spacer},-${spacer} l0,-${size} a${size},${size} 0 1,1 ${size},${size} l-${size},0`;
		  case 1:  // bottom right   				"M0,0 l0,10 a10,10 0 1,0 10,-10 l-10,0"
		    return `M${spacer},${spacer} l0,${size} a${size},${size} 0 1,0 ${size},-${size} l-${size},0`;
		  case 2:  // bottom left   "M0,0 l0,10 a10,10 0 1,1 -10,-10 l10,0"
				return `M-${spacer},${spacer} l0,${size} a${size},${size} 0 1,1 -${size},-${size} l${size},0`;
		  case 3:  // top left    "M0,0 l0,-10 a10,10 0 1,0 -10,10 l10,0"
				return `M-${spacer},-${spacer} l0,-${size} a${size},${size} 0 1,0 -${size},${size} l${size},0`;
		}
	}

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
		} else if (paneNum === 5) {
      return {top: fScale*145, right: fScale*30, bottom: fScale*90, left: fScale*30}
    } else if (paneNum === 6) { // log scale / deaths per disaster
			return {top: fScale*80, right: fScale*60, bottom: fScale*80, left: fScale*110}
		} else if (paneNum === 7) { // deaths by year, linear scale
			return {top: fScale*80, right: fScale*45, bottom: fScale*70, left: fScale*110}
		} else if (paneNum === 9) { // deaths by Gdp
      return {top: fScale*150, right: fScale*40, bottom: fScale*130, left: fScale*92}
    }

		// default margins
		return {top: fScale*80, right: fScale*30, bottom: fScale*30, left: fScale*30}
	}

  // define markers for pane 5 (A & B) to be used in various places
  let markers5 = { L1: 0.07, L2: 0.41, R1: 0.59, R2: 0.93 }

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
    } else if (paneNum === "8") {
      let stormName = ""
      if (d.disasterNum === "2008-0184") {stormName = " (Cyclone Nargis)"}
      else if (d.disasterNum === "1991-0120") {stormName = " (Cyclone Gorky)"}
      return capitalize(d.disasterType) + stormName + " in " +d.country +"<br>"+d.year
        + (d.deaths > 0 ? "<br>Deaths: " + d3.format(",")(d.deaths) : "") + "<br>Total affected: "
        + (d.totalAffected === 0 ? "unknown" : d3.formatPrefix(".1", d.totalAffected)(d.totalAffected))
        + "<br>Total damages (USD '21): $"
        + (d.damages === 0 ? "none" : d3.formatPrefix(".1", d.damages)(d.damages)) + "<br>Location count: " + d.geoIdCount
    } else if (paneNum === "9A" || paneNum === "9B") {
      return capitalize(d.disasterType) + " in " +d.country +"<br>"+d.year +
        (d.deaths > 0 ? "<br>Deaths: " +d3.format(",")(d.deaths) : "") + "<br>GDP per capita** (USD): " + d3.format("$,.0f")(d.gdpInUsdPerCountry)
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

	let stats = new Stats();
	stats.setMode(0); // 0: fps, 1: ms, 2: mb

	// align top-left
	stats.domElement.style.position = 'fixed';
	stats.domElement.style.left = '0px';
	stats.domElement.style.top = '0px';

	document.body.appendChild( stats.domElement );



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
      "3B": "An unsettling increase in frequency",
      "4": "Total death counts by disaster type",
      "5A": "How things have changed over the last 59 years (total counts)",
      "5B": "How things have changed (percent change from 1960-1969)",
      "6": "Deaths for each event by disaster type (log scale)",
      "7": "Deaths for each event by year (linear scale)",
      "8": "The deadliest 15 events",
      "9A": "The deadliest 15 events by GDP per capita**",
      "9B": "All events by GDP per capita**",
      "10": ""
    }

    graphSubtitles = {
      "5A": ["Total event counts","Total death counts"],
      "5B": ["Percent change in event counts","Percent change in death counts"]
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

	}
	initializeDrawingSpaces()

	// activate tooltip when the mouse moves over an event circle
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
	  	} else {
	  	// Hide the tooltip when the mouse doesn't find nodeData
	    tooltipMain.style('opacity', 0);
  	}
	});

	// hide tooltip when mouse leaves main canvas (not sure why 'd =>' is needed here, but it errors w/o)
	mainCanvas.on("mouseout", d => tooltipMain.style("opacity", 0));

  // turn the legendIconWrapper into a button that shows/hides the legends
  let legendWrapper = document.getElementById("legendIconWrapper");
  legendWrapper.addEventListener("click", showHide);
  function show() {
    d3.select("#legendWrapper").style("display","block")
    d3.select(".legendHideIconImage").style("opacity",1)
    d3.select(".variableSpacer").style("height", "120px")
    document.querySelector(".showHideText").innerHTML = "hide"
  }
  function hide() {
    d3.select("#legendWrapper").style("display","none")
    d3.select(".legendHideIconImage").style("opacity",0)
    d3.select(".variableSpacer").style("height", "0")
    document.querySelector(".showHideText").innerHTML = "show"
  }
  // this is the only place where I intentionally change the height of something in the
  //   scrolly text section via javascript, as it affects the waypoint triggers
  function showHide() {
    if (infoState === "hide") {
      infoState = "show";
      show();
    } else {
      infoState = "hide";
      hide();
    }
  }

  // add tooltip to legend icon
  legendWrapper.addEventListener("mouseover", function(event) {
    tooltipAux.style('opacity',0.88)
      .html(infoState === "show" ? "hide legend" : "show legend")
      .style("left", (event.pageX + 5) + "px")
      .style("top", (event.pageY + 5) + "px");
  } );
  legendWrapper.addEventListener("mouseout", function(event) {
    tooltipAux.style('opacity',0)
  })



	//----------------------------------------------------------------------------
	// STEPS / TRANSITIONS
	//----------------------------------------------------------------------------

	// actions to take on each step of our scroll-driven story
	var steps = [
		function step0() {  // pane ONE
			let stepInc = lockInc += 1;
			textIntroNums.transition() // pane ONE
				.duration(speedFactor*800)
				.attr("opacity",0.92)
			deactivatePane2()
			transitionPane1()
			animateCircles(stepInc)
		}, // step0()

		function step1() {  // pane TWO
			let stepInc = lockInc += 1;
			textIntroNums.transition() // pane ONE
				.duration(speedFactor*500)
				.attr("opacity",0)
			barsByTypeG.transition() // pane TWO
				.duration(speedFactor*1100)
				.attr('opacity',1)
			deactivatePane3()
      svgBgPane3A.transition().call(fadeOutStd) // pane THREE A
      stackedAreaAux.transition().call(fadeOutStd) // pane THREE A
      titleHiderPane3A.transition() // pane THREE A
        .delay(speedFactor*300)
        .duration(speedFactor*300)
        .attr("opacity", 0)
      stackedAreaRevealRect.transition() // pane THREE
        .duration(0)
        .attr('width',0)
      d3.select(".sizeLegend1").style("display", "none") // pane THREE
			transitionPane2()
			animateCircles(stepInc)
		}, // step1()

		function step2() {  // pane THREE
			console.log(document.getElementsByTagName('*').length,"DOM elements")
			let stepInc = lockInc += 1;
			deactivatePane2()
      deactivatePane3B()
			mapGroup.transition().call(fadeInStd) // pane THREE
      svgBgPane3A.transition().call(fadeInStd) // pane THREE
      stackedAreaAux.transition().delay(speedFactor*600).call(fadeInStd) // pane THREE
      stackedAreaBgRect.transition() // pane THREE
        .duration(0)
        .attr('opacity',1)
      // only run this "reveal" section of code once - the stacked area chart will
      //   be visible on subsequent views via scrolling
      if (!revealRectComplete) {
        stackedAreaRevealRect.transition() // pane THREE
          .delay(speedFactor*800)
          .duration(0)
          .attr('width',paneDim(3).right - paneDim(3).left)
        stackedAreaG.transition() // pane THREE
          .delay(speedFactor*801)
          .duration(0)
  				.attr('opacity',1)
      } else {
        stackedAreaG.transition().call(fadeInStd) // pane THREE
      }
      d3.select(".sizeLegend1").style("display", "block") // pane THREE
      svgPane3B.transition().call(fadeOutStd) // pane THREE B
			transitionPane3()
			animateCircles(stepInc,true)
      tooltipLock = true // turn off tooltips during the 'events by year' animation
      // events by year animation
      // made more complicated (but more performant!) by not using d3 transitions
      let secondAnim = d3.interval(function() {
        if (readyFor2ndAnim && stepInc === lockInc && yearInc <= yearStop) {
          if (!revealRectComplete) {  // this section is only run on the first scroll
            let percentComplete = yearInc >= yearPausePoint ? 1 : (yearInc - startingYearInc)/yearCountAnim;
            let paneWidth = paneDim(3).right-paneDim(3).left
            stackedAreaRevealRect.transition()
              .duration(msTarget)
              .ease(d3.easeLinear)
              .attr('x',paneDim(3).left + percentComplete*paneWidth)
              .attr('width', (1-percentComplete)*paneWidth )
          }
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
          }
          // reset variables and then stop the animation
          readyFor2ndAnim = false;
          tooltipLock = false; // turn tooltips back on
          yearInc = startingYearInc; // reset to starting point
          revealRectComplete = true; // this will now remain true until a page reload
          secondAnim.stop();
        }
      }, msTarget )

		}, // step2()

		function step3() {  // pane THREE B
			let stepInc = lockInc += 1;
			mapGroup.transition().call(fadeOutStd) // pane THREE A
      svgBgPane3A.transition().call(fadeOutStd) // pane THREE A
      stackedAreaAux.transition().delay(speedFactor*600).call(fadeInStd) // pane THREE
      titleHiderPane3A.transition() // pane THREE A
        .delay(speedFactor*300)
        .duration(speedFactor*300)
        .attr("opacity", 0)
      stackedAreaBgRect.transition() // pane THREE A
        .duration(0)
        .attr('opacity',1)
      stackedAreaRevealRect.transition() // pane THREE A
        .duration(0)
        .attr('width',0)
      d3.select(".sizeLegend1").style("display", "none") // pane THREE A
      stackedAreaG.transition().call(fadeInStd) // pane THREE
      svgPane3B.transition().call(fadeInStd) // pane THREE B
      stackedAreaHideRect.transition() // pane THREE B
        .duration(speedFactor*800)
        .attr("opacity",0.7)
			deactivatePane4()
			transitionPane3B()
			animateCircles(stepInc)
		}, // step3()

		function step4() {  // pane FOUR
			let stepInc = lockInc += 1;
      deactivatePane3()
      deactivatePane3B()
      stackedAreaAux.transition().call(fadeOutStd) // pane THREE
      svgPane3B.transition().call(fadeOutStd) // pane THREE B
			deathsByTypeG.transition() // pane FOUR
				.duration(speedFactor*1100)
				.attr('opacity',1)
      annotations4.transition().call(fadeInStd) // pane TWO
      deactivatePane5()
      deactivatePane5A()
			transitionPane4()
			animateCircles(stepInc)
		}, // step4()

		function step5() {  // pane FIVE A
			let stepInc = lockInc += 1;
			deactivatePane4()
      deactivatePane5B()
      slopegraphG.transition().call(fadeInStd) // pane FIVE
      slopegraphG.selectAll("line.eventChanges")
        .data(eventsByTypeFirstLast)
        .join("line")
        .transition()
        .duration(speedFactor*1000)
        .attr("y1", d => scaleYeventCount5(d[1]))
        .attr("y2", d => scaleYeventCount5(d[2]))
      slopegraphG.selectAll("line.deathChanges")
        .data(deathsByTypeFirstLast)
        .join("line")
        .transition()
        .duration(speedFactor*1000)
        .attr("y1", d => scaleYdeathCount5(d[1]))
        .attr("y2", d => scaleYdeathCount5(d[2]))
      slopegraphG5A.transition().call(fadeInStd) // pane FIVE
			transitionPane5A()
			animateCircles(stepInc)
		}, // step5()

    function step6() {  // pane FIVE B
      let stepInc = lockInc += 1;
      deactivatePane5A()
      deactivatePane6()
      slopegraphG.transition().call(fadeInStd) // pane FIVE B
      slopegraphG.selectAll("line.eventChanges") // pane FIVE B
        .data(eventChangesByType)
        .join("line")
        .transition()
        .duration(speedFactor*1000)
				.attr("y1", d => scaleYeventPct(0))
				.attr("y2", d => scaleYeventPct(d[1]))
      slopegraphG.selectAll("line.deathChanges") // pane FIVE B
        .data(deathChangesByType)
        .join("line")
        .transition()
        .duration(speedFactor*1000)
				.attr("y1", d => scaleYdeathPct(0))
				.attr("y2", d => scaleYdeathPct(d[1]))
      slopegraphG5B.transition().call(fadeInStd) // pane FIVE B
      transitionPane5B()
      animateCircles(stepInc)
    }, // step6()

		function step7() {  // pane SIX
			let stepInc = lockInc += 1;
      deactivatePane5()
      deactivatePane5B()
			logBarsG.transition() // pane SIX
				.duration(speedFactor*1100)
				.attr('opacity',1)
      svgPane6.transition().call(fadeInStd) // pane SIX
			deactivatePane7()
			transitionPane6()
			animateCircles(stepInc)
		}, // step7()

		function step8() {  // pane SEVEN
			let stepInc = lockInc += 1;
			deactivatePane6()
			lollipopLines.selectAll("line") // pane SEVEN
				.transition()
				.duration(speedFactor*800)
				.attr("x1", d => scaleXyear7(d.year)-8+16*d.jitter)
				.attr("y1", d => scaleYdeaths(d.deaths)+6) // this is the top of the line
				.attr("x2", d => scaleXyear7(d.year)-8+16*d.jitter)
				.attr("y2", d => paneDim(7).bottom ) // this is the bottom of the line
      svgPane7.transition().call(fadeInStd)
			deactivatePane8()
			transitionPane7()
			animateCircles(stepInc)
		}, // step8()

		function step9() {  // pane EIGHT
			let stepInc = lockInc += 1;
			deactivatePane7()
			mapGroup.transition().call(fadeInStd) // pane EIGHT

      // a lot of lines of code here for the teardrop transitions...
      // they look really sweet though, so I've accepted the mess *shrug*
      teardrops.selectAll("path").transition() // pane EIGHT
        .delay(speedFactor*300)
        .duration(speedFactor*1000)
        .attr('opacity',0.7)
        .attr("transform", function(d,i) {  // first position the teardrops at lat/long
          let translateX = projection([d.longitude,d.latitude])[0]
          let translateY = projection([d.longitude,d.latitude])[1]
          return `translate(${translateX},${translateY})`
        } )
        .transition()
        .delay(speedFactor*200)
        .duration(speedFactor*800)
        .attr("transform", function(d,i) { // then move them to their respective offsets, if applicable
          let translateX = projection([d.longitude,d.latitude])[0]+d.offsetX
          let translateY = projection([d.longitude,d.latitude])[1]+d.offsetY
          return `translate(${translateX},${translateY})`
        } )
      teardropLines.selectAll("line").transition() // pane EIGHT
        .delay(speedFactor*1500)
        .duration(speedFactor*800)  // add/extend the lines at the same time as moving the teardrops
        .attr("x2", d => projection([d.longitude,d.latitude])[0]+d.offsetX)
				.attr("y2", d => projection([d.longitude,d.latitude])[1]+d.offsetY)

      d3.select(".teardropLegend").style("display", "block") // pane EIGHT
      annotations8.transition().call(fadeInStd)
        .delay(speedFactor*1900)
      deactivatePane9() // pane NINE
			transitionPane8()
			animateCircles(stepInc)
		}, // step9()

		function step10() {  // pane NINE A
			let stepInc = lockInc += 1;
			deactivatePane8()
      d3.select(".sizeLegend2").style("display", "block") // pane NINE
      gdpAxis.transition() // pane NINE
        .duration(speedFactor*800)
        .attr("opacity", 0.4)
      annotations9.transition().call(fadeInStd) // pane NINE
			transitionPane9A()
			animateCircles(stepInc)
		}, // step10()

		function step11() {  // pane NINE B
			let stepInc = lockInc += 1;
      d3.select(".sizeLegend2").style("display", "block") // pane NINE
      gdpAxis.transition() // pane NINE
        .duration(speedFactor*800)
        .attr("opacity", 0.4)
      annotations9.transition().call(fadeInStd) // pane NINE
      d3.select(".finalWords").transition() // pane TEN
        .duration(speedFactor*800)
        .style("opacity","0")
			transitionPane9B()
			animateCircles(stepInc)
		}, // step11()

		function step12() {  // pane TEN
			let stepInc = lockInc += 1;
      deactivatePane9() // pane NINE
      d3.select(".finalWords").transition() // pane TEN
        .duration(speedFactor*800)
        .style("opacity","1")
			transitionPane10()
			animateCircles(stepInc)
		}, // step12()


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
      stats.begin();
      interpCircMove(elapsed - dt);
      dt = elapsed;
      drawCircles(mainCtx)
      stats.end();
      if (elapsed > setDuration || stepInc !== lockInc) t.stop();
    });
    update(0)
  } // init()

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
    if (paneIdentifier === "5A" || paneIdentifier === "5B") {
      d3.select(".subtitle.eventsSubtitle").transition()
        .duration(speedFactor*700)
        .style("opacity",0)
        .transition()
        .duration(0)
        .text(graphSubtitles[paneIdentifier][0])
        .transition()
        .duration(speedFactor*700)
        .style("opacity",1)
      d3.select(".subtitle.deathsSubtitle").transition()
        .duration(speedFactor*700)
        .style("opacity",0)
        .transition()
        .duration(0)
        .text(graphSubtitles[paneIdentifier][1])
        .transition()
        .duration(speedFactor*700)
        .style("opacity",1)
    } else {
      d3.selectAll(".subtitle").transition() // clear subtitles
        .duration(speedFactor*700)
        .style("opacity",0)
        .transition()
        .duration(0)
        .text("")
    }

  }

  // move teardrops into their starting positions with opacity = 0
  function transitionTeardrops() {
    tearTransOffset = 40
    teardrops.selectAll("path.TR")  // top right - sized by death toll
      .transition().duration(scaleFactor*600)
      .attr("opacity",0)
      .attr("transform", function(d,i) {
        let translateX = projection([d.longitude,d.latitude])[0] - tearTransOffset
        let translateY = projection([d.longitude,d.latitude])[1] + tearTransOffset
        return `translate(${translateX},${translateY})`
      } )
    teardrops.selectAll("path.BR")  // bottom right - sized by total affected
      .transition().duration(scaleFactor*600)
      .attr("opacity",0)
      .attr("transform", function(d,i) {
        let translateX = projection([d.longitude,d.latitude])[0] - tearTransOffset
        let translateY = projection([d.longitude,d.latitude])[1] - tearTransOffset
        return `translate(${translateX},${translateY})`
      } )
    teardrops.selectAll("path.BL")  // bottom left - sized by damages
      .transition().duration(scaleFactor*600)
      .attr("opacity",0)
      .attr("transform", function(d,i) {
        let translateX = projection([d.longitude,d.latitude])[0] + tearTransOffset
        let translateY = projection([d.longitude,d.latitude])[1] - tearTransOffset
        return `translate(${translateX},${translateY})`
      } )
    teardrops.selectAll("path.TL")  // top left - sized by geoIdCount
      .transition().duration(scaleFactor*600)
      .attr("opacity",0)
      .attr("transform", function(d,i) {
        let translateX = projection([d.longitude,d.latitude])[0]+d.offsetX + tearTransOffset
        let translateY = projection([d.longitude,d.latitude])[1]+d.offsetY + tearTransOffset
        return `translate(${translateX},${translateY})`
      } )
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

      // pane FOUR
      scaleXtypes = d3.scaleBand()
        .domain(["earthquake","storm","drought","flood","extreme temperature","landslide","volcanic activity"])
        .range([ paneDim(4).left , paneDim(4).right ])
        .paddingInner(0.39);
      scaleYdeathCount = d3.scaleLinear() // total death counts by type
        .domain([0, d3.max(deathsByType, d => d[1])])
        .range([ paneDim(4).bottom, paneDim(4).top + 30 ]); // 30 makes space for the label

      // pane FIVE
      scaleYeventCount5 = d3.scaleLinear()
        .domain([0,Math.max(d3.max(eventsByTypeFirst10, d => d[1]), d3.max(eventsByTypeLast10, d => d[1]))])
        .range([paneDim(5).bottom, paneDim(5).top])
      scaleYdeathCount5 = d3.scaleLinear()
        .domain([0,Math.max(d3.max(deathsByTypeFirst10, d => d[1]), d3.max(deathsByTypeLast10, d => d[1]))])
        .range([paneDim(5).bottom, paneDim(5).top])
      scaleXpct5 = d3.scaleLinear()
        .domain([0,1])
        .range([paneDim(5).left, paneDim(5).right])
      scaleYeventPct = d3.scaleLinear()
        .domain([-1,d3.max(eventChangesByType, d => d[1])])
        .range([paneDim(5).bottom, paneDim(5).top])
      scaleYdeathPct = d3.scaleLinear()
        .domain([-1,d3.max(deathChangesByType, d => d[1])])
        .range([paneDim(5).bottom, paneDim(5).top])

      // pane SIX
      scaleXdeadliest = d3.scaleBand()  // band scale for X-axis of event types (log scale)
        .domain(["volcanic activity","storm","landslide","flood","extreme temperature","earthquake","drought"])
        .range([paneDim(6).left, paneDim(6).right])
        .paddingInner(0.38)
      scaleYdeadliest = d3.scaleSymlog() // log scale for Y-axis of deaths per event
        .domain([0,450000])
        .range([paneDim(6).bottom, paneDim(6).top])

      // pane SEVEN
      scaleXyear7 = d3.scaleLinear()
        .domain([1960,2018])
        .range([paneDim(7).left, paneDim(7).right])
      scaleYdeaths = d3.scaleLinear()
        .domain([0,450000])
        .range([paneDim(7).bottom, paneDim(7).top])

      // pane EIGHT - scales for teardrop shapes
      scaleRdamages = d3.scaleSqrt()
        .domain([0, d3.max(eventsFlat, d => d.damages)])
        .range([3,70])
      scaleRaffected = d3.scaleSqrt()
        .domain([0, d3.max(eventsFlat, d => d.totalAffected)])
        .range([3,54])

      // pane NINE
      scaleRdeaths = d3.scaleSqrt()
        .domain([0, d3.max(eventsFlat, d => d.deaths)])
        .range([3,70])
      scaleXgdp = d3.scaleLinear()
        .domain([0, d3.max(eventsFlat, d => d.gdpInUsdPerCountry)])
        .range([ paneDim(9).left, paneDim(9).right ])
    }
    createScales()

    function createLegends() {
      // create color legend for disaster types
  		d3.select(".colorLegend1").append('svg')
  			.append('g')
  		  .attr("class", "legendOrdinal")
  		  .attr("transform", "translate(13,20)");
  		var legendOrdinal = d3.legendColor()
  		  .shape("circle")
  		  .shapePadding(3)
  			.shapeRadius(7)
        .title("Disaster type")
  		  .scale(typeColor);
  		d3.select(".legendOrdinal")
  		  .call(legendOrdinal);

  		// create size legend for geoIdCount
  		d3.select(".sizeLegend1").append('svg')
  			.append("g")
  			.attr("class", "sizeLegend")
  			.attr("transform", "translate(13,20)");
      let legendSize1 = d3.legendSize()
  			.scale(scaleRgeo)
  			.shape('circle')
  			.cells([1,10,50,100])
  			.shapePadding(34)
  			.labelFormat("d")
  			.title("Number of locations recorded")
  			.labelOffset(20)
  			.orient('horizontal');
  		d3.select(".sizeLegend")
  	  	.call(legendSize1);
      d3.select(".sizeLegend1").style("display", "none")

      // create size legend for death toll
      d3.select(".sizeLegend2").append('svg')
        .append("g")
        .attr("class", "sizeLegend")
        .attr("transform", "translate(13,20)");
      let legendSize2 = d3.legendSize()
        .scale(scaleRdeaths)
        .shape('circle')
        .cells([10,5000,20000,100000])
        .shapePadding(34)
        .labelFormat("d")
        .title("Number of deaths")
        .labelOffset(20)
        .orient('horizontal');
      d3.select(".sizeLegend2 .sizeLegend")
        .call(legendSize2);
      d3.select(".sizeLegend2").style("display", "none")
    }
    createLegends()

    // CREATE OTHER NECESSARY SVG ELEMENTS

    // pane ONE - create display text
    function createDisplayText() {
      textIntroNums = svgForeground.append("g") // this explanatory text shows up on the first pane
        .attr("class", "textIntroNums") // this is purely to make the group easy to see in 'inspect'
        .attr("opacity",0)
      textIntroNums.append("text") // "59 years"
        .attr("class", "pane1text yearCount")
        .attr("x", (textRectangles[0]["x1"]+textRectangles[0]["x2"])/2 )
        .attr("y", 23+(textRectangles[0]["y1"]+textRectangles[0]["y2"])/2 );
      textIntroNums.append("text") // "8,982 disasters"
        .attr("class", "pane1text eventCount")
        .attr("x", (textRectangles[1]["x1"]+textRectangles[1]["x2"])/2 )
        .attr("y", 20+(textRectangles[1]["y1"]+textRectangles[1]["y2"])/2 );
      textIntroNums.append("text") // "3,428,650 lives lost"
        .attr("class", "pane1text deathCount")
        .attr("x", (textRectangles[2]["x1"]+textRectangles[2]["x2"])/2 )
        .attr("y", 18+(textRectangles[2]["y1"]+textRectangles[2]["y2"])/2 );
      textIntroNums.append("text") // "countless lives altered"
        .attr("class", "pane1text livesCount")
        .attr("x", (textRectangles[3]["x1"]+textRectangles[3]["x2"])/2 )
        .attr("y", 18+(textRectangles[3]["y1"]+textRectangles[3]["y2"])/2 );

      // using .innerHTML here so I can include tspans (for separate text sizing)
      document.querySelector(".pane1text.yearCount").innerHTML = "<tspan>59</tspan> years"
      document.querySelector(".pane1text.eventCount").innerHTML = "<tspan>8,982</tspan> disasters"
      document.querySelector(".pane1text.deathCount").innerHTML = "<tspan>3,428,650</tspan> lives lost"
      document.querySelector(".pane1text.livesCount").innerHTML = "<tspan>Countless</tspan> lives altered"
    }
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
      .attr("x", paneDim(3).left)
      .attr("y", 3*paneDim(3).bottom/4)  // needs to be the same as the value found in scaleYeventCount3
      .attr("width", paneDim(3).right - paneDim(3).left )
      .attr("height", paneDim(3).bottom/4)
      .attr("fill", "#fbf9f9")
      .attr("opacity",0);

		// pane TWO - create a bar chart of disaster counts by type
		function createBars2() {
			barsByTypeG = svgBackground.append("g")
				.attr("class", "eventsByType") // this is purely to make the group easy to see in 'inspect'
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
		createBars2()

		// pane THREE - stacked area chart of events by year (colored by type)
		function createStackedArea3() {
			stackedAreaG = svgBackground.append('g')
				.attr("class", "stackedArea")
				.attr("opacity", 0)
			stackedAreaG.selectAll("path")
				.data(eventsStackedByType)
				.join("path")
					.style("fill", function(d) { type = typeGroups[d.key] ;  return typeColor(type); })
					.style("stroke", "none")
          .style("opacity", 0.7 )
					.attr("d", d3.area()
						.curve(d3.curveNatural)
						.x((d,i) => scaleXyear3(d.data.key) )
						.y0( function(d) {
							return scaleYeventCount3(d[0])
						}   )
						.y1( d => scaleYeventCount3(d[1]) )
				)
		}
		createStackedArea3()

    // pane THREE - rectangle to progressively reveal stacked area chart
    // MUST GET CREATED AFTER STACKED AREA
    stackedAreaRevealRect = svgForeground.append('rect')
      .attr("class", "stackedAreaRevealRect")
      .attr("x", paneDim(3).left)
      .attr("y", 3*paneDim(3).bottom/4)  // needs to be the same as the value found in scaleYeventCount3
      .attr("width", 0 )
      .attr("height", paneDim(3).bottom/4)
      .attr("fill", "#fbf9f9")

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
    stackedAreaAux = svgForeground.append("g") // auxiliary components for stacked area chart (subtitle, axis)
      .attr("class", "stackedAreaAux")
      .attr("opacity", 0)
    stackedAreaAux.append("text") // subtitle for stacked area chart
      .attr("class","animationSubtitle")
      .text("Events by year")
      .attr("x", 30)
      .attr("y", Math.min(...scaleYeventCount3.range())+8)
    stackedAreaAux.append("g") // axis for stacked area chart
      .attr("class", "eventCountAxis")
      .attr("transform", `translate(${65},0)`)      // This controls the horizontal position of the Axis
      .call(d3.axisLeft(scaleYeventCount3)
        .ticks(4)
      )

    // pane THREE B - rectangle to represent the future
    svgPane3B = svgForeground.append("g")
      .attr("class","svgPane3B")
      .attr("opacity",0)
    svgPane3B.append("rect")
      .attr("x", scaleXpct3B(0.7) )
      .attr("y", scaleYpct3B(0.1))
      .attr("width", scaleXpct3B(0.95) - scaleXpct3B(0.7))
      .attr("height", scaleYpct3B(0.45) - scaleYpct3B(0.1))
      .attr("fill", "#EFE8E4")
    svgPane3B.append("text")
      .attr("class", "qMark")
      .text("?")
      .attr("text-anchor", "middle")
      .attr("x", scaleXpct3B(0.7)+(scaleXpct3B(0.95) - scaleXpct3B(0.7))/2)
      .attr("y", scaleYpct3B(0.1) + (scaleYpct3B(0.45) - scaleYpct3B(0.1))/2)
      .attr("dy", 17)
    svgPane3B.append("line") // 1960-1969
      .attr("class", "dotted annotLine")
      .attr("x1", scaleXpct3B(0.05 + 0.125) )
      .attr("y1", scaleYpct3B(0.1 + 0.35 + 0.02) + 30 )
      .attr("x2", scaleXyear3(1960) + (scaleXyear3(1969.5)-scaleXyear3(1960))/2 )
      .attr("y2", Math.min(...scaleYeventCount3.range()) + 140 )
    svgPane3B.append("line") // 2009-2018
      .attr("class", "dotted annotLine")
      .attr("x1", scaleXpct3B(0.375 + 0.125) )
      .attr("y1", scaleYpct3B(0.1 + 0.35 + 0.02) + 30 )
      .attr("x2", scaleXyear3(2008.5) + (scaleXyear3(2018)-scaleXyear3(2008.5))/2 )
      .attr("y2", Math.min(...scaleYeventCount3.range()) +20 )

		// pane FOUR - create a bar chart of total death counts by type
		function createBars4() {
			deathsByTypeG = svgBackground.append("g")
				.attr("class", "deathsByType") // this is purely to make the group easy to see in 'inspect'
				.attr("opacity",0)
			deathsByTypeG.selectAll("rect.typeBg") // background bars
				.data(deathsByType)
				.join("rect")
				.attr("class","typeBg")
				.attr("x", d => scaleXtypes(d[0]) )
				.attr("y", d => paneDim(4).top )
				.attr("width", scaleXtypes.bandwidth() )
				.attr("height", paneDim(4).bottom-paneDim(4).top )
				.attr("fill","#EFE8E4")
				.attr("opacity", 0.7);
			deathsByTypeG.selectAll("rect.typeCounts") // death toll bars
				.data(deathsByType)
				.join("rect")
				.attr("class","typeCounts")
				.attr("x", d => scaleXtypes(d[0]) )
				.attr("y", d => scaleYdeathCount(d[1]) )
				.attr("width", d => scaleXtypes.bandwidth() )
				.attr("height", d => paneDim(4).bottom - scaleYdeathCount(d[1]) )
				.attr("fill", d => typeColor(d[0]) )
				.attr("opacity", 0.65);
			deathsByTypeLabels = deathsByTypeG.append("g")
			deathsByTypeLabels.selectAll("text") // disaster type names
				.data(deathsByType)
				.join("text")
        .attr("class", "typeLabels")
				.text(d => d[0])
				.attr("x", d => scaleXtypes(d[0]) + scaleXtypes.bandwidth()/2 )
				.attr("y", paneDim(4).bottom + 28)
			deathsByTypeLabels.selectAll("text.count") // eventCounts
				.data(deathsByType)
				.join("text")
				.attr("class","count")
				.text(d => d3.format(",")(d[1]))
				.attr("x", d => scaleXtypes(d[0])+scaleXtypes.bandwidth()/2 )
				.attr("text-anchor", "middle")
				.attr("y", d => scaleYdeathCount(d[1]) - 11 );
		}
		createBars4()

    // pane FIVE - create slope lines
    function createSlopegraph5() {
      slopegraphG = svgBackground.append('g')
        .attr("class","slopegraphs")
        .attr("opacity",0)
      let bgPad = 65
      let bgPadTop = 60
      slopegraphG.selectAll("rect.typeBg") // background boxes to delineate each section
        .data([[markers5.L1,markers5.L2],[markers5.R1,markers5.R2]]) // data to help create two boxes at once
        .join("rect")
        .attr("class","typeBg")
        .attr("x", d => scaleXpct5(d[0])-bgPad )
        .attr("y", d => scaleYeventPct(d3.max(eventChangesByType, d => d[1])) - bgPadTop )
        .attr("width", d => scaleXpct5(d[1])-scaleXpct5(d[0]) + 2*bgPad )
        .attr("height", scaleYeventPct(-1) - scaleYeventPct(d3.max(eventChangesByType, d => d[1])) + 1.7*bgPadTop )
        .attr("fill","#F4EFED")
      slopegraphG.selectAll("rect.graphBg") // background boxes to delineate graph portion
        .data([[markers5.L1,markers5.L2],[markers5.R1,markers5.R2]]) // data to help create two boxes at once
        .join("rect")
        .attr("class","graphBg")
        .attr("x", d => scaleXpct5(d[0]) )
        .attr("y", d => scaleYeventPct(d3.max(eventChangesByType, d => d[1])) )
        .attr("width", d => scaleXpct5(d[1])-scaleXpct5(d[0]) )
        .attr("height", scaleYeventPct(-1) - scaleYeventPct(d3.max(eventChangesByType, d => d[1])) )
        .attr("fill","#EFE8E4")
      slopegraphG.selectAll("line.eventChanges")
        .data(eventsByTypeFirstLast)
        .join("line")
        .attr("class","eventChanges")
				.attr("x1", scaleXpct5(markers5.L1))
				.attr("y1", d => scaleYeventCount5(d[1]))
				.attr("x2", scaleXpct5(markers5.L2))
				.attr("y2", d => scaleYeventCount5(d[2]))
      slopegraphG.selectAll("line.deathChanges")
        .data(deathsByTypeFirstLast)
        .join("line")
        .attr("class","deathChanges")
				.attr("x1", scaleXpct5(markers5.R1))
				.attr("y1", d => scaleYdeathCount5(d[1]))
				.attr("x2", scaleXpct5(markers5.R2))
				.attr("y2", d => scaleYdeathCount5(d[2]))
      slopegraphG.selectAll("line") // additional attributes for all lines
        .attr("stroke", d => typeColor(d[0]))
        .attr("stroke-width", 3 )
        .attr("stroke-linecap", "round")
        .attr("opacity", 0.7)

      // create subheader text elements
      slopegraphG.append("text")
        .attr("class","subtitle eventsSubtitle")
        .attr("x", scaleXpct5((markers5.L1+markers5.L2)/2))
        .attr("y", scaleYeventCount5(1315))
      slopegraphG.append("text")
        .attr("class","subtitle deathsSubtitle")
        .attr("x", scaleXpct5((markers5.R1+markers5.R2)/2))
        .attr("y", scaleYeventCount5(1315))

      slopegraphG5A = slopegraphG.append('g') // elements that only apply to pane 5 (A)
        .attr("class","slopegraphsPane5A")
      slopegraphG5B = slopegraphG.append('g') // elements that only apply to pane 5B
        .attr("class","slopegraphsPane5B")

      // create labels for lines
      // definitely some hardcoding here, unfortunately
      // I looked into it and it was going to be a lot of effort to do otherwise
      //   (and still likely difficult to read)
      slopegraphG5A.selectAll("text.labelEventStart")
        .data(eventsByTypeFirstLast)
        .join("text")
        .attr("class","graphLabel labelEventStart anchorEnd")
        .text(function(d) {
          if (d[0] == 'flood' || d[0] == 'storm' || d[0] == 'earthquake') {
            return d[1]
          } else if (d[0] == 'volcanic activity') {
            return "2-17"
          }
        })
        .attr("x", scaleXpct5(markers5.L1) - 4)
        .attr("y", d => scaleYeventCount5(d[1])+4)
        .attr("dy", d => d[0] == 'storm' ? -6 : 0)
      slopegraphG5A.selectAll("text.labelEventEnd")
        .data(eventsByTypeFirstLast)
        .join("text")
        .attr("class","graphLabel labelEventEnd anchorStart")
        .text(d => d[2])
        .attr("x", scaleXpct5(markers5.L2) + 4)
        .attr("y", d => scaleYeventCount5(d[2])+4)
      slopegraphG5A.selectAll("text.labelDeathStart")
        .data(deathsByTypeFirstLast)
        .join("text")
        .attr("class","graphLabel labelDeathStart anchorEnd")
        .text(function(d) {
          if (d[0] == 'drought' || d[0] == 'landslide' || d[0] == 'volcanic activity') {
            return ""
          } else {
            return d3.formatPrefix(".0", d[1])(d[1])
          }
        })
        .attr("x", scaleXpct5(markers5.R1) - 4)
        .attr("y", d => scaleYdeathCount5(d[1])+4)
      slopegraphG5A.selectAll("text.labelDeathEnd")
        .data(deathsByTypeFirstLast)
        .join("text")
        .attr("class","graphLabel labelDeathEnd anchorStart")
        .text(d => d3.formatPrefix(".0", d[2])(d[2]))
        .attr("x", scaleXpct5(markers5.R2) + 4)
        .attr("y", d => scaleYdeathCount5(d[2])+4)
      slopegraphG5B.selectAll("text.labelEventPct")
        .data(eventChangesByType)
        .join("text")
        .attr("class", d => "graphLabel labelEventPct anchorStart" + (d[0] == 'extreme temperature'? " ext" : ""))
        .text(d => d3.format(".3p")(d[1]) )
        .attr("x", scaleXpct5(markers5.L2) + 4)
        .attr("y", d => scaleYeventPct(d[1])+4)
        .attr("dy", d => d[0] == 'volcanic activity' ? -3 : (d[0] == 'earthquake' ? 3 : 0) )
      d3.select(".ext").append("tspan")
        .text("(51X)")
        .attr("dy", 17)
        .attr("dx", -38)
      slopegraphG5B.selectAll("text.labelDeathPct")
        .data(deathChangesByType)
        .join("text")
        .attr("class", d => "graphLabel labelDeathPct anchorStart" + (d[0] == 'extreme temperature'? " ext" : ""))
        .text(function(d) {
          if (d[0] == 'extreme temperature' || d[0] == 'earthquake' || d[0] == 'storm') {
            return d3.format(".3p")(d[1])
          } else if (d[0] == 'storm') {
            return d3.format(".2p")(d[1])
          } else { return "" }
        } )
        .attr("x", scaleXpct5(markers5.R2) + 4)
        .attr("y", d => scaleYdeathPct(d[1])+4)
        .attr("dy", d => d[0] == 'earthquake' ? -6 : 0)
      d3.select(".labelDeathPct.ext").append("tspan")
        .text("(275X)")
        .attr("dy", 17)
        .attr("dx", -46)
      slopegraphG5B.append("text")
        .attr("class", "graphLabel anchorEnd")
        .text("0")
        .attr("x", scaleXpct5(markers5.L1) - 4)
        .attr("y", scaleYeventPct(0))
      slopegraphG5B.append("text")
        .attr("class", "graphLabel anchorEnd")
        .text("0")
        .attr("x", scaleXpct5(markers5.R1) - 4)
        .attr("y", scaleYdeathPct(0))
    }
    createSlopegraph5()

		// pane SIX - create lightly colored background bars for the log plots
		function createBars6() {
			logBarsG = svgBackground.append("g")
				.attr("class", "logBars") // this is purely to make the group easy to see in 'inspect'
				.attr("opacity",0)
			logBarsG.selectAll("rect")
				.data(eventsByType)
				.join("rect")
        // these dimensions/coordinates are a little funky because I want the rectangles
        //   slighly larger than the space taken up by the data points
				.attr("x", d => scaleXdeadliest(d[0]) - 0.05*scaleXdeadliest.bandwidth() )
				.attr("y", d => paneDim(6).top - 7 )
				.attr("width", 1.1*scaleXdeadliest.bandwidth() )
				.attr("height", paneDim(6).bottom-paneDim(6).top + 14 )
				.attr("fill", d => typeColor(d[0]) )
				.attr("opacity", 0.1);
      svgPane6 = svgForeground.append("g")
        .attr("class","svgPane6")
        .attr("opacity",0)
      svgPane6.selectAll("line")
        .data(medianDeathsByType)
        .join("line")
        .attr("class", "logLine")
        .attr("x1", d => scaleXdeadliest(d[0])-14)
        .attr("y1", d => scaleYdeadliest(d[1]))
        .attr("x2", d => scaleXdeadliest(d[0])+ scaleXdeadliest.bandwidth()+14)
        .attr("y2", d => scaleYdeadliest(d[1]))
      svgPane6.selectAll("text")
        .data(medianDeathsByType)
        .join("text")
        .attr("class", "logLabel")
        .text(d => Math.ceil(d[1]))
        .attr("x", d => scaleXdeadliest(d[0])+ scaleXdeadliest.bandwidth()+6)
        .attr("y", d => scaleYdeadliest(d[1]) - 10)
      svgPane6.selectAll("text.typeLabels") // disaster type names
				.data(medianDeathsByType)
				.join("text")
        .attr("class", "typeLabels")
				.text(d => d[0])
				.attr("x", d => scaleXdeadliest(d[0]) + scaleXdeadliest.bandwidth()/2 )
				.attr("y", paneDim(6).bottom + 28)
      svgPane6.append("g") // axis for log scale
        .attr("class", "logScaleAxis")
        .attr("transform", `translate(${90},0)`)      // This controls the horizontal position of the Axis
        .call(d3.axisLeft(scaleYdeadliest)
          .tickValues([0,1,10,100,1000,10000,100000])
          .tickFormat(d3.format(".1s"))
        )
      svgPane6.append("text") // add title to y-axis
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -paneDim(6).left + 154) // add here to move label RIGHT
        .attr("x", -paneDim(6).top - (paneDim(6).bottom-paneDim(6).top)/2) // subtract here to move label DOWN
        .text("Death count (log scale)")
		}
		createBars6()

		// pane SEVEN - create lollipop lines and year axis
		function createLollipopLines() {
			lollipopLines = svgBackground.append("g")
				.attr("class", "lollipopLines") // this is purely to make the group easy to see in 'inspect'
				.attr("opacity",1)
			lollipopLines.selectAll("line")
				.data(lollipopEvents)
				.join("line")
				.attr("stroke", d => typeColor(d.disasterType))
				.attr("stroke-width", 1.5 )
				.attr("x1", d => scaleXyear7(d.year)-8+16*d.jitter)
				.attr("y1", d => dispHeight*1.2)
				.attr("x2", d => scaleXyear7(d.year)-8+16*d.jitter)
				.attr("y2", d => dispHeight*1.2)
				.attr("opacity", 0.7)
      svgPane7 = svgForeground.append("g")
        .attr("class", "svgPane7")
        .attr("opacity",0)
      pane7yearAxis = svgPane7.append("g")
        .attr("class", "pane7yearAxis")
        .attr("transform", `translate(0,${paneDim(7).bottom+15})`)      // This controls the vertical position of the Axis
        .call(d3.axisBottom(scaleXyear7)
          .ticks(6)
          .tickFormat(d3.format("d"))
        )
      pane7deathAxis = svgPane7.append("g") // axis for linear scale of death counts
        .attr("class", "pane7deathAxis")
        .attr("transform", `translate(${95},0)`)      // This controls the horizontal position of the Axis
        .call(d3.axisLeft(scaleYdeaths)
          .ticks(5)
          .tickFormat(d3.format(".1s"))
        )
      svgPane7.append("text") // add title to y-axis
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -paneDim(7).left + 154) // add here to move label RIGHT
        .attr("x", -paneDim(7).top - (paneDim(7).bottom-paneDim(7).top)/2) // subtract here to move label DOWN
        .text("Death count (linear scale)")

		}
		createLollipopLines()

    // pane EIGHT - create teardrop shapes on map
    function createTeardrops() {
      teardrops = svgForeground.append("g")
        .attr("class", "teardrops")
      teardrops.selectAll("path.TR")  // top right - sized by death toll
        .data(deadliestEvents)
        .join("path")
        .attr("class", "TR")
        .attr( "d", d => teardrop( 0.6*scaleRdeaths(d.deaths), 1, 0) )
      teardrops.selectAll("path.BR")  // bottom right - sized by total affected
        .data(deadliestEvents)
        .join("path")
        .attr("class", "BR")
        .attr( "d", d => teardrop( d.totalAffected === 0? 0 : scaleRaffected(d.totalAffected), 1, 1) )
      teardrops.selectAll("path.BL")  // bottom left - sized by damages
        .data(deadliestEvents)
        .join("path")
        .attr("class", "BL")
        .attr( "d", d => teardrop( scaleRdamages(d.damages), 1, 2) )
      teardrops.selectAll("path.TL")  // top left - sized by geoIdCount
        .data(deadliestEvents)
        .join("path")
        .attr("class", "TL")
        .attr( "d", d => teardrop( 1.2*scaleRgeo(d.geoIdCount), 1, 3) )
      teardrops.selectAll("path")  // add attributes shared by all teardrops
        .attr("fill",d => typeColor(d.disasterType))
        .attr("opacity", 0)
    }
    createTeardrops()
    transitionTeardrops() // move them to their starting positions with opacity = 0

    // pane EIGHT - initiate teardrop lines with zero length
    function createTeardropOffsetLines() {
      teardropLines = svgForeground.append("g")
        .attr("class", "teardropLines")
      teardropLines.selectAll("line")  // only create a line if an offset is present
				.data(deadliestEvents.filter(d => d.offsetX !== 0))
				.join("line")
				.attr("stroke", d => typeColor(d.disasterType))
				.attr("stroke-width", 1.5 )
				.attr("x1", d => projection([d.longitude,d.latitude])[0])
				.attr("y1", d => projection([d.longitude,d.latitude])[1])
				.attr("x2", d => projection([d.longitude,d.latitude])[0])
				.attr("y2", d => projection([d.longitude,d.latitude])[1])
				.attr("opacity", 0.6)
    }
    createTeardropOffsetLines()

    gdpAxis = svgBackground.append("line")
      .attr("class","gdpAxis annotLine")
      .attr("opacity",0)
      .attr("x1", d => paneDim(9).left)
      .attr("y1", d => paneDim(9).top + (paneDim(9).bottom - paneDim(9).top)/2 )
      .attr("x2", d => paneDim(9).right)
      .attr("y2", d => paneDim(9).top + (paneDim(9).bottom - paneDim(9).top)/2)

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
    annotations3B = svgPane3B.append("g")
      .attr("class", "annotations3B")
      .call(makeAnnotations3B)


    let annotAttr4 = [
      {
        note: { label: "Varying densities reflect the varying death tolls per event" },
        x: scaleXtypes("flood") - 0.4*scaleXtypes.bandwidth(), y: scaleYdeathCount(600000), dx: 130, dy: -30, wrap: 100
      }
    ]
    let makeAnnotations4 = d3.annotation()
      .annotations(annotAttr4)
    annotations4 = svgForeground.append("g")
      .attr("class", "annotations4")
      .attr("opacity", 0)
      .call(makeAnnotations4)
    annotations4.append("line")
      .attr("class", "annotLine")
      .attr("x1", d => scaleXtypes("flood") - 0.4*scaleXtypes.bandwidth()+130)
      .attr("y1", d => scaleYdeathCount(600000)-30)
      .attr("x2", d => scaleXtypes("flood") + 0.5*scaleXtypes.bandwidth() )
      .attr("y2", d => scaleYdeathCount(360000))

    let annotAttr5 = [
      {
        note: { label: "1960-1969" },
        x: scaleXpct5(markers5.L1),
        y: scaleYeventCount5(0)+10,
        dx: 0, dy: 0
      },
      {
        note: { label: "2009-2018" },
        x: scaleXpct5(markers5.L2),
        y: scaleYeventCount5(0)+10,
        dx: 0, dy: 0
      },
      {
        note: { label: "1960-1969" },
        x: scaleXpct5(markers5.R1),
        y: scaleYeventCount5(0)+10,
        dx: 0, dy: 0
      },
      {
        note: { label: "2009-2018" },
        x: scaleXpct5(markers5.R2),
        y: scaleYeventCount5(0)+10,
        dx: 0, dy: 0
      }
    ]
    let makeAnnotations5 = d3.annotation()
      .annotations(annotAttr5)
      .type(d3.annotationLabel)
    slopegraphG.append("g")
      .attr("class", "annotations5")
      .call(makeAnnotations5)

    let annotAttr5A = [
      {
        note: { label: "Fewer deaths from storms and volcanic activity are generally attributed to better alert systems" },
        x: scaleXpct5(0.76),
        y: scaleYeventCount5(330),
        dx: 30, dy: -40
      }
    ]
    let makeAnnotations5A = d3.annotation()
      .annotations(annotAttr5A)
      .type(d3.annotationCallout)
    slopegraphG5A.append("g")
      .attr("class", "annotations5A")
      .call(makeAnnotations5A)

    let annotAttr6 = [
      {
        note: { label: "Median values show 'typical' death tolls for each type" },
        x: scaleXdeadliest('extreme temperature') + scaleXdeadliest.bandwidth()/6,
        y: scaleYdeadliest(40), dx: 38, dy: -182
      }
    ]
    let makeAnnotations6 = d3.annotation()
      .textWrap(73)
      .annotations(annotAttr6)
      .type(d3.annotationCallout)
    svgPane6.append("g")
      .attr("class", "annotations6")
      .call(makeAnnotations6)

    let annotAttr8 = [
      {
        note: { label: "Europe's 2003 heat wave was recorded in 155 distinct locations across 15 countries" },
        x: 510, y: 185, dx: 30, dy: -35
      },
      {
        note: { label: "This drought in Africa (The Congo, Ethiopa and Sudan) caused a famine that killed an estimated 450,000 people." },
        x: 560, y: 370, dx: -55, dy: 40
      },
      {
        note: { label: "46M people were affected by the 8.0 magnitude Great Sichuan earthquake of 2008.  It caused over $100M in damages and killed over 87,000 people." },
        x: 808, y: 475, dx: -50, dy: 40
      }
    ]
    let makeAnnotations8 = d3.annotation()
      .textWrap(160)
      .annotations(annotAttr8)
      .type(d3.annotationCallout)
    annotations8 = svgForeground.append("g")
      .attr("class", "annotations8")
      .call(makeAnnotations8)
      .attr("opacity",0)

    let annotAttr9 = [
      {
        note: { label: "World: $11,339" },
        x: scaleXgdp(11339), y: paneDim(9).top, dy: paneDim(9).bottom - paneDim(9).top, className: "gdp",
        subject: { y1: paneDim(9).top, y2: paneDim(9).bottom }
      },
      {
        note: { label: "US: $68,309" },
        x: scaleXgdp(68309), y: paneDim(9).top, dy: paneDim(9).bottom - paneDim(9).top, className: "gdp",
        subject: { y1: paneDim(9).top, y2: paneDim(9).bottom }
      }
    ]
    let makeAnnotations9 = d3.annotation()
      .annotations(annotAttr9)
      .type(d3.annotationXYThreshold)
      .disable('connector')
    annotations9 = svgBackground.append("g")
      .attr("class", "annotations9")
      .call(makeAnnotations9)
      .attr("opacity",0)


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

	function transitionPane4() {   // vertical bar chart for total death count by disaster type
    updateGraphTitles("4")
		for (let i = 0; i < eventsFlat.length; i++) {
			let node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': scaleFactor*(scaleXtypes(node.disasterType)+scaleXtypes.bandwidth()*node.jitter),
				'cy': 7+scaleFactor*scaleYdeathCount(node.jitter2*(node.typeDeathCount-14)),
				'r': 16,
				'opacity': 0.4
		}}
	} // transitionPane4()

	function transitionPane5A() {   // slopegraphs part 1
    updateGraphTitles("5A")
		for (let i = 0; i < eventsFlat.length; i++) {
			let node = eventsFlat[i];
      let cx = 0
      let cy = 0
      let dL = events1map.get(node.disasterType)
      let dR = deaths1map.get(node.disasterType)
      let pctOfLine = Math.min(1, (node.yearCounter - startingYearInc)/yearCountAnim )
      if (node.jitter3 < 0.5) {
        cx = scaleXpct5(markers5.L1) + pctOfLine*(scaleXpct5(markers5.L2) - scaleXpct5(markers5.L1));
        cy = scaleYeventCount5(dL[0]) + pctOfLine*(scaleYeventCount5(dL[1]) - scaleYeventCount5(dL[0]));
      } else {
        cx = scaleXpct5(markers5.R1) + pctOfLine*(scaleXpct5(markers5.R2) - scaleXpct5(markers5.R1))
        cy = scaleYdeathCount5(dR[0]) + pctOfLine*(scaleYdeathCount5(dR[1]) - scaleYdeathCount5(dR[0]));
      }
			circleEndInfo[i] = {
				'cx': scaleFactor*cx,
				'cy': scaleFactor*cy,
				'r': 9,
				'opacity': 0.3
		}}
	} // transitionPane5A()

  function transitionPane5B() {   // slopegraphs part 2
    updateGraphTitles("5B")
    for (let i = 0; i < eventsFlat.length; i++) {
      let node = eventsFlat[i];
      let cx = 0
      let cy = 0
      let dL = events2map.get(node.disasterType)
      let dR = deaths2map.get(node.disasterType)
      let pctOfLine = Math.min(1, (node.yearCounter - startingYearInc)/yearCountAnim )
      if (node.jitter3 < 0.5) {
        cx = scaleXpct5(markers5.L1) + pctOfLine*(scaleXpct5(markers5.L2) - scaleXpct5(markers5.L1));
        cy = scaleYeventPct(0) + pctOfLine*(scaleYeventPct(dL) - scaleYeventPct(0));
      } else {
        cx = scaleXpct5(markers5.R1) + pctOfLine*(scaleXpct5(markers5.R2) - scaleXpct5(markers5.R1))
        cy = scaleYdeathPct(0) + pctOfLine*(scaleYdeathPct(dR) - scaleYdeathPct(0));
      }
      circleEndInfo[i] = {
        'cx': scaleFactor*cx,
        'cy': scaleFactor*cy,
        'r': 9,
        'opacity': 0.3
    }}
  } // transitionPane5B()

	function transitionPane6() {   // deadliest individual events / log scale
    updateGraphTitles("6")
		for (let i = 0; i < eventsFlat.length; i++) {
			let node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': scaleFactor*(scaleXdeadliest(node.disasterType) + scaleXdeadliest.bandwidth()*node.jitter),
				'cy': scaleFactor*scaleYdeadliest(node.deaths),
				'r': 13,
				'opacity': 0.38
		}}
	} // transitionPane6()

	function transitionPane7() {   // deaths by year lollipop chart
    updateGraphTitles("7")
		for (let i = 0; i < eventsFlat.length; i++) {
			let node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': scaleFactor*scaleXyear7(node.year)-32+64*node.jitter,
				'cy': scaleFactor*scaleYdeaths(node.deaths),
				'r': 24,
				'opacity': 0.6
		}}
	} // transitionPane7()

	function transitionPane8() {   // map of top 15 deadliest events / teardrop
    updateGraphTitles("8")
		for (let i = 0; i < eventsFlat.length; i++) {
			let node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': scaleFactor*(projection([node.longitude,node.latitude])[0]+node.offsetX),
				'cy': (node.deaths < 37000)? canvasHeight*1.1 : scaleFactor*(projection([node.longitude,node.latitude])[1]+node.offsetY),
				'r': 90,
				'opacity': 0
		}}
	} // transitionPane8()

	function transitionPane9A() {   // deaths top 15 by GDP
    updateGraphTitles("9A")
		for (let i = 0; i < eventsFlat.length; i++) {
			let node = eventsFlat[i];
      let cx = 0;
      let cy = 0;
      let r = 0;
      if (node.deaths < 37000) {
        cx = -0.5*canvasWidth + 2*canvasWidth*node.jitter
        cy = 1.1*canvasHeight
        r = 2*scaleFactor*scaleRdeaths(node.deaths)
      } else {
        cx = scaleFactor*scaleXgdp(node.gdpInUsdPerCountry)
        cy = scaleFactor*(paneDim(9).top + (paneDim(9).bottom - paneDim(9).top)/2)
        r = scaleFactor*scaleRdeaths(node.deaths)
      }
			circleEndInfo[i] = {'cx': cx, 'cy': cy, 'r':r, 'opacity': 0.6}
    }
	} // transitionPane9A()

	function transitionPane9B() {   // deaths by GDP
    updateGraphTitles("9B")
		for (let i = 0; i < eventsFlat.length; i++) {
			let node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': scaleFactor*scaleXgdp(node.gdpInUsdPerCountry),
				'cy': scaleFactor*(paneDim(9).top + (paneDim(9).bottom - paneDim(9).top)/2),
				'r': scaleFactor*scaleRdeaths(node.deaths),
				'opacity': 0.3
		}}
	} // transitionPane9B()

	function transitionPane10() {   // final words
    updateGraphTitles("10")
		for (let i = 0; i < eventsFlat.length; i++) {
			let node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': canvasWidth*node.jitter,
				'cy': canvasHeight*node.jitter2,
				'r': 7*node.geoIdCount,
				'opacity': 0.33
		}}
	} // transitionPane10()



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
			stats.begin();
			interpCircMove(elapsed - dt);
			dt = elapsed;
			drawCircles(mainCtx)
			stats.end();
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
    mapGroup.transition().call(fadeOutStd) // pane THREE
    stackedAreaBgRect.transition().call(fadeOutStd) // pane THREE
      .delay(speedFactor*200)
    stackedAreaG.transition().call(fadeOutStd) // pane THREE
  }
  function deactivatePane3B() {
    stackedAreaHideRect.transition().call(fadeOutStd)
  }
  function deactivatePane4() {
    deathsByTypeG.transition() // pane FOUR
      .duration(speedFactor*700)
      .attr('opacity',0)
    annotations4.transition().call(fadeOutStd)
    }
  function deactivatePane5() {
    slopegraphG.transition().call(fadeOutStd) // pane FIVE
    slopegraphG.selectAll("line")
      .transition()
      .duration(speedFactor*800)
      .attr("y1", d => scaleYeventPct(-1))
      .attr("y2", d => scaleYeventPct(-1))
  }
  function deactivatePane5A() {
    slopegraphG5A.transition().call(fadeOutStd)
  }
  function deactivatePane5B() {
    slopegraphG5B.transition().call(fadeOutStd)
  }
  function deactivatePane6() {
    logBarsG.transition() // pane SIX
      .duration(speedFactor*700)
      .attr('opacity',0)
    svgPane6.transition().call(fadeOutStd) // pane SIX
  }
  function deactivatePane7() {
    svgPane7.transition().call(fadeOutStd)
    lollipopLines.selectAll("line") // pane SEVEN
      .transition()
      .duration(speedFactor*800)
      .attr("x1", d => scaleXyear7(d.year)-8+16*d.jitter)
      .attr("y1", d => dispHeight*1.2)
      .attr("x2", d => scaleXyear7(d.year)-8+16*d.jitter)
      .attr("y2", d => dispHeight*1.2)
  }
  function deactivatePane8() {
    mapGroup.transition().call(fadeOutStd) // pane EIGHT
    transitionTeardrops()
    teardropLines.selectAll("line").transition() // pane EIGHT
      .duration(speedFactor*800)
      .attr("x2", d => projection([d.longitude,d.latitude])[0])
      .attr("y2", d => projection([d.longitude,d.latitude])[1])
    d3.select(".teardropLegend").style("display", "none") // pane EIGHT
    annotations8.transition().call(fadeOutStd)
  }
  function deactivatePane9() {
    d3.select(".sizeLegend2").style("display", "none") // pane NINE
    annotations9.transition().call(fadeOutStd)
    gdpAxis.transition().call(fadeOutStd)
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

    // populate four arrays, one for each of the slopegraphs
    for (let i = 0; i < typeGroups.length; i++) {
      let thisType = typeGroups[i]
      eventsByTypeFirstLast.push([thisType,eventsByTypeFirst10.get(thisType),eventsByTypeLast10.get(thisType)])
      deathsByTypeFirstLast.push([thisType,deathsByTypeFirst10.get(thisType),deathsByTypeLast10.get(thisType)])
      eventsPctChg = (eventsByTypeLast10.get(thisType)-eventsByTypeFirst10.get(thisType)) / eventsByTypeFirst10.get(thisType)
      eventChangesByType.push([thisType,eventsPctChg])
      deathsPctChg = (deathsByTypeLast10.get(thisType)-deathsByTypeFirst10.get(thisType)) / deathsByTypeFirst10.get(thisType)
      deathChangesByType.push([thisType,deathsPctChg])
    }

    // create map objects from the arrays above - to be used for pane 5 circle transitions
    events1map = new Map(eventsByTypeFirstLast.map(key => [key[0], [key[1],key[2]]]));
    deaths1map = new Map(deathsByTypeFirstLast.map(key => [key[0], [key[1],key[2]]]));
    events2map = new Map(eventChangesByType.map(key => [key[0], key[1]]));
    deaths2map = new Map(deathChangesByType.map(key => [key[0], key[1]]));

		// find the 15 deadliest events
		deadliestEvents = eventData.sort(function(a, b) {
			return d3.descending(+a.deaths, +b.deaths);
		}).slice(0, 15);

    // define offsets for the teardrop map
    let offsetValues = {
      '2008-0192':[40,120],
      '1970-0063':[-20,-150],
      '1973-9005':[-90,-30],
      '1991-0120':[120,-10]
    }
		for (let i = 0; i < deadliestEvents.length; i++) {
      thisEvent = deadliestEvents[i]
      if (offsetValues[thisEvent.disasterNum]) {
        deadliestEvents[i].offsetX = offsetValues[thisEvent.disasterNum][0];
        deadliestEvents[i].offsetY = offsetValues[thisEvent.disasterNum][1];
      } else {
        deadliestEvents[i].offsetX = 0;
        deadliestEvents[i].offsetY = 0;
      }
    }

		// count total events by year
		eventsByYearCounts = Array.from(
			d3.rollup(eventData, v => v.length, d => d.year).entries()
		).sort((a,b) => d3.ascending(+a[0], +b[0]) );

		// find the events with more than 7000 deaths
		//   so we can create all lollipop lines that would be at least 16 pixels long
		lollipopEvents = eventData.sort(function(a, b) {
			return d3.descending(+a.deaths, +b.deaths);
		}).slice(0, 43);

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
