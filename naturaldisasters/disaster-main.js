/*
	This function creates a simple d3 chart.
	This could be anything that has discrete steps.
	The important part is that it exposes an update function that
	calls a new thing on a scroll trigger.
*/
window.createGraphic = function(graphicSelector) {
	var graphicEl = d3.select('.graphic')
	var graphicVisEl = graphicEl.select('.graphic__vis')
	var graphicProseEl = graphicEl.select('.graphic__prose')

	var margin = 20
	var width = 1000
	var chartWidth = width - margin * 2
	var height = 800
	var chartHeight = height - margin * 2
	var scaleX = null
	var scaleR = null
	let extent = [0,70]
	var minR = 10
	var maxR = 24
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

	const speedFactor = 4;

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
		.domain(["flood","storm","earthquake","landslide","drought","extreme temperature","volcanic activity","mass movement (dry)"])
		.range([0,1,2,3,4,5,6,7]);

	const typeDeathSort = d3.scaleOrdinal()
		.domain(["flood","storm","earthquake","landslide","drought","extreme temperature","volcanic activity","mass movement (dry)"])
		.range([3,6,1,4,0,2,7,5]);

	// provide a disaster type and return a corresponding color
	const typeColor = d3.scaleOrdinal()
		.domain(["drought","earthquake","flood","storm","extreme temperature","landslide","volcanic activity"])
		.range(["#A96830","#693410","#176F90","#394C97","#BE7C11","#2B6A2F","#B13D06"]);

	// actions to take on each step of our scroll-driven story
	var steps = [
		function step0() {
			databind21B(eventsByYearFlat);
			var tt = d3.timer(function(elapsed) {
				draw();
				if (elapsed > speedFactor*850) tt.stop();
			}); // Timer running the draw function repeatedly for 850 ms.

			// circles are centered and small
			var t = d3.transition()
				.duration(800)
				.ease(d3.easeQuadInOut)

			var item = graphicVisEl.selectAll('.item')

			item.transition(t)
				.attr('transform', translate(chartWidth / 2, chartHeight / 2))

			item.select('circle')
				.transition(t)
				.attr('r', minR)

			item.select('text')
				.transition(t)
				.style('opacity', 0)
		},

		function step1() {
			databind22(eventsByYearFlat);
			var tt = d3.timer(function(elapsed) {
				draw();
				if (elapsed > speedFactor*850) tt.stop();
			}); // Timer running the draw function repeatedly for 850 ms.



			var t = d3.transition()
				.duration(800)
				.ease(d3.easeQuadInOut)

			// circles are positioned
			var item = graphicVisEl.selectAll('.item')

			item.transition(t)
				.attr('transform', function(d, i) {
					return translate(scaleX(i), chartHeight / 2)
				})

			item.select('circle')
				.transition(t)
				.attr('r', minR)
				.attr("fill","#000000")
				.style('opacity',1)

			item.select('text')
				.transition(t)
				.style('opacity', 0)
		},

		function step2() {
			var t = d3.transition()
				.duration(800)
				.ease(d3.easeQuadInOut)

			// circles are positioned
			var item = graphicVisEl.selectAll('.item')

			item.transition(t)
				.attr('transform', function(d, i) {
					return translate(scaleX(i), chartHeight / 2)
				})

			item.select('circle')
				.transition(t)
				.attr("fill", d=> typeColor(d.disastertype) )
				.attr('r', function(d, i) {
					return scaleR(parseInt(d.year)-1950)
				})
				.style('opacity', 0.5)

			item.select('text')
				.transition(t)
				.style('opacity', 1)
		}

	]

	// update our chart
	function update(step) {
		steps[step].call()
	}

	// little helper for string concat if using es5
	function translate(x, y) {
		return 'translate(' + x + ',' + y + ')'
	}

	// initiate the svg, scales and initial shapes
	function setupCharts() {
		var svg = graphicVisEl.append('svg')
			.attr('width', width + 'px')
			.attr('height', height + 'px')

		var chart = svg.append('g')
			.classed('chart', true)
			.attr('transform', 'translate(' + margin + ',' + margin + ')')

		scaleR = d3.scaleLinear()
		scaleX = d3.scaleBand()

		scaleXyear = d3.scaleLinear()
		scaleXyear
			.domain([1960,2018])
			.range([0+canvasMargin, canvasWidth-canvasMargin])

		scaleYvert = d3.scaleLinear()
		scaleYvert
			.domain([0,360])
			.range([canvasHeight -canvasMargin, 0+0.3*canvasHeight+canvasMargin])

		scaleXdeadliest = d3.scaleSymlog()
			.domain([0,450000])
			.range([0+canvasMargin, canvasWidth-canvasMargin])

		scaleYdeadliest = d3.scaleBand()
			.domain(["flood","storm","earthquake","landslide","drought","extreme temperature","volcanic activity","mass movement (dry)"])
			.range([canvasHeight -canvasMargin, 0+0.3*canvasHeight+canvasMargin])
			.paddingInner(0.1)
 			.paddingOuter(0.2)
 			.align(0.5) /// ??

		var domainX = d3.range(eventData.slice(0+offset, 8+offset).length)

		scaleX
			.domain(domainX)
			.range([0, chartWidth])
			.padding(1)

		scaleR
			.domain(extent)
			.range([minR, maxR])

		var item = chart.selectAll('.item')
			.data(eventData.slice(0+offset, 8+offset))
			.enter().append('g')
				.classed('item', true)
				.attr('transform', translate(chartWidth / 2, chartHeight / 2))

		item.append('circle')
			.attr('cx', 0)
			.attr('cy', 0)

		item.append('text')
			.text(function(d) { return d.country })
			.attr('y', 1)
			.style('opacity', 0)

	}  // setupCharts


	function databind21(dataToBind) {
		var boundElements = dataContainer.selectAll("custom.circle")
			.data(dataToBind)
			.join('custom')
				.attr("class", "circle")
				.attr("cx", d => scaleXyear(d.year) )
				.attr("cy", d => scaleYvert(d.vertNum) )
				.attr("r", 5 )
				.attr("opacity", 0)
				.attr("fillStyle", d => typeColor(d.disastertype) )
	} // databind21()

	function databind22(dataToBind) {
		var boundElements = dataContainer.selectAll("custom.circle")
			.data(dataToBind)
			.join("custom")
				.attr("class", "circle")
				.transition()
				.duration(speedFactor*800)
				.attr("cx", d => scaleXdeadliest(d.deaths))
				.attr("cy", d => scaleYdeadliest(d.disastertype) - 40 + 80*Math.random())
				.attr("r", 8 )
				.attr("opacity", 0.5)
				.attr("fillStyle", d => typeColor(d.disastertype) )
	}

	function databind21B(dataToBind) {
		var boundElements = dataContainer.selectAll("custom.circle")
			.data(dataToBind)
			.join('custom')
			.transition()
			.duration(speedFactor*800)
			.attr("cx", d => scaleXyear(d.year) )
			.attr("cy", d => scaleYvert(d.vertNum) )
			.attr("r", 5 )
			.attr("fillStyle", d => typeColor(d.disastertype) )
			.attr("opacity", 0.5)
	}

	function draw() {
		ctx.clearRect(0,0,canvasWidth,canvasHeight);
		dataContainer.selectAll("custom.circle").each(function(d,i) {
			var node = d3.select(this);   // This is each individual element in the loop.
			ctx.fillStyle = node.attr('fillStyle')   // Here you retrieve the colour from the individual in-memory node and set the fillStyle for the canvas paint
			ctx.globalAlpha = node.attr("opacity")
			ctx.beginPath();
			ctx.arc(node.attr("cx"), node.attr("cy"), node.attr("r"),
									0,  2 * Math.PI, true);
			ctx.fill()
			ctx.closePath()
		})
	} // draw()

	// setup the scrolly text section on the lefthand side
	function setupProse() {
		var height = window.innerHeight * 0.5
		graphicProseEl.selectAll('.trigger')
			.style('height', height + 'px')
	}

	function init() {
		setupCharts()
		databind21(eventsByYearFlat)
		databind21B(eventsByYearFlat)
		draw()
		setupProse()
		update(0)
	}

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
		).values());

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
	})    // end d3.csv.then

	return {
		update: update,
	}
}
