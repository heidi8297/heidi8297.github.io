
window.onbeforeunload = function () {
  window.scrollTo(0, 0);
}

window.createGraphic = function(graphicSelector) {

	//----------------------------------------------------------------------------
	// DEFINE INITIAL VARIABLES AND FUNCTIONS
	//----------------------------------------------------------------------------
	let data = [];
	let mapData = [];
	let eventData = [];
	let eventsByType = [];
	let eventTypesByDeathTolls = [];
	let deadliestEvents = [];
	let lollipopEvents = [];
	let firstTenYears = [];
	let lastTenYears = [];
	let eventsByYear = [];
	let eventsFlat = [];
	var lockInc = 0;

	// variables needed for transition method
	var circleStartInfo = {};
	var circleEndInfo = {};
	var ease = d3.easeCubicInOut;
	var setDuration = 2000;
	var timeElapsed = 0;
	var interpolators = null;

	//Dataset to swtich between color of a circle (in the hidden canvas) and the node data
  var colToCircle = {};

	const canvasWidth = 4000;
	const canvasHeight = 3200;

	// this should be the same size as defined in CSS
	const dispWidth = 1000;
	const dispHeight = 800;
	const scaleFactor = canvasWidth/dispWidth;

	const speedFactor = 1.5;

	let setupComplete = false;

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
	function margins(paneNum, units = 0) {
	// paneNum is an integer from 1-10, units = 0 for canvas, 1 for svg
	// returns an object of the form {top: 120, right: 120, bottom: 120, left: 120}
	// usage:  margins(2,1).right  = give me the righthand margin for the 2nd pane in svg units
		let fScale;
		units === 0 ? fScale = scaleFactor : fScale = 1 ;
		if (paneNum === 2) { // bar chart - event count by type
			return {top: fScale*70, right: fScale*30, bottom: fScale*80, left: fScale*30}
		} else if (paneNum === 4) { // bar chart - total death toll by type
			return {top: fScale*40, right: fScale*70, bottom: fScale*80, left: fScale*70}
		} else if (paneNum === 6) { // log scale / deaths per disaster
			return {top: fScale*50, right: fScale*60, bottom: fScale*80, left: fScale*110}
		} else if (paneNum === 7) { // deaths by year, linear scale
			return {top: fScale*35, right: fScale*35, bottom: fScale*50, left: fScale*35}
		}

		// default margins
		return {top: fScale*30, right: fScale*30, bottom: fScale*30, left: fScale*30}
	}

	// complementary function to the one above, but returns the actual values of left and right instead of the margins
	function paneDim(paneNum, units = 0) {
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

	//Generates the next color in the sequence, going from 0,0,0 to 255,255,255.
	//From: https://bocoup.com/weblog/2d-picking-in-canvas
	var nextCol = 1;
	function genColor() {
			var ret = [];
			if (nextCol < 16777215) {   // via http://stackoverflow.com/a/15804183
					ret.push(nextCol & 0xff); // R
					ret.push((nextCol & 0xff00) >> 8); // G
					ret.push((nextCol & 0xff0000) >> 16); // B
					nextCol += 1;
			}
			var col = "rgb(" + ret.join(',') + ")";
			return col;
	} // genColor()

	var stats = new Stats();
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

		// create a 'custom' element that will be part of a 'virtual' DOM
		//   we will use this to bind our data without cluttering the actual DOM
		detachedContainer = document.createElement("custom");
		dataContainer = d3.select(detachedContainer);

		// create an svg which we will use for axes and/or other plotting needs
		svgForeground = d3.select("#viz-container").append('svg')
			.attr("class", "svgForeground"); // this is purely to make it easy to see in 'inspect'

		// create a hidden canvas in which each circle will have a different color
    // we can use this for tooltips
    hiddenCanvas  = d3.select('#viz-container')
			.append('canvas')
			.attr('width', canvasWidth)
			.attr('height', canvasHeight)
      .style('display','none')
			.attr("class", "hiddenCanvas"); // this is purely to make it easy to see in 'inspect'
    hiddenCtx = hiddenCanvas.node().getContext("2d");

		// Define the div for the tooltip
		tooltipMain = d3.select('#viz-container').append("div")
		  .attr("class", "tooltip tooltipMain");

	}
	initializeDrawingSpaces()

	// activate tooltip when the mouse moves over an event circle
	d3.select('.mainCanvas').on('mousemove', function(e) {
	  drawCircles(hiddenCtx, true); // draw the hidden canvas
		var mouseX = e.layerX || e.offsetX;
		var mouseY = e.layerY || e.offsetY;
		// pick the color from the mouse position
		var pickedCol = hiddenCtx.getImageData(scaleFactor*mouseX, scaleFactor*mouseY, 1, 1).data;
  	var colKey = 'rgb(' + pickedCol[0] + ',' + pickedCol[1] + ',' + pickedCol[2] + ')';
		var nodeData = colToCircle[colKey];  // get the data from our map!
		if (nodeData) {
			// Show the tooltip only when there is nodeData found by the mouse
	    d3.select('.tooltipMain')
	      .style('opacity', 0.8)
				.style('left', mouseX + 5 + 'px')
	      .style('top', mouseY + 5 + 'px')
				.html(capitalize(nodeData.disastertype) + " in " +nodeData.country +"<br>"+nodeData.year + (nodeData.deaths > 0 ? "<br>Deaths: " +nodeData.deaths : "" ) );
	  	} else {
	  	// Hide the tooltip when the mouse doesn't find nodeData
	    d3.select('.tooltipMain').style('opacity', 0);
  	}
	});

	// hide tooltip when mouse leaves main canvas
	d3.select(".mainCanvas").on("mouseout", function(d) {
		d3.select(".tooltipMain")
		 .style("opacity", 0);
	});



	//----------------------------------------------------------------------------
	// STEPS / TRANSITIONS
	//----------------------------------------------------------------------------

	// actions to take on each step of our scroll-driven story
	var steps = [
		function step0() {  // pane ONE
			if (setupComplete) {
				let stepInc = lockInc += 1;
				textIntroNums.transition() // pane ONE
					.duration(speedFactor*800)
					.attr("opacity",0.92)
				barsByTypeG.transition() // pane TWO
					.duration(speedFactor*700)
					.attr('opacity',0)
				transitionPane1()
				animateCircles(stepInc)
			}
		}, // step0()

		function step1() {  // pane TWO - placeholder
			let stepInc = lockInc += 1;
			textIntroNums.transition() // pane ONE
				.duration(speedFactor*500)
				.attr("opacity",0)
			barsByTypeG.transition() // pane TWO
				.duration(speedFactor*1100)
				.attr('opacity',0.8)
			mapGroup.selectAll("path").transition() // pane THREE
				.duration(speedFactor*800)
				.attr('opacity',0)
			stackedAreaG.transition() // pane THREE
				.duration(speedFactor*800)
				.attr('opacity',0)
			transitionPane2()
			animateCircles(stepInc)
		}, // step1()

		function step2() {  // pane THREE
			let stepInc = lockInc += 1;
			barsByTypeG.transition() // pane TWO
				.duration(speedFactor*700)
				.attr('opacity',0)
			mapGroup.selectAll("path").transition() // pane THREE
				.duration(speedFactor*800)
				.attr('opacity',0.8)
			stackedAreaG.transition() // pane THREE
				.duration(speedFactor*800)
				.attr('opacity',0.7)
			transitionPane3()
			animateCircles(stepInc)


		}, // step2()

		function step3() {  // pane THREE B - placeholder
			let stepInc = lockInc += 1;
			mapGroup.selectAll("path").transition() // pane THREE
				.duration(speedFactor*800)
				.attr('opacity',0)
			stackedAreaG.transition() // pane THREE
				.duration(speedFactor*800)
				.attr('opacity',0.7)
			deathsByTypeG.transition() // pane FOUR
				.duration(speedFactor*700)
				.attr('opacity',0)
			transitionPane3B()
			animateCircles(stepInc)
		}, // step3()

		function step4() {  // pane FOUR - placeholder
			let stepInc = lockInc += 1;
			mapGroup.selectAll("path").transition() // pane THREE
				.duration(speedFactor*800)
				.attr('opacity',0)
			stackedAreaG.transition() // pane THREE
				.duration(speedFactor*800)
				.attr('opacity',0)
			deathsByTypeG.transition() // pane FOUR
				.duration(speedFactor*1100)
				.attr('opacity',0.8)
			transitionPane4()
			animateCircles(stepInc)
		}, // step4()

		function step5() {  // pane FIVE - placeholder
			let stepInc = lockInc += 1;
			deathsByTypeG.transition() // pane FOUR
				.duration(speedFactor*700)
				.attr('opacity',0)
			logBarsG.transition() // pane SIX
				.duration(speedFactor*700)
				.attr('opacity',0)
			transitionPane5()
			animateCircles(stepInc)
		}, // step5()

		function step6() {  // pane SIX
			let stepInc = lockInc += 1;
			logBarsG.transition() // pane SIX
				.duration(speedFactor*1100)
				.attr('opacity',1)
			lollipopLines.selectAll("line") // pane SEVEN
				.transition()
				.duration(speedFactor*800)
				.attr("x1", d => (1.0/scaleFactor)*(scaleXyear(d.year)-31+62*d.jitter))
				.attr("y1", d => dispHeight*1.2)
				.attr("x2", d => (1.0/scaleFactor)*(scaleXyear(d.year)-31+62*d.jitter))
				.attr("y2", d => dispHeight*1.2)
			transitionPane6()
			animateCircles(stepInc)
		}, // step6()

		function step7() {  // pane SEVEN
			let stepInc = lockInc += 1;
			logBarsG.transition() // pane SIX
				.duration(speedFactor*700)
				.attr('opacity',0)
			lollipopLines.selectAll("line") // pane SEVEN
				.transition()
				.duration(speedFactor*800)
				.attr("x1", d => (1.0/scaleFactor)*(scaleXyear(d.year)-31+62*d.jitter) )
				.attr("y1", d => (1.0/scaleFactor)*(scaleYdeaths(d.deaths)+24) ) // this is the top of the line
				.attr("x2", d => (1.0/scaleFactor)*(scaleXyear(d.year)-31+62*d.jitter) )
				.attr("y2", d => (1.0/scaleFactor)*paneDim(7).bottom ) // this is the bottom of the line
			mapGroup.selectAll("path").transition() // pane EIGHT
				.duration(speedFactor*800)
				.attr('opacity',0)
			transitionPane7()
			animateCircles(stepInc)
		}, // step7()

		function step8() {  // pane EIGHT
			let stepInc = lockInc += 1;
			lollipopLines.selectAll("line") // pane SEVEN
				.transition()
				.duration(speedFactor*800)
				.attr("x1", d => (1.0/scaleFactor)*(scaleXyear(d.year)-31+62*d.jitter))
				.attr("y1", d => dispHeight*1.2)
				.attr("x2", d => (1.0/scaleFactor)*(scaleXyear(d.year)-31+62*d.jitter))
				.attr("y2", d => dispHeight*1.2)
			mapGroup.selectAll("path").transition() // pane EIGHT
				.duration(speedFactor*800)
				.attr('opacity',0.8)
			transitionPane8()
			animateCircles(stepInc)
		}, // step8()

		function step9() {  // pane NINE A
			let stepInc = lockInc += 1;
			mapGroup.selectAll("path").transition() // pane EIGHT
				.duration(speedFactor*800)
				.attr('opacity',0)
			transitionPane9A()
			animateCircles(stepInc)
		}, // step9()

		function step10() {  // pane NINE B - placeholder
			let stepInc = lockInc += 1;
			transitionPane9B()
			animateCircles(stepInc)
		}, // step10()

		function step11() {  // pane TEN
			let stepInc = lockInc += 1;
			transitionPane10()
			animateCircles(stepInc)
		}, // step11()


	] // steps



	//----------------------------------------------------------------------------
	// UPDATE / SETUP FUNCTIONS
	//----------------------------------------------------------------------------

	// update our chart
	function update(step) {
		steps[step].call()
	}

	// initiate the scales and all elements in the svg (background map, bar charts, etc)
	function setupCharts() {

		// the sole color scale for disaster circles - based on disaster type
		typeColor = d3.scaleOrdinal()
			.domain(["drought","earthquake","flood","storm","extreme temperature","landslide","volcanic activity"])
			.range(["#A96830","#693410","#176F90","#394C97","#BE7C11","#2B6A2F","#B13D06"]);


		// CANVAS setup

		// pane 6
		scaleXdeadliest = d3.scaleBand()  // band scale for X-axis of deadliest event types (log scale)
			.domain(["volcanic activity","storm","landslide","flood","extreme temperature","earthquake","drought"])
			.range([paneDim(6).left, paneDim(6).right])
			.paddingInner(0.3)
		scaleYdeadliest = d3.scaleSymlog() // log scale for Y-axis of deadliest event types
			.domain([0,450000])
			.range([paneDim(6).bottom, paneDim(6).top])

		// pane 7
		scaleXyear = d3.scaleLinear()
			.domain([1960,2018])
			.range([paneDim(7).left, paneDim(7).right])
		scaleYdeaths = d3.scaleLinear()
			.domain([0,450000])
			.range([paneDim(7).bottom, paneDim(7).top])


		// SVG setup

		// create color legend for disaster types
		svgForeground.append("g")
		  .attr("class", "legendOrdinal")
		  .attr("transform", "translate(20,20)");

		var legendOrdinal = d3.legendColor()
		  .shape("circle")
		  .shapePadding(10)
			.shapeRadius(8)
		  .scale(typeColor);

		//d3.select(".legendOrdinal")
		//  .call(legendOrdinal);


		// pane 1 - create display text
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

		// pane 2 - event counts by type
		scaleXeventCount = d3.scaleLinear()
			.domain([0, d3.max(eventsByType,d=>d[1])])
			.range([ paneDim(2,1).left, paneDim(2,1).right - 60 ]); // 60 makes space for the label
		scaleYtypes = d3.scaleBand()
			.domain(["volcanic activity","extreme temperature","drought","landslide","earthquake","storm","flood"])
			.range([ paneDim(2,1).bottom , paneDim(2,1).top ])
			.paddingInner(0.35);

		// pane 3 - world map animated
		scaleXyearSvg = d3.scaleLinear()
  		.domain([1960,2018])
  		.range([paneDim(3,1).left, paneDim(3,1).right]);
		scaleYeventCountSvg = d3.scaleLinear()
			.domain([0, d3.max(eventsByYearCounts,d=>d[1])])
			.range([paneDim(3,1).bottom, 3*paneDim(3,1).bottom/4])

		// unlike the positional scales, this one is a time scale for helping to build the transitions
		scaleYearPercent = d3.scaleLinear()
			.domain([1960,2019])
			.range([0,1])

		// pane 4
		scaleXtypes = d3.scaleBand()
			.domain(["earthquake","storm","drought","flood","extreme temperature","landslide","volcanic activity"])
			.range([ paneDim(4,1).left , paneDim(4,1).right ])
			.paddingInner(0.35);
		scaleYdeathCount = d3.scaleLinear() // total death counts by type
			.domain([0, d3.max(eventTypesByDeathTolls,d=>d[1])])
			.range([ paneDim(4,1).bottom, paneDim(4,1).top + 30 ]); // 30 makes space for the label

		// panes 3 and 8 - world map
		function createMap() {
			mapGroup = svgBackground.append('g')
				.attr('width', dispWidth)
				.attr('height', dispHeight);
			projection = d3.geoNaturalEarth1()
				.scale(dispWidth / 1.4 / Math.PI)
				.translate([-20+ dispWidth / 2, dispHeight / 2]);
			geoPath = d3.geoPath(projection);
			// draw the map and set the opacity to 0
			d3.json("world.geojson").then( function(worldData){
				mapGroup.selectAll('path')
					.data(worldData.features)
					.join('path')
					.attr('fill', '#EAE0DB')
					.attr('opacity', 0)
					.attr('d', geoPath);
			});
		}
		createMap()

		// pane 2 - create a bar chart of disaster counts by type
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
				.attr("width", paneDim(2,1).right-paneDim(2,1).left )
				.attr("height", scaleYtypes.bandwidth() )
				.attr("fill","#EFE8E4")
				.attr("opacity", 0.9);
			barsByTypeG.selectAll("rect.typeCounts") // event count bars
				.data(eventsByType)
				.join("rect")
				.attr("class","typeCounts")
				.attr("x", d => scaleXeventCount(0) )
				.attr("y", d => scaleYtypes(d[0]) )
				.attr("width", d => scaleXeventCount(d[1]) - paneDim(2,1).left )
				.attr("height", scaleYtypes.bandwidth() )
				.attr("fill", d => typeColor(d[0]) )
				.attr("opacity", 0.7);
			eventsByTypeLabels = barsByTypeG.append("g")
			eventsByTypeLabels.selectAll("text") // disaster type names
				.data(eventsByType)
				.join("text")
				.text(d => d[0])
				.attr("x", paneDim(2,1).left)
				.attr("y", d => scaleYtypes(d[0])+scaleYtypes.bandwidth()+17 );
			eventsByTypeLabels.selectAll("text.count") // eventCounts
				.data(eventsByType)
				.join("text")
				.attr("class","count")
				.text(d => d[1])
				.attr("x", d => scaleXeventCount(d[1])+5 )
				.attr("y", d => scaleYtypes(d[0])+scaleYtypes.bandwidth()/2+5 );
		}
		createBars2()

		// pane 3 - stacked area chart of events by year (colored by type)
		function createStackedArea3() {
			stackedAreaG = svgForeground.append('g')
				.attr("class", "stackedArea")
				.attr("opacity", 0)
			stackedAreaG.selectAll("path")
				.data(eventsStackedByType)
				.join("path")
					.style("fill", function(d) { type = typeGroups[d.key] ;  return typeColor(type); })
					.style("stroke", "none")
					.attr("d", d3.area()
						.curve(d3.curveNatural)
						.x((d,i) => scaleXyearSvg(d.data.key) )
						.y0( function(d) {
							return scaleYeventCountSvg(d[0])
						}   )
						.y1( d => scaleYeventCountSvg(d[1]) )
				)
		}
		createStackedArea3()

		// pane 4 - create a bar chart of total death counts by type
		function createBars4() {
			deathsByTypeG = svgBackground.append("g")
				.attr("class", "deathsByType") // this is purely to make the group easy to see in 'inspect'
				.attr("opacity",0)
			deathsByTypeG.selectAll("rect.typeBg") // background bars
				.data(eventTypesByDeathTolls)
				.join("rect")
				.attr("class","typeBg")
				.attr("x", d => scaleXtypes(d[0]) )
				.attr("y", d => paneDim(4,1).top )
				.attr("width", scaleXtypes.bandwidth() )
				.attr("height", paneDim(4,1).bottom-paneDim(4,1).top )
				.attr("fill","#EFE8E4")
				.attr("opacity", 0.9);
			deathsByTypeG.selectAll("rect.typeCounts") // death toll bars
				.data(eventTypesByDeathTolls)
				.join("rect")
				.attr("class","typeCounts")
				.attr("x", d => scaleXtypes(d[0]) )
				.attr("y", d => scaleYdeathCount(d[1]) )
				.attr("width", d => scaleXtypes.bandwidth() )
				.attr("height", d => paneDim(4,1).bottom - scaleYdeathCount(d[1]) )
				.attr("fill", d => typeColor(d[0]) )
				.attr("opacity", 0.8);
				//.attr("opacity", 0.7);  // for the sized-by-death-toll version
			deathsByTypeLabels = deathsByTypeG.append("g")
			deathsByTypeLabels.selectAll("text") // disaster type names
				.data(eventTypesByDeathTolls)
				.join("text")
				.text(d => d[0])
				.attr("x", d => scaleXtypes(d[0]) + scaleXtypes.bandwidth()/2 )
				.attr("text-anchor", "middle")
				.attr("y", paneDim(4,1).bottom + 28)
			deathsByTypeLabels.selectAll("text.count") // eventCounts
				.data(eventTypesByDeathTolls)
				.join("text")
				.attr("class","count")
				.text(d => d[1])
				.attr("x", d => scaleXtypes(d[0])+scaleXtypes.bandwidth()/2 )
				.attr("text-anchor", "middle")
				.attr("y", d => scaleYdeathCount(d[1]) - 11 );
		}
		createBars4()

		// pane 6 - create lightly colored background bars for the log plots
		function createBars6() {
			logBarsG = svgBackground.append("g")
				.attr("class", "logBars") // this is purely to make the group easy to see in 'inspect'
				.attr("opacity",0)
			logBarsG.selectAll("rect")
				.data(eventsByType)
				.join("rect")
				.attr("x", d => scaleXdeadliest(d[0])/scaleFactor ) // since the scale was written for canvas, need scaleFactor here...
				.attr("y", d => paneDim(6,1).top )
				.attr("width", scaleXdeadliest.bandwidth()/scaleFactor )
				.attr("height", paneDim(6,1).bottom-paneDim(6,1).top )
				.attr("fill", d => typeColor(d[0]) )
				.attr("opacity", 0.1);
		}
		createBars6()

		// pane 7 - create lollipop lines
		function createLollipopLines() {
			lollipopLines = svgBackground.append("g")
				.attr("class", "lollipopLines") // this is purely to make the group easy to see in 'inspect'
				.attr("opacity",1)
			lollipopLines.selectAll("line")
				.data(lollipopEvents)
				.join("line")
				.attr("stroke", d => typeColor(d.disastertype))
				.attr("stroke-width", 1.5 )
				.attr("x1", d => (1.0/scaleFactor)*(scaleXyear(d.year)-31+62*d.jitter))
				.attr("y1", d => dispHeight*1.2)
				.attr("x2", d => (1.0/scaleFactor)*(scaleXyear(d.year)-31+62*d.jitter))
				.attr("y2", d => dispHeight*1.2)
				.attr("opacity", 0.7)
		}
		createLollipopLines()

		// create dicts to keep track of circle positions for the transitions
		function initiateCircleInfo() {
			for (let i = 0; i < eventsFlat.length; i++) {
				node = eventsFlat[i]
				circleStartInfo[i] = {
					'cx': scaleFactor*node.gridX,
					'cy': scaleFactor*node.gridY,
					'r': 16,
					'fill': typeColor(node.disastertype), // set fill once and then leave it alone
					'opacity': 0
				}
				circleEndInfo[i] = {
					'cx':scaleFactor*node.gridX,
					'cy': scaleFactor*node.gridY,
					'r': 16,
					'fill': typeColor(node.disastertype), // set fill once and then leave it alone
					'opacity': 0.3
				}
			}
		}
		initiateCircleInfo()

		setupComplete = true;
	}  // setupCharts

	function init() {
		let stepInc = lockInc += 1;
		setupCharts()
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



	//----------------------------------------------------------------------------
	// TRANSITION FUNCTIONS - define the new target locations for each event circle
	//----------------------------------------------------------------------------

	// update circleEndInfo with new target formatting for each eventCircle
	function transitionPane1() {  // "grid" of events with summary numbers
		for (let i = 0; i < eventsFlat.length; i++) {
			node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': scaleFactor*node.gridX,
				'cy': scaleFactor*node.gridY,
				'r': 16,
				'opacity': 0.4
		}}
	} // transitionPane1()

	function transitionPane2() {  // horizontal bar chart of event counts by type
		for (let i = 0; i < eventsFlat.length; i++) {
			node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': 7+scaleFactor*scaleXeventCount(node.jitter2*(node.typeCount-14)),
				'cy': scaleFactor*(scaleYtypes(node.disastertype)+scaleYtypes.bandwidth()*node.jitter),
				'r': 16,
				'opacity': 0.4
		}}
	} // transitionPane2()

	function transitionPane3() {  // world map animation of events by year
		for (let i = 0; i < eventsFlat.length; i++) {
			node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': scaleFactor*projection([node.longitude,node.latitude])[0],
				'cy': scaleFactor*projection([node.longitude,node.latitude])[1],
				'r': 7*Math.sqrt(node.geoIdCount),
				'opacity': 0.4
		}}
	} // transitionPane3()

	function transitionPane3B() {  // world map follow up - comparison of first and last 10 years
		for (let i = 0; i < eventsFlat.length; i++) {
			node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': scaleFactor*projection([node.longitude,node.latitude])[0],
				'cy': scaleFactor*projection([node.longitude,node.latitude])[1],
				'r': 7*Math.sqrt(node.geoIdCount),
				'opacity': 0.4
		}}
	} // transitionPane3B()

	function transitionPane4() {   // vertical bar chart for total death count by disaster type
		for (let i = 0; i < eventsFlat.length; i++) {
			node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': scaleFactor*(scaleXtypes(node.disastertype)+scaleXtypes.bandwidth()*node.jitter),
				'cy': 7+scaleFactor*scaleYdeathCount(node.jitter2*(node.typeDeathCount-14)),
				'r': 16,
				'opacity': 0.4
		}}
	} // transitionPane4()

	function transitionPane5() {   // slopegraphs - currently just a placeholder
		for (let i = 0; i < eventsFlat.length; i++) {
			node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': canvasWidth*node.jitter*node.jitter,
				'cy': canvasHeight*node.jitter2,
				'r': 2*node.geoIdCount,
				'opacity': 0.6
		}}
	} // transitionPane5()

	function transitionPane6() {   // deadliest individual events / log scale
		for (let i = 0; i < eventsFlat.length; i++) {
			node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': scaleXdeadliest(node.disastertype) + scaleXdeadliest.bandwidth()*node.jitter,
				'cy': scaleYdeadliest(node.deaths),
				'r': 13,
				'opacity': 0.5
		}}
	} // transitionPane6()

	function transitionPane7() {   // deaths by year lollipop chart
		for (let i = 0; i < eventsFlat.length; i++) {
			node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': scaleXyear(node.year)-31+62*node.jitter,
				'cy': scaleYdeaths(node.deaths),
				'r': 24,
				'opacity': 0.6
		}}
	} // transitionPane7()

	function transitionPane8() {   // map of top 15 deadliest events / teardrop
		for (let i = 0; i < eventsFlat.length; i++) {
			node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': scaleFactor*projection([node.longitude,node.latitude])[0],
				'cy': (node.deaths < 37000)? canvasHeight*2 : scaleFactor*projection([node.longitude,node.latitude])[1],
				'r': 13*Math.sqrt(node.geoIdCount),
				'opacity': 0.6
		}}
	} // transitionPane8()

	function transitionPane9A() {   // deaths top 15 by GDP
		for (let i = 0; i < eventsFlat.length; i++) {
			node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': scaleFactor*projection([node.longitude,node.latitude])[0],
				'cy': (node.deaths < 37000)? canvasHeight*2 : canvasHeight/2,
				'r': 13*Math.sqrt(node.geoIdCount),
				'opacity': 0.6
		}}
	} // transitionPane9A()

	function transitionPane9B() {   // deaths by GDP
		for (let i = 0; i < eventsFlat.length; i++) {
			node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': scaleFactor*projection([node.longitude,node.latitude])[0],
				'cy': canvasHeight/2,
				'r': 13*Math.sqrt(node.geoIdCount),
				'opacity': 0.4
		}}
	} // transitionPane9B()

	function transitionPane10() {   // final words
		for (let i = 0; i < eventsFlat.length; i++) {
			node = eventsFlat[i];
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

	// an interpolator takes a PERCENTAGE and returns a VALUE for a given ATTRIBUTE
	//  so I need to create a function that does the same thing for OPACITY
	//  each event will show up suddenly with its year, then slowly fade into the background

	// given a year, a jitter value, and a pct => returns an OPACITY
	function eventOpacity(year, jitter, pct) {
		startPct = scaleYearPercent(year+jitter) // returns a value between 0 and 1
		if (pct < startPct) {return 0}
		else if (pct < (startPct + 0.02)) {
			return 1-(pct-startPct)/0.02
		} else {return 0}
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
			var pct = Math.min(ease(timeElapsed / setDuration), 1.0);

			for (let i = 0; i < eventsFlat.length; i++) {
				circleStartInfo[i].cx = Math.floor(interpolators[i][0](pct));
				circleStartInfo[i].cy = Math.floor(interpolators[i][1](pct));
				circleStartInfo[i].r = Math.floor(interpolators[i][2](pct));
				circleStartInfo[i].opacity = interpolators[i][3](pct);
			}

			if (timeElapsed >= setDuration) {
				interpolators = null;
			}
		}
	} // interpCircMove()

	// for each event, read the corresponding circleStartInfo entry and draw it on the canvas
	// this function clears and redraws one frame onto the canvas
	function drawCircles(chosenCtx, hidden = false) {
		chosenCtx.clearRect(0,0,canvasWidth,canvasHeight);

		for (let i = 0; i < eventsFlat.length; i++) {
			node = eventsFlat[i];
			// set the fillstyle depending on whether we're using the mainCtx or the hiddenCtx
			//   mainCtx gets the colors based on disaster type, hiddenCtx gets unique colors for each circle
			if (hidden) {
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
	function animateCircles(currentInc) {
		moveCircles()
		let dt = 0;
		let t = d3.timer(function(elapsed) {
			stats.begin();
			interpCircMove(elapsed - dt);
			dt = elapsed;
			drawCircles(mainCtx)
			stats.end();
			if (elapsed > setDuration || currentInc !== lockInc) t.stop();
		});
	} // animateCircles()



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
			geo_id: +d.geo_id,
			disastertype: d.disastertype.trim(),
			disasterno: d.disasterno,
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
				return {
					disasterno: d3.min(v, d => d.disasterno),
			    geoIdCount: v.length,
					country: d3.min(v, d => d.country),  // does this make sense?
					year: d3.min(v, d => +d.year),
					disastertype: d3.min(v, d => d.disastertype),
					latitude: d3.mean(v, d => +d.latitude),
					longitude: d3.mean(v, d => +d.longitude),
			    deaths: d3.min(v, d => d.deathsPerDisaster ),
					damages: d3.min(v, d => d.damagesPerDisaster ),
					disasterSubtype: d3.min(v, d => d.disasterSubtype),
					startDate: d3.min(v, d => d.startDate),
					totalAffected: d3.min(v, d => d.totalAffected),
					otherNotes: d3.min(v, d => d.otherNotes),
					jitter: Math.random(),
					jitter2: Math.random()
		  	};
			},
		  d => d.disasterno
		).values()).filter(d => d.disastertype != "mass movement (dry)"); // remove this disaster type

		// count total events of each type
		eventsByType = Array.from(
			d3.rollup(eventData, v => v.length, d => d.disastertype).entries()
		).sort((a,b) => d3.descending(+a[1], +b[1]) );
		eventsByTypeObject = Object.fromEntries(eventsByType); // create an object to use below

		// get total death toll by disaster type
		eventTypesByDeathTolls = Array.from(
			d3.rollup(eventData, v => d3.sum(v, d => d.deaths), d => d.disastertype).entries()
		);
		eventTypesDeathTollsObject = Object.fromEntries(eventTypesByDeathTolls); // create an object to use below

		// create sets for the first ten years of events and for the last ten years
		firstTenYears = eventData.filter(d => d.year < 1970)
		lastTenYears = eventData.filter(d => d.year > 2008)

		// find the 15 deadliest events
		deadliestEvents = eventData.sort(function(a, b) {
			return d3.descending(+a.deaths, +b.deaths);
		}).slice(0, 15);

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
				return b.disasterno-a.disasterno;
			})
			eventsByYear.get(key).forEach(function(event, index, theArray) {
				theArray[index].vertNum = index;
			});
			eventsFlat = eventsFlat.concat(eventsByYear.get(key))
		}
		console.log(eventsFlat.length)


		// creating the 'stacked' data for the area chart was a major pain.
		//   there surely is a better/cleaner way to to this, but I don't want to look
		//   at this part of the code anymore.  :)
		// ultimately this section 'stacks' the eventsByYear data by TYPE
		//   each type will be represented on top of each other (by a unique color)

		// determines the sort/stack order of the area segments
		typeGroups = ["flood","storm","earthquake","landslide","extreme temperature","drought","volcanic activity"]

		// this is the first data step - it approximates the results of d3.nest, I think?
		eventsByYearNest = Array.from(eventsByYear, ([key,values]) => ({key, values}));

		// need a slightly different format as input for d3.stack including generating a 'count' value for EVERY disaster type
		newEventsByYearNest = [];
		for (let i = 0; i < eventsByYearNest.length; i++) {
			let valuePairs = d3.rollup(eventsByYearNest[i].values, v => v.length, d => d.disastertype) // map of the form {'flood'=>5, 'storm'=>6}
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
					theArray[index].gridX = xCoor;
					manipulatedIndex >= 10890 ? yCoor += 10 : yCoor = yCoor;  // "bump" the LAST event circle off the canvas
					theArray[index].gridY = yCoor;
				}
				manipulatedIndex += 1
			}
			// for each event, also log the total event count and death toll for that disaster type
			theArray[index].typeCount = eventsByTypeObject[event.disastertype]
			theArray[index].typeDeathCount = eventTypesDeathTollsObject[event.disastertype]
		});

		// INITIALIZE THE VISUALIZATION
		init()

	})   // end d3.csv.then


	return {
		update: update,
	}
} // window.createGraphic
