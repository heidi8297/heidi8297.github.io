/*
	This function creates a simple d3 chart.
	This could be anything that has discrete steps.
	The important part is that it exposes an update function that
	calls a new thing on a scroll trigger.
*/
window.createGraphic = function(graphicSelector) {
	let data = [];
	let eventData = [];
	let eventsByType = [];
	let eventTypesByDeathTolls = [];
	let deadliestEvents = [];
	let firstTenYears = [];
	let lastTenYears = [];
	let eventsByYear = [];
	let eventsByYearFlat = [];
	const canvasWidth = 3000;
	const canvasHeight = 2400;
	const canvasMargin = 0.01*canvasWidth;

	const speedFactor = 2.2;

	// create variables for referring to the 'canvas' element in HTML and to its CONTEXT
	//   the latter of which will be used for rendering our elements to the canvas
	var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');

	// create a 'custom' element that will be part of a 'virtual' DOM
	//   we will use this to bind our data without cluttering the actual DOM
	var detachedContainer = document.createElement("custom");
	var dataContainer = d3.select(detachedContainer);

	const offset = 1300;  // using this for testing purposes only - can delete later

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

	// actions to take on each step of our scroll-driven story
	var steps = [
		function step0() {
			databind21B(eventsByYearFlat);
			var t = d3.timer(function(elapsed) {
				drawEventCircles();
				if (elapsed > speedFactor*850) t.stop();
			}); // Timer running the draw function repeatedly for 850 ms.
		}, // step0()

		function step1() {
			databind22(eventsByYearFlat);
			var t = d3.timer(function(elapsed) {
				drawEventCircles();
				if (elapsed > speedFactor*850) t.stop();
			}); // Timer running the draw function repeatedly for 850 ms.
		}, // step1()

		function step2() {
			databind23(eventsByYearFlat);
			var t = d3.timer(function(elapsed) {
				drawEventCircles();
				if (elapsed > speedFactor*850) t.stop();
			}); // Timer running the draw function repeatedly for 850 ms.
		}, // step2()

		function step3() {
			databind23(eventsByYearFlat, 37000);
			var t = d3.timer(function(elapsed) {
				drawEventCircles();
				if (elapsed > speedFactor*850) t.stop();
			}); // Timer running the draw function repeatedly for 850 ms.
		} // step3()

	] // steps

	// update our chart
	function update(step) {
		steps[step].call()
	}

	// initiate the scales and initial shapes
	function setupCharts() {

		scaleXyear = d3.scaleLinear()
			.domain([1960,2018])
			.range([0+canvasMargin, canvasWidth-canvasMargin])

		scaleYvert = d3.scaleLinear()
			.domain([0,360])
			.range([canvasHeight -canvasMargin, 0+0.3*canvasHeight+canvasMargin])

		scaleXdeadliest = d3.scaleSymlog()
			.domain([0,450000])
			.range([0+canvasMargin, canvasWidth-canvasMargin])

		scaleYdeadliest = d3.scaleBand()
			.domain(["mass movement (dry)","volcanic activity","storm","landslide","flood","extreme temperature","earthquake","drought"])
			.range([canvasHeight -canvasMargin, 0+0.3*canvasHeight+canvasMargin])
			.paddingInner(0.1)
 			.paddingOuter(0.2)
 			.align(0.5) /// ??

		scaleYdeaths = d3.scaleLinear()
			.domain([0,450000])
			.range([canvasHeight -canvasMargin, 0+canvasMargin])

	}  // setupCharts


	function databind21(dataToBind) {  // events by year, circle chart
		var boundElements = dataContainer.selectAll("custom.eventCircle")
			.data(dataToBind)
			.join('custom')
				.attr("class", "eventCircle")
				.attr("cx", d => scaleXyear(d.year) )
				.attr("cy", d => scaleYvert(d.vertNum) )
				.attr("r", 7 )
				.attr("opacity", 0)
				.attr("fillStyle", d => typeColor(d.disastertype) )
	} // databind21()

	function databind21B(dataToBind) {  // events by year transition
		var boundElements = dataContainer.selectAll("custom.eventCircle")
			.data(dataToBind)
			.join('custom')
			.transition()
			.ease(d3.easeQuadInOut)
			.duration(speedFactor*800)
			.attr("cx", d => scaleXyear(d.year) )
			.attr("cy", d => scaleYvert(d.vertNum) )
			.attr("r", 7 )
			.attr("fillStyle", d => typeColor(d.disastertype) )
			.attr("opacity", 0.5)
	} // databind21B()

	function databind22(dataToBind) {  // deadliest individual events / log scale
		var boundElements = dataContainer.selectAll("custom.eventCircle")
			.data(dataToBind)
			.join("custom")
				.attr("class", "eventCircle")
				.transition()
				.ease(d3.easeQuadInOut)
				.duration(speedFactor*800)
				.attr("cx", d => scaleXdeadliest(d.deaths))
				.attr("cy", d => scaleYdeadliest(d.disastertype) - 60 + 120*Math.random())
				.attr("r", 10 )
				.attr("opacity", 0.5)
				.attr("fillStyle", d => typeColor(d.disastertype) )
	} // databind22()

	function databind23(dataToBind, deathMin=0) {  // deaths by year
		var boundElements = dataContainer.selectAll("custom.eventCircle")
			.data(dataToBind)
			.join("custom")
				.attr("class", "eventCircle")
				.transition()
				.ease(d3.easeQuadInOut)
				.duration(speedFactor*800)
				.attr("cx", d => scaleXyear(d.year))
				.attr("cy", d => scaleYdeaths(d.deaths))
				.attr("r", 13 )
				.attr("opacity", function(d) {
					if (d.deaths < deathMin) {
						return 0
					} else { return 0.6 }
				})
				.attr("fillStyle", d => typeColor(d.disastertype) )
	} // databind22()


	function drawEventCircles() {
		ctx.clearRect(0,0,canvasWidth,canvasHeight);
		dataContainer.selectAll("custom.eventCircle").each(function(d,i) {
			var node = d3.select(this);   // This is each individual element in the loop.
			ctx.fillStyle = node.attr('fillStyle')   // Here you retrieve the colour from the individual in-memory node and set the fillStyle for the canvas paint
			ctx.globalAlpha = node.attr("opacity")
			ctx.beginPath();
			ctx.arc(node.attr("cx"), node.attr("cy"), node.attr("r"),
									0,  2 * Math.PI, true);
			ctx.fill()
			ctx.closePath()
		})
	} // drawEventCircles()

	function init() {
		setupCharts()
		databind21(eventsByYearFlat)  // create event circles, make invisible
		databind21B(eventsByYearFlat) // transition event circles into view
		drawEventCircles()
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
					otherNotes: d3.min(v, d => d.otherNotes)
		  	};
			},
		  d => d.disasterno
		).values()).filter(d => d.disastertype != "mass movement (dry)"); // remove this disaster type

		// count total events of each type
		eventsByType = Array.from(
			d3.rollup(eventData, v => v.length, d => d.disastertype).entries()
		);

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
				return typeSortNum(a.disastertype)- typeSortNum(b.disastertype) || a.disasterno-b.disasterno;
			})
			eventsByYear.get(key).forEach(function(event, index, theArray) {
				theArray[index].vertNum = index;
			});
			eventsByYearFlat = eventsByYearFlat.concat(eventsByYear.get(key))
		}


		init()
	})   // end d3.csv.then

	return {
		update: update,
	}
} // window.createGraphic
