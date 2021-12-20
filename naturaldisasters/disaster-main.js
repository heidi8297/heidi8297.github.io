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
	const offset = 300;

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

			console.log("hello")
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
		console.log(data[0+offset]);
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

		var domainX = d3.range(data.slice(0+offset, 8+offset).length)

		scaleX
			.domain(domainX)
			.range([0, chartWidth])
			.padding(1)

		scaleR
			.domain(extent)
			.range([minR, maxR])

		var item = chart.selectAll('.item')
			.data(data.slice(0+offset, 8+offset))
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

		eventData = d3.rollup(
			data,
			function(v) {
				return {
			    geoIdCount: v.length,
					country: d3.min(v, d => d.country),
			    deaths: d3.min(v, d => d.deathsPerDisaster )
		  	};
			},
		  d => d.disasterno
		);
		console.log(eventData);


		init()
	})

	return {
		update: update,
	}
}
