
window.createGraphic = function(graphicSelector) {
	let data = [];
	let mapData = [];
	let eventData = [];
	let eventsByType = [];
	let eventTypesByDeathTolls = [];
	let deadliestEvents = [];
	let firstTenYears = [];
	let lastTenYears = [];
	let eventsByYear = [];
	let eventsByYearFlat = [];
	const canvasWidth = 4000;
	const canvasHeight = 3200;
	const margin = ({top: 120, right: 120, bottom: 120, left: 120})
	const vizDim = ({top: 0+margin.top, right: canvasWidth-margin.right, bottom: canvasHeight-margin.bottom, left: 0+margin.left})

	// this should be the same size as defined in CSS
	const dispWidth = 1000;
	const dispHeight = 800;

	const scaleFactor = canvasWidth/dispWidth;

	const speedFactor = 1.5;

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

	// define a sort order by disaster type, to be used in stacked circle chart
	const typeSortNum = d3.scaleOrdinal()
		.domain(["flood","storm","earthquake","landslide","drought","extreme temperature","volcanic activity"])
		.range([0,1,2,3,4,5,6]);

	const typeDeathSort = d3.scaleOrdinal()
		.domain(["flood","storm","earthquake","landslide","drought","extreme temperature","volcanic activity"])
		.range([3,5,1,4,0,2,6]);

	// provide a disaster type and return a corresponding color
	const typeColor = d3.scaleOrdinal()
		.domain(["drought","earthquake","flood","storm","extreme temperature","landslide","volcanic activity"])
		.range(["#A96830","#693410","#176F90","#394C97","#BE7C11","#2B6A2F","#B13D06"]);

	// create an svg path in a teardrop shape of specified size and orientation
	function teardrop(size=10, orientation=0) {
		switch (orientation) {
		  case 0:  // top right from origin    "M0,0 l0,-10 a10,10 0 1,1 10,10 l-10,0"
		    return `M0,0 l0,-${size} a${size},${size} 0 1,1 ${size},${size} l-${size},0`;
		  case 1:  // bottom right   				"M0,0 l0,10 a10,10 0 1,0 10,-10 l-10,0"
		    return `M0,0 l0,${size} a${size},${size} 0 1,0 ${size},-${size} l-${size},0`;
		  case 2:  // bottom left   "M0,0 l0,10 a10,10 0 1,1 -10,-10 l10,0"
				return `M0,0 l0,${size} a${size},${size} 0 1,1 -${size},-${size} l${size},0`;
		  case 3:  // top left    "M0,0 l0,-10 a10,10 0 1,0 -10,10 l10,0"
				return `M0,0 l0,-${size} a${size},${size} 0 1,0 -${size},${size} l${size},0`;
		}
	}

	// actions to take on each step of our scroll-driven story
	var steps = [
		function step0() {
			databind1B(eventsByYearFlat);   //  databind1B
			var t = d3.timer(function(elapsed) {
				drawEventElements();
				if (elapsed > speedFactor*850) t.stop();
			}); // Timer running the draw function repeatedly for 850 ms.
		}, // step0()

		function step1() {
			databind1B(eventsByYearFlat);
			var t = d3.timer(function(elapsed) {
				drawEventElements();
				if (elapsed > speedFactor*850) t.stop();
			}); // Timer running the draw function repeatedly for 850 ms.
		}, // step1()

		function step2() {
			databind22(eventsByYearFlat);
			var t = d3.timer(function(elapsed) {
				drawEventElements();
				if (elapsed > speedFactor*850) t.stop();
			}); // Timer running the draw function repeatedly for 850 ms.
		}, // step2()

		function step3() {
			mapGroup.selectAll("path").transition()
				.duration(speedFactor*800)
				.attr('opacity',0)
			databind23(eventsByYearFlat);
			var t = d3.timer(function(elapsed) {
				drawEventElements();
				if (elapsed > speedFactor*850) t.stop();
			}); // Timer running the draw function repeatedly for 850 ms.
		}, // step3()

		function step4() {
			mapGroup.selectAll("path").transition()
				.duration(speedFactor*800)
				.attr('opacity',0.8)
			databind24(eventsByYearFlat, 37000);
			var t = d3.timer(function(elapsed) {
				drawEventElements();
				if (elapsed > speedFactor*850) t.stop();
			}); // Timer running the draw function repeatedly for 850 ms.
		}, // step4()

		function step5() {
			mapGroup.selectAll("path").transition()
				.duration(speedFactor*800)
				.attr('opacity',0)
			databind26(eventsByYearFlat);
			var t = d3.timer(function(elapsed) {
				drawEventElements();
				if (elapsed > speedFactor*850) t.stop();
			}); // Timer running the draw function repeatedly for 850 ms.
		}, // step5()


	] // steps

	// update our chart
	function update(step) {
		steps[step].call()
	}

	// initiate the scales and background map
	function setupCharts() {

		scaleXyear = d3.scaleLinear()
			.domain([1960,2018])
			.range([vizDim.left, vizDim.right])

		scaleYvert = d3.scaleLinear() // linear scale for event count by year
			.domain([0,360])
			.range([vizDim.bottom, 0+0.3*vizDim.bottom])

		scaleXdeadliest = d3.scaleSymlog() // log scale for X-axis of deadliest event types
			.domain([0,450000])
			.range([vizDim.left, vizDim.right])

		scaleYdeadliest = d3.scaleBand()  // band scale for Y-axis of deadliest event types (log scale)
			.domain(["mass movement (dry)","volcanic activity","storm","landslide","flood","extreme temperature","earthquake","drought"])
			.range([vizDim.bottom, 0+0.3*vizDim.bottom])
			.paddingInner(0.1)
 			.paddingOuter(0.2)
 			.align(0.5) /// ??

		scaleYdeaths = d3.scaleLinear()
			.domain([0,450000])
			.range([vizDim.bottom, vizDim.top])

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

	}  // setupCharts


	//----------------------------------------------------------------------------
	//  DATA BINDING FUNCTIONS
	//----------------------------------------------------------------------------

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

	function databind22(dataToBind) {  // deadliest individual events / log scale
		var boundElements = dataContainer.selectAll("custom.eventCircle")
			.data(dataToBind)
			.join("custom")
				.attr("class", "eventCircle")
				.transition()
				.ease(d3.easeQuadInOut)
				.duration(speedFactor*800)
				.attr("cx", d => scaleXdeadliest(d.deaths))
				.attr("cy", function(d) {
					return scaleYdeadliest(d.disastertype) - 80 + 160*d.jitter
				})
				.attr("r", 13 )
				.attr("opacity", 0.5)
		var boundLines = dataContainer.selectAll("custom.line")
			.data(dataToBind)
			.join("custom")
				.attr("class","line")
				.transition()
				.ease(d3.easeQuadInOut)
				.duration(speedFactor*800)
				.attr("x1", d => scaleXyear(d.year)-31+62*d.jitter)
				.attr("y1", d => canvasHeight*1.2)
				.attr("x2", d => scaleXyear(d.year)-31+62*d.jitter)
				.attr("y2", d => canvasHeight*1.2)
				.attr("opacity", 0.7)
				.attr("stroke", d => typeColor(d.disastertype));
	} // databind22()

	function databind23(dataToBind, deathMin=0) {  // deaths by year
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
				//.attr("fillStyle", d => typeColor(d.disastertype) );
		var boundLines = dataContainer.selectAll("custom.line")
			.data(dataToBind)
			.join("custom")
				.attr("class","line")
				.transition()
				.duration(speedFactor*800)
				.attr("x1", d => scaleXyear(d.year)-31+62*d.jitter)
				.attr("y1", d => scaleYdeaths(d.deaths)+24)
				.attr("x2", d => scaleXyear(d.year)-31+62*d.jitter)
				.attr("y2", d => vizDim.bottom)
				.attr("opacity", 0.7)
				.attr("stroke", d => typeColor(d.disastertype));
	} // databind23()

	function databind24(dataToBind, deathMin=0) {  // deaths by year top 15 only
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
						return canvasHeight*4 // for anything not in the top 15 events, fly off screen
					} else {
						return scaleFactor*projection([d.longitude,d.latitude])[1]
					}
				})
				.attr("r", d => 13*Math.sqrt(d.geoIdCount) )
				.attr("opacity", 0.6)
		var boundLines = dataContainer.selectAll("custom.line")
			.data(dataToBind)
			.join("custom")
				.attr("class","line")
				.transition()
				.duration(speedFactor*800)
				.attr("x1", d => scaleXyear(d.year)-31+62*d.jitter)
				.attr("y1", d => canvasHeight*1.2)
				.attr("x2", d => scaleXyear(d.year)-31+62*d.jitter)
				.attr("y2", d => canvasHeight*1.2)
				.attr("opacity", 0)
				.attr("stroke", d => typeColor(d.disastertype));
	} // databind24()

	function databind26(dataToBind) {  // FINAL VIZ: random display of all events, sized by location count
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
	} // databind26()


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
		dataContainer.selectAll("custom.line").each(function(d,i) {
			var node = d3.select(this);   // This is each individual element in the loop.
			ctx.beginPath();       // Start a new path
			ctx.moveTo(node.attr('x1'), node.attr('y1'));    // Move the pen to (30, 50)
			ctx.lineTo(node.attr('x2'), node.attr('y2'));  // Draw a line to (150, 100)
			ctx.globalAlpha = node.attr("opacity")
			ctx.lineWidth = 5;
			ctx.strokeStyle = node.attr("stroke");
			ctx.stroke();          // Render the path
		})
	} // drawEventElements()

	function init() {
		setupCharts()
		databind1A(eventsByYearFlat)  // create event circles, make invisible       databind1A
		databind1B(eventsByYearFlat) // transition event circles into view 				databind1B
		drawEventElements()
		update(0)
	} // init()

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
		);

		console.log(eventsByType)

		// get total death toll by disaster type
		eventTypesByDeathTolls = Array.from(
			d3.rollup(eventData, v => d3.sum(v, d => d.deaths), d => d.disastertype).entries()
		);

		// create sets for the first ten years of events and for the last ten years
		firstTenYears = eventData.filter(d => d.year < 1970)
		lastTenYears = eventData.filter(d => d.year > 2008)

		// find the 15 deadliest events
		deadliestEvents = eventData.sort(function(a, b) {
			return d3.descending(+a.deaths, +b.deaths);
		}).slice(0, 15);

		// group events by year, then sort each set of yearly events by type
		eventsByYear = d3.group(eventData, d => d.year);
		for (let key of eventsByYear.keys()) {
			eventsByYear.get(key).sort(function(a, b) {
				// within each year - sort first by disaster type, then by disaster number
				//return typeSortNum(a.disastertype)- typeSortNum(b.disastertype) || a.disasterno-b.disasterno;
				// within each year - sort by disaster number
				return b.disasterno-a.disasterno;
			})
			eventsByYear.get(key).forEach(function(event, index, theArray) {
				theArray[index].vertNum = index;
			});
			eventsByYearFlat = eventsByYearFlat.concat(eventsByYear.get(key))
		}
		console.log(eventsByYearFlat.length)

		// add data to specify coordinates for the grid of all circles
		const rowCount = 110; // max number of circles in any row
		eventsByYearFlat.forEach(function(event, index, theArray) {
			var rowNum = Math.floor(index/rowCount);
			if (rowNum%2 == 0) {
				theArray[index].gridX = 6+(index*9)%(rowCount*9)
			} else {
				theArray[index].gridX = 11+(index*9)%(rowCount*9) // shift odd rows by 5 pixels to create a different/compact grid type
			}
			theArray[index].gridY = 8+8*Math.floor(index/rowCount)
		});

		init()

	})   // end d3.csv.then


	return {
		update: update,
	}
} // window.createGraphic
