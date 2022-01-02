
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
	var duration = 2000;
	var timeElapsed = 0;
	var interpolators = null;

	const canvasWidth = 4000;
	const canvasHeight = 3200;

	// this should be the same size as defined in CSS
	const dispWidth = 1000;
	const dispHeight = 800;
	const scaleFactor = canvasWidth/dispWidth;

	const speedFactor = 1.5;

	let setupComplete = false;

	// provide a disaster type and return a corresponding color
	const typeColor = d3.scaleOrdinal()
		.domain(["drought","earthquake","flood","storm","extreme temperature","landslide","volcanic activity"])
		.range(["#A96830","#693410","#176F90","#394C97","#BE7C11","#2B6A2F","#B13D06"]);

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

	//Generates the next color in the sequence, going from 0,0,0 to 255,255,255.
	//From: https://bocoup.com/weblog/2d-picking-in-canvas
	var nextCol = 1;
	function genColor(){
			var ret = [];
			// via http://stackoverflow.com/a/15804183
			if (nextCol < 16777215) {
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


	// var dt = 0;
	// d3.timer(function(elapsed) {
	// 		stats.begin();
	// 		// interpolateZoom(elapsed - dt);
	// 		dt = elapsed;
	// 		stats.end();
	// 		drawEventElements()
	// });

	//----------------------------------------------------------------------------
	// INITIALIZE DRAWING SPACES
	//----------------------------------------------------------------------------

	// create an svg which we will use for our world map / background image
	var svgBackground = d3.select("#viz-container").append('svg');

	// create variables for referring to the 'canvas' element in HTML and to its CONTEXT
	//   the latter of which will be used for rendering our elements to the canvas
	// note that defining the width/height of the drawing space is distinct from
	//   setting the size in CSS
	var canvas = d3.select('#viz-container')
		.append('canvas')
		.attr('width', canvasWidth)
		.attr('height', canvasHeight) ;
	var ctx = canvas.node().getContext('2d');

	// create a 'custom' element that will be part of a 'virtual' DOM
	//   we will use this to bind our data without cluttering the actual DOM
	var detachedContainer = document.createElement("custom");
	var dataContainer = d3.select(detachedContainer);

	// create an svg which we will use for axes and/or other plotting needs
	var svgForeground = d3.select("#viz-container").append('svg');



	//----------------------------------------------------------------------------
	// STEPS / TRANSITIONS
	//----------------------------------------------------------------------------

	// actions to take on each step of our scroll-driven story
	var steps = [
		function step0() {  // pane ONE
			if (setupComplete) {
				let stepInc = lockInc += 1;
				barsByTypeG.transition()
					.duration(speedFactor*700)
					.attr('opacity',0)
				textIntroNums.transition()
					.duration(speedFactor*800)
					.attr("opacity",0.92)
				transitionPane1()
				moveCircles()
				let dt = 0;
				let t = d3.timer(function(elapsed) {
					stats.begin();
					interpCircMove(elapsed - dt);
					dt = elapsed;
					drawCircles()
					stats.end();
					if (elapsed > duration || stepInc !== lockInc) t.stop();
				});
			}
		}, // step0()

		function step1() {  // pane TWO - placeholder
			let stepInc = lockInc += 1;
			mapGroup.selectAll("path").transition()
				.duration(speedFactor*800)
				.attr('opacity',0)
			barsByTypeG.transition()
				.duration(speedFactor*1100)
				.attr('opacity',0.8)
			textIntroNums.transition()
				.duration(speedFactor*500)
				.attr("opacity",0)
			transitionPane2()
			moveCircles()
			let dt = 0;
			let t = d3.timer(function(elapsed) {
				stats.begin();
				interpCircMove(elapsed - dt);
				dt = elapsed;
				drawCircles()
				stats.end();
				if (elapsed > duration || stepInc !== lockInc) t.stop();
			});
		}, // step1()

		function step2() {  // pane THREE
			let stepInc = lockInc += 1;
			mapGroup.selectAll("path").transition()
				.duration(speedFactor*800)
				.attr('opacity',0.8)
			barsByTypeG.transition()
				.duration(speedFactor*700)
				.attr('opacity',0)

			transitionPane3()
			moveCircles()
			let dt = 0;
			let t = d3.timer(function(elapsed) {
				stats.begin();
				interpCircMove(elapsed - dt);
				dt = elapsed;
				drawCircles()
				stats.end();
				if (elapsed > duration || stepInc !== lockInc) t.stop();
			});
		}, // step2()

		function step3() {  // pane THREE B - placeholder
			let stepInc = lockInc += 1;
			mapGroup.selectAll("path").transition()
				.duration(speedFactor*800)
				.attr('opacity',0)
			deathsByTypeG.transition()
				.duration(speedFactor*700)
				.attr('opacity',0)

			transitionPane3B()
			moveCircles()
			let dt = 0;
			let t = d3.timer(function(elapsed) {
				stats.begin();
				interpCircMove(elapsed - dt);
				dt = elapsed;
				drawCircles()
				stats.end();
				if (elapsed > duration || stepInc !== lockInc) t.stop();
			});
		}, // step3()

		function step4() {  // pane FOUR - placeholder
			let stepInc = lockInc += 1;
			mapGroup.selectAll("path").transition()
				.duration(speedFactor*800)
				.attr('opacity',0)
			deathsByTypeG.transition()
				.duration(speedFactor*1100)
				.attr('opacity',0.8)

			transitionPane4()
			moveCircles()
			let dt = 0;
			let t = d3.timer(function(elapsed) {
				stats.begin();
				interpCircMove(elapsed - dt);
				dt = elapsed;
				drawCircles()
				stats.end();
				if (elapsed > duration || stepInc !== lockInc) t.stop();
			});
		}, // step4()

		function step5() {  // pane FIVE - placeholder
			mapGroup.selectAll("path").transition()
				.duration(speedFactor*800)
				.attr('opacity',0)
			deathsByTypeG.transition()
				.duration(speedFactor*700)
				.attr('opacity',0)
			logBarsG.transition()
				.duration(speedFactor*700)
				.attr('opacity',0)
			databind5(eventsFlat);
			var t = d3.timer(function(elapsed) {
				drawEventElements();
				if (elapsed > speedFactor*850) t.stop();
			}); // Timer running the draw function repeatedly for 850 ms.
		}, // step5()

		function step6() {  // pane SIX
			mapGroup.selectAll("path").transition()
				.duration(speedFactor*800)
				.attr('opacity',0)
			logBarsG.transition()
				.duration(speedFactor*1100)
				.attr('opacity',1)
			lollipopLines.selectAll("line")
				.transition()
				.duration(speedFactor*800)
				.attr("x1", d => (1.0/scaleFactor)*(scaleXyear(d.year)-31+62*d.jitter))
				.attr("y1", d => dispHeight*1.2)
				.attr("x2", d => (1.0/scaleFactor)*(scaleXyear(d.year)-31+62*d.jitter))
				.attr("y2", d => dispHeight*1.2)
			databind6(eventsFlat);
			var t = d3.timer(function(elapsed) {
				drawEventElements();
				if (elapsed > speedFactor*850) t.stop();
			}); // Timer running the draw function repeatedly for 850 ms.
		}, // step6()

		function step7() {  // pane SEVEN
			mapGroup.selectAll("path").transition()
				.duration(speedFactor*800)
				.attr('opacity',0)
			logBarsG.transition()
				.duration(speedFactor*700)
				.attr('opacity',0)
			lollipopLines.selectAll("line")
				.transition()
				.duration(speedFactor*800)
				.attr("x1", d => (1.0/scaleFactor)*(scaleXyear(d.year)-31+62*d.jitter) )
				.attr("y1", d => (1.0/scaleFactor)*(scaleYdeaths(d.deaths)+24) ) // this is the top of the line
				.attr("x2", d => (1.0/scaleFactor)*(scaleXyear(d.year)-31+62*d.jitter) )
				.attr("y2", d => (1.0/scaleFactor)*paneDim(7).bottom ) // this is the bottom of the line
			databind7(eventsFlat);
			var t = d3.timer(function(elapsed) {
				drawEventElements();
				if (elapsed > speedFactor*850) t.stop();
			}); // Timer running the draw function repeatedly for 850 ms.
		}, // step7()

		function step8() {  // pane EIGHT
			mapGroup.selectAll("path").transition()
				.duration(speedFactor*800)
				.attr('opacity',0.8)
			lollipopLines.selectAll("line")
				.transition()
				.duration(speedFactor*800)
				.attr("x1", d => (1.0/scaleFactor)*(scaleXyear(d.year)-31+62*d.jitter))
				.attr("y1", d => dispHeight*1.2)
				.attr("x2", d => (1.0/scaleFactor)*(scaleXyear(d.year)-31+62*d.jitter))
				.attr("y2", d => dispHeight*1.2)
			databind8(eventsFlat);
			var t = d3.timer(function(elapsed) {
				drawEventElements();
				if (elapsed > speedFactor*850) t.stop();
			}); // Timer running the draw function repeatedly for 850 ms.
		}, // step8()

		function step9() {  // pane NINE
			mapGroup.selectAll("path").transition()
				.duration(speedFactor*800)
				.attr('opacity',0)
			databind9A(eventsFlat);
			var t = d3.timer(function(elapsed) {
				drawEventElements();
				if (elapsed > speedFactor*850) t.stop();
			}); // Timer running the draw function repeatedly for 850 ms.
		}, // step9()

		function step10() {  // pane NINE B - placeholder
			mapGroup.selectAll("path").transition()
				.duration(speedFactor*800)
				.attr('opacity',0)
			databind9B(eventsFlat);
			var t = d3.timer(function(elapsed) {
				drawEventElements();
				if (elapsed > speedFactor*1100) t.stop();
			}); // Timer running the draw function repeatedly for 850 ms.
		}, // step10()

		function step11() {  // pane TEN
			mapGroup.selectAll("path").transition()
				.duration(speedFactor*800)
				.attr('opacity',0)
			databind10(eventsFlat);
			var t = d3.timer(function(elapsed) {
				drawEventElements();
				if (elapsed > speedFactor*850) t.stop();
			}); // Timer running the draw function repeatedly for 850 ms.
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

		// pane 1
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


		// pane 2
		scaleXeventCount = d3.scaleLinear() // event counts by type
			.domain([0, d3.max(eventsByType,d=>d[1])])
			.range([ paneDim(2,1).left, paneDim(2,1).right - 60 ]); // 60 makes space for the label
		scaleYtypes = d3.scaleBand()
			.domain(["volcanic activity","extreme temperature","drought","landslide","earthquake","storm","flood"])
			.range([ paneDim(2,1).bottom , paneDim(2,1).top ])
			.paddingInner(0.35);

		// pane 4
		scaleXtypes = d3.scaleBand()
			.domain(["earthquake","storm","drought","flood","extreme temperature","landslide","volcanic activity"])
			.range([ paneDim(4,1).left , paneDim(4,1).right ])
			.paddingInner(0.35);
		scaleYdeathCount = d3.scaleLinear() // total death counts by type
			.domain([0, d3.max(eventTypesByDeathTolls,d=>d[1])])
			.range([ paneDim(4,1).bottom, paneDim(4,1).top + 30 ]); // 30 makes space for the label

		// panes 3 and 8 - world map
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

		// pane 2
		// create a bar chart of disaster counts by type
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


		// pane 4
		// create a bar chart of total death counts by type
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

		// pane 6
		// create lightly colored background bars for the log plots
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

		// pane 7
		// create lollipop lines
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

		for (let i = 0; i < eventsFlat.length; i++) {
			node = eventsFlat[i]
			circleStartInfo[i] = {
				'cx': scaleFactor*node.gridX,
				'cy': scaleFactor*node.gridY,
				'r': 16,
				'fill': typeColor(node.disastertype),
				'opacity': 0
			}
			circleEndInfo[i] = {
				'cx':scaleFactor*node.gridX,
				'cy': scaleFactor*node.gridY,
				'r': 16,
				'fill': typeColor(node.disastertype),
				'opacity': 0.3
			}
		}

		setupComplete = true;
	}  // setupCharts

	function init() {
		setupCharts()
		databind1A(eventsFlat)  // create event circles, make invisible
		databind1B(eventsFlat) // transition event circles into view
		drawEventElements()
		update(0)
	} // init()



	//----------------------------------------------------------------------------
	//  DATA BINDING AND DRAWING FUNCTIONS
	//----------------------------------------------------------------------------

	// on each waypoint trigger, create new interpolator functions to be used for drawing circles
	function moveCircles() {
		interpolators = {}
		for (let i = 0; i < eventsFlat.length; i++) {
			interpolators[i] = [
				d3.interpolate(circleStartInfo[i].cx, circleEndInfo[i].cx),
				d3.interpolate(circleStartInfo[i].cy, circleEndInfo[i].cy),
				d3.interpolate(circleStartInfo[i].r, circleEndInfo[i].r),
				d3.interpolate(circleStartInfo[i].fill, circleEndInfo[i].fill),
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
			var pct = Math.min(ease(timeElapsed / duration), 1.0);

			for (let i = 0; i < eventsFlat.length; i++) {
				circleStartInfo[i].cx = interpolators[i][0](pct);
				circleStartInfo[i].cy = interpolators[i][1](pct);
				circleStartInfo[i].r = interpolators[i][2](pct);
				circleStartInfo[i].fill = interpolators[i][3](pct);
				circleStartInfo[i].opacity = interpolators[i][4](pct);
			}

			if (timeElapsed >= duration) {
				interpolators = null;
			}
		}
	}

	// for each event, read the corresponding circleStartInfo entry and draw it on the canvas
	// this function clears and redraws one frame onto the canvas
	function drawCircles() {
		ctx.clearRect(0,0,canvasWidth,canvasHeight);

		for (let i = 0; i < eventsFlat.length; i++) {
			ctx.fillStyle = circleStartInfo[i].fill  // retrieve the colour from the individual in-memory node and set fillStyle for the canvas paint
			ctx.globalAlpha = circleStartInfo[i].opacity
			ctx.beginPath();
			ctx.arc(circleStartInfo[i].cx, circleStartInfo[i].cy, circleStartInfo[i].r, 0, 2*Math.PI, true);
			ctx.fill()
			ctx.closePath()
		}
	}

	// update circleEndInfo with new target formatting for each eventCircle
	function transitionPane1() {
		for (let i = 0; i < eventsFlat.length; i++) {
			node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': scaleFactor*node.gridX,
				'cy': scaleFactor*node.gridY,
				'r': 16,
				'fill': typeColor(node.disastertype),
				'opacity': 0.4
		}}
	} // transitionPane1()

	function transitionPane2() {
		for (let i = 0; i < eventsFlat.length; i++) {
			node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': 7+scaleFactor*scaleXeventCount(node.jitter2*(node.typeCount-14)),
				'cy': scaleFactor*(scaleYtypes(node.disastertype)+scaleYtypes.bandwidth()*node.jitter),
				'r': 16,
				'fill': typeColor(node.disastertype),
				'opacity': 0.4
		}}
	} // transitionPane2()

	function transitionPane3() {
		for (let i = 0; i < eventsFlat.length; i++) {
			node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': scaleFactor*projection([node.longitude,node.latitude])[0],
				'cy': scaleFactor*projection([node.longitude,node.latitude])[1],
				'r': 7*Math.sqrt(node.geoIdCount),
				'fill': typeColor(node.disastertype),
				'opacity': 0.4
		}}
	} // transitionPane3()

	function transitionPane3B() {
		for (let i = 0; i < eventsFlat.length; i++) {
			node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': scaleFactor*projection([node.longitude,node.latitude])[0],
				'cy': scaleFactor*projection([node.longitude,node.latitude])[1],
				'r': 7*Math.sqrt(node.geoIdCount),
				'fill': typeColor(node.disastertype),
				'opacity': 0.4
		}}
	} // transitionPane3B()

	function transitionPane4() {
		for (let i = 0; i < eventsFlat.length; i++) {
			node = eventsFlat[i];
			circleEndInfo[i] = {
				'cx': scaleFactor*(scaleXtypes(node.disastertype)+scaleXtypes.bandwidth()*node.jitter),
				'cy': 7+scaleFactor*scaleYdeathCount(node.jitter2*(node.typeDeathCount-14)),
				'r': 16,
				'fill': typeColor(node.disastertype),
				'opacity': 0.4
		}}
	} // transitionPane4()



	// these functions bind the data to the "virtual" DOM elements and define the
	//   attributes and transitions that will be used to generate each step in the
	//   visualization.

	// the first step is split into two functions so that we can transition them in
	//   from opacity = 0 on page load, but then keep the transitions with higher opacity
	//   for subsequent (scroll-activated) transitions (e.g. if the user scrolls back up)
	function databind1A(dataToBind) {  // grid of all events - initialize and set opacity to 0
		var boundElements = dataContainer.selectAll("custom.eventCircle")
			.data(dataToBind)
			.join("custom")
				.attr("class", "eventCircle")
				.attr("cx", d => scaleFactor*d.gridX)
				.attr("cy", d => scaleFactor*d.gridY)
				.attr("r", 16 ) // must be at least 9 to show up as a circle?
				.attr("fillStyle", d => typeColor(d.disastertype) )
				.attr("opacity", 0)
	} // databind1A()

	function databind1B(dataToBind) {  // grid of all events - transition
		var boundElements = dataContainer.selectAll("custom.eventCircle")
			.data(dataToBind)
			.join("custom")
				.attr("class", "eventCircle")
				.transition()
				.ease(d3.easeQuadInOut)
				.duration(speedFactor*800)
				.attr("cx", d => scaleFactor*d.gridX)
				.attr("cy", d => scaleFactor*d.gridY)
				.attr("r", 16 ) // must be at least 9 to show up as a circle?
				.attr("opacity", 0.4)
	} // databind1B()

	function databind5(dataToBind) {  // slopegraphs - currently just a placeholder
		var boundElements = dataContainer.selectAll("custom.eventCircle")
			.data(dataToBind)
			.join("custom")
				.attr("class", "eventCircle")
				.transition()
				.ease(d3.easeQuadInOut)
				.duration(speedFactor*800)
				.attr("cx", d => canvasWidth*d.jitter*d.jitter)
				.attr("cy", d => canvasHeight*d.jitter2)
				.attr("r", d => 2*d.geoIdCount )
				.attr("opacity", 0.6)
	} // databind5()

	function databind6(dataToBind) {  // deadliest individual events / log scale
		var boundElements = dataContainer.selectAll("custom.eventCircle")
			.data(dataToBind)
			.join("custom")
				.attr("class", "eventCircle")
				.transition()
				.ease(d3.easeQuadInOut)
				.duration(speedFactor*800)
				.attr("cy", d => scaleYdeadliest(d.deaths))
				.attr("cx", d => scaleXdeadliest(d.disastertype) + scaleXdeadliest.bandwidth()*d.jitter)
				.attr("r", 13 )
				.attr("opacity", 0.5)
	} // databind6()

	function databind7(dataToBind, deathMin=0) {  // deaths by year
		let i = 0;
		var boundElements = dataContainer.selectAll("custom.eventCircle")
			.data(dataToBind)
			.join("custom")
				.attr("class", "eventCircle")
				.transition()
				.ease(d3.easeQuadInOut)
				.duration(speedFactor*800)
				.attr("cx", d => scaleXyear(d.year)-31+62*d.jitter)
				.attr("cy", d => scaleYdeaths(d.deaths))
				.attr("r", 24 )
				.attr("opacity", function(d) {
					if (d.deaths < deathMin) {
						return 0
					} else { return 0.6 }
				})
	} // databind7()

	function databind8(dataToBind, deathMin=37000) {  // deaths by year top 15 - MAP
		var boundElements = dataContainer.selectAll("custom.eventCircle")
			.data(dataToBind)
			.join("custom")
				.attr("class", "eventCircle")
				.transition()
				.ease(d3.easeQuadInOut)
				.duration(speedFactor*800)
				.attr("cx", d => scaleFactor*projection([d.longitude,d.latitude])[0] )
				.attr("cy", function(d) {
					if (d.deaths < deathMin) {
						return canvasHeight*2 // for anything not in the top 15 events, fly off screen
					} else {
						return scaleFactor*projection([d.longitude,d.latitude])[1]
					}
				})
				.attr("r", d => 13*Math.sqrt(d.geoIdCount) )
				.attr("opacity", 0.6)
	} // databind8()

	function databind9A(dataToBind) {  // deaths top 15 by GDP
		var boundElements = dataContainer.selectAll("custom.eventCircle")
			.data(dataToBind)
			.join("custom")
				.attr("class", "eventCircle")
				.transition()
				.ease(d3.easeQuadInOut)
				.duration(speedFactor*800)
				.delay((d,i) => i*0.015+0.2*d.longitude )
				.attr("cx", d => scaleFactor*projection([d.longitude,d.latitude])[0] )
				.attr("cy", d => d.deaths < 37000 ? canvasHeight*4 : canvasHeight/2)
				.attr("r", d => 13*Math.sqrt(d.geoIdCount) )
				.attr("opacity", 0.6)
	} // databind9A()

	function databind9B(dataToBind) {  // deaths top 15 by GDP
		var boundElements = dataContainer.selectAll("custom.eventCircle")
			.data(dataToBind)
			.join("custom")
				.attr("class", "eventCircle")
				.transition()
				.ease(d3.easeQuadInOut)
				.duration(speedFactor*800)
				.delay( (d,i) => 80*d.jitter*d.jitter+0.05*i )
				.attr("cx", d => scaleFactor*projection([d.longitude,d.latitude])[0] )
				.attr("cy", d => canvasHeight/2)
				.attr("r", d => 13*Math.sqrt(d.geoIdCount) )
				.attr("opacity", 0.4)
	} // databind9B()

	function databind10(dataToBind) {  // FINAL VIZ: random display of all events, sized by location count
		var boundElements = dataContainer.selectAll("custom.eventCircle")
			.data(dataToBind)
			.join("custom")
				.attr("class", "eventCircle")
				.transition()
				.ease(d3.easeQuadInOut)
				.duration(speedFactor*800)
				.attr("cx", d => canvasWidth*d.jitter)
				.attr("cy", d => canvasHeight*d.jitter2)
				.attr("r", d => 7*d.geoIdCount ) // 8 and 0.4 looks pretty cool
				.attr("opacity", 0.33)
	} // databind10()

	function drawEventElements() {
		ctx.clearRect(0,0,canvasWidth,canvasHeight);
		dataContainer.selectAll("custom.eventCircle").each(function(d,i) {
			var node = d3.select(this);   // This is each individual element in the loop.
			ctx.fillStyle = node.attr('fillStyle')   // retrieve the colour from the individual in-memory node and set fillStyle for the canvas paint
			ctx.globalAlpha = node.attr("opacity")
			ctx.beginPath();
			ctx.arc(node.attr("cx"), node.attr("cy"), node.attr("r"),
									0,  2 * Math.PI, true);
			ctx.fill()
			ctx.closePath()
		})
	} // drawEventElements()



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
