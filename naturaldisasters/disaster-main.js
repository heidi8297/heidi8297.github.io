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

	// define a sort order by disaster type, to be used in stacked circle chart
	const typeSortNum = new Map([
    ['flood',0],
    ['storm',1],
		['earthquake',2],
		['landslide',3],
		['drought',4],
		['extreme temperature',5],
		['volcanic activity',6]
	])

	const offset = 1300;

	// provide a disaster type and return a corresponding color
	const typeColor = d3.scaleOrdinal()
		.domain(["drought","earthquake","flood","storm","extreme temperature","landslide","volcanic activity"])
		.range(["#A96830","#693410","#176F90","#394C97","#BE7C11","#2B6A2F","#B13D06"]);

	// actions to take on each step of our scroll-driven story
	var steps = [
		function step0() {
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
				.attr('r', 3.2*minR)

			item.select('text')
				.transition(t)
				.style('opacity', 0)
		},


		function step3() {
			var t = d3.transition()
				.duration(800)
				.ease(d3.easeQuadInOut)

			// circles are sized
			var item = graphicVisEl.selectAll('.item')

			item.select('circle')
				.transition(t)
				.delay(function(d, i) { return i * 200 })
				.attr("fill", d=> typeColor(d.disastertype) )
				.attr('r', function(d, i) {
					return scaleR(parseInt(d.year)-1950)
				})
				.style('opacity',0.5)

			item.select('text')
				.transition(t)
				.delay(function(d, i) { return i * 200 })
				.style('opacity', 1)
		},
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
	}

	// setup the scrolly text section on the lefthand side
	function setupProse() {
		var height = window.innerHeight * 0.5
		graphicProseEl.selectAll('.trigger')
			.style('height', height + 'px')
	}

	function init() {
		setupCharts()
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
			disastertype: d.disastertype,
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


		eventsByYear = d3.group(eventData, d => d.year);

		for (let key of eventsByYear.keys()) {
			console.log(key);
			eventsByYear.get(key).sort(function(a, b) {
				return [a.year-b.year]
				return a - b;
			});
		}

		init()
	})

	return {
		update: update,
	}
}
