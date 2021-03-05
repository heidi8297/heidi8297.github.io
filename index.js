
// change the fill colors of the wand images (surely there must be a better way to accomplish this)
window.onload=function() {   // wait for the page to load before applying styles
	$("#wand14")[0].contentDocument.getElementById("wand14original").setAttribute("fill", "#459451");
	$("#wand02")[0].contentDocument.getElementById("wand02original").setAttribute("fill", "#04898A");
	$("#wand03")[0].contentDocument.getElementById("wand03original").setAttribute("fill", "#0874B0");
	$("#wand04")[0].contentDocument.getElementById("wand04original").setAttribute("fill", "#4551B5");
	$("#wand05")[0].contentDocument.getElementById("wand05original").setAttribute("fill", "#574AAE");
	$("#wand08")[0].contentDocument.getElementById("wand08original").setAttribute("fill", "#6A49AE");
	$("#wand09")[0].contentDocument.getElementById("wand09original").setAttribute("fill", "#7940A6");
	$("#wand12")[0].contentDocument.getElementById("wand12original").setAttribute("fill", "#843294");
	$("#wand13")[0].contentDocument.getElementById("wand13original").setAttribute("fill", "#B50E59");
	$("#wand06")[0].contentDocument.getElementById("wand06original").setAttribute("fill", "#B31140");
};

// define the default size of the stars
var halfSize = 0.3;

// define my custom shape (for now there is just one, but i'm leaving it open to add more later if needed)
// I couldn't find a star shape svg that I liked so I created this one by hand
var flow_shapes = {
  star: function(size) {
    var points = [ [0.5*size,0], [0.5981*size, 0.3269*size], [0.6731*size, 0.4019*size], [size, 0.5*size], [0.6731*size, 0.5981*size], [0.5981*size, 0.6731*size], [0.5*size, size],
		[0.4019*size, 0.6731*size], [0.3269*size, 0.5981*size], [0, 0.5*size], [0.3269*size, 0.4019*size], [0.4019*size, 0.3269*size], [0.5*size, 0] ]
    return d3.line()(points);
  }
};

// define a "jitter" function based on the namePosition
function jitter(namePos) {
	if (namePos === 7) {
		return namePos -0.5 + Math.random();  // Harry Potter gets more space and a wider jitter
	} else {
		return namePos -0.1 + Math.random()*0.2;  // everyone else gets less jitter
	}
};

// define the word to be used in the tooltip - "mentioned" or "performed"
function spellAction(talk) {
	if (talk === "TRUE") {
		return "mentioned"
	} else {
		return "performed"
	}
}

// determine the opacity of each shape based on whether the spell was cast or merely mentioned in conversation
function opacityValue(talk) {
	if (talk === "TRUE") {
		return 0.4
	} else {
		return 0.8
	}
}

// Color scale: give me a spell name, I return a color
const color = d3.scaleOrdinal()
	.domain(["Lumos","Accio","Muffliato","Riddikulus","Expecto Patronum","Expelliarmus","Impedimenta","Stupefy","Crucio","Avada Kedavra"])
	.range(["#55CC66","#00BFC0","#00A3FF","#5566FF","#735FF8","#8A58F0","#A24DE4","#BA3ED4","#F2006C","#EE0044"]);


// this function makes our graph responsive to the size of the container/screen!
function responsivefy(svg) {
  // container will be the DOM element that the svg is appended to
  // we then measure the container and find its aspect ratio
  const container = d3.select(svg.node().parentNode),
      width = parseInt(svg.style('width'), 10),
      height = parseInt(svg.style('height'), 10),
      aspect = width / height;

  // set viewBox attribute to the initial size control scaling with preserveAspectRatio
  // resize svg on inital page load
  svg.attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMinYMid')
      .call(resize);

  // add a listener so the chart will be resized when the window resizes
  // multiple listeners for the same event type requires a namespace, i.e., 'click.foo'
  // api docs: https://goo.gl/F3ZCFr
  d3.select(window).on(
      'resize.' + container.attr('id'),
      resize
  );

  // this is the code that resizes the chart
  // it will be called on load and in response to window resizes
  // gets the width of the container and resizes the svg to fill it
  // while maintaining a consistent aspect ratio
  function resize() {
      const w = parseInt(container.style('width'));
      svg.attr('width', w);
      svg.attr('height', Math.round(w / aspect));
  }
}



//  CREATE THE SCATTER PLOT
const svgWidth = 640;
const svgHeight = 600;

const margin = {top: 0, right: 130, bottom: 45, left: 0};
const graphWidth = svgWidth - margin.left - margin.right;
const graphHeight = svgHeight - margin.top - margin.bottom;

const svg = d3.select('.canvas')
  .append('svg')
    .attr('width', svgWidth)
    .attr('height', svgHeight)
		.call(responsivefy);

const graph = svg.append('g')
  .attr('width',graphWidth)
  .attr('height',graphHeight)
  .attr('transform',`translate(${margin.left},${margin.top})`);

// Define the div for the tooltip
var div = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);


d3.json('top10spellsAugmented.json').then(data => {

  // define the x and y scales
  const x = d3.scaleLinear()
    .domain([90000,d3.max(data,d=>d.position)])
    .range([0,graphWidth]);

  const y = d3.scaleLinear()
    .domain([0,d3.max(data,d=>d.namePosition)])
    .range([0,graphHeight]);


	// find the existing paths (stars) in the html
	const stars = graph.selectAll("path")
		.data(data);

	// add stars for the remaining data points
	stars.enter()
		.append("svg:path")
			.attr( "d", d => flow_shapes["star"](2*halfSize*(12+d.descriptorValue)) )
	  	.attr("fill", d=>color(d.spell) )
			.attr("opacity",d=> opacityValue(d.talkTF))
	  	.attr("transform", d=> "translate(" + (x(d.position)-halfSize*(12+d.descriptorValue)) + "," + (y(jitter(d.namePosition))-halfSize*(12+d.descriptorValue)) + ")")
			.on("mouseover", function(event,d) {
				div.transition()
         .duration(200)
         .style("opacity", .9);
       	div.html(d.spellcaster+ " "+spellAction(d.talkTF)+" the "+d.spell+" "+d.classification+" in book "+d.book+".")
         .style("left", (event.pageX) + "px")
         .style("top", (event.pageY - 28) + "px");
       })
     .on("mouseout", function(d) {
       div.transition()
         .duration(500)
         .style("opacity", 0);
       });



	// ADDING AXES TO THE SCATTER PLOT

	// Create the y Axis - just names that line up with the data
	var yScaleForAxis = d3.scaleBand()
		.domain(["Death Eaters, other", "Vincent Crabbe", "Barty Crouch", "Bellatrix Lestrange", "Voldemort", "", "Harry Potter", " ", "Hermione Granger",
			"Remus Lupin","Mrs. Weasley","Ron Weasley","Neville Longbottom","Severus Snape","Albus Dumbledore","Sirius Black","Others"])
		.range([0, graphHeight]);

	// Create the x Axis - just names that line up with the data
	var xScaleForAxis = d3.scaleBand()
		.domain(["progression in the books --------->"])
		.range([0, graphWidth]);

	const yAxisGroup = graph.append("g")
		.attr('transform', `translate(${graphWidth+25}, 20)`);

	const xAxisGroup = graph.append("g")
		.attr('transform', `translate(20, ${graphHeight+15})`);

	// Draw the axis
	yAxisGroup.call(d3.axisLeft(yScaleForAxis))
		.selectAll("text")
		.style("text-anchor", "start")
		.style("font-family", "Poppins")
		.style("font-size", 12);

	// Draw the axis
	xAxisGroup.call(d3.axisBottom(xScaleForAxis))
		.selectAll("text")
		.style("text-anchor", "middle")
		.style("font-family", "Poppins")
		.style("font-size", 12);

	// remove the lines and ticks from the axes
	yAxisGroup.select('.domain').attr('stroke-width', 0);
	yAxisGroup.selectAll('.tick').selectAll('line').remove();
	xAxisGroup.select('.domain').attr('stroke-width', 0);
	xAxisGroup.selectAll('.tick').selectAll('line').remove();


})









// CREATE THE INDIVIDUAL STAR CHARTS FOR EACH SPELL


// Define the div for the tooltip
var divSpell = d3.select("body").append("div")
	.attr("class", "tooltipSpell")
	.style("opacity", 0);

// set the dimensions of the graph
const graphWidthSpell = 240;
const graphHeightSpell = 30;

// define the x and y scales
const xSpell = d3.scaleLinear()
	.domain([0,34])  // 34 = the maximum number of occurences of one spell
	.range([0,graphWidthSpell]);

const ySpell = d3.scaleLinear()
	.domain([0,1])
	.range([0,graphHeightSpell]);


var spellsFull = ["Lumos","Accio","Muffliato"] //  NEEDS THE REST OF THE VALUES
var spells = ["Lumo","Acci","Muff","Ridd","Expa","Expe","Impe","Stup","Cruc","Avke"];






for (ind = 0; ind < 3; ind++) {

	var thisSpell = spellsFull[ind]

	console.log(ind);
	console.log(thisSpell);

	// create the svg
	const svgSpell = d3.select('.canvas'+spells[ind])
	  .append('svg')
	    .attr('width', graphWidthSpell)
	    .attr('height', graphHeightSpell);
	//		.call(responsivefy);   // for some reason I can't seem to use "responsivefy" more than once in the code?

	// create a group to contain the graph
	const graphSpell = svgSpell.append('g')
	  .attr('width',graphWidthSpell)
	  .attr('height',graphHeightSpell);



	d3.json('top10spellsAugmented.json').then( data => {    // do I really need to include so much code in this wrapper function?  I'm guessing not?

		console.log("thisSpell:"+thisSpell);
		console.log("ind:"+ind);
		console.log("spellsFull:"+spellsFull);
		console.log(thisSpell);
		console.log(dataFilter);

		// filter the data to only the spells that are equal to "thisSpell"
		var dataFilter = data.filter(function(d) {return d.spell === thisSpell;} );

		//create a star for each (filtered) data point
	 	graphSpell.selectAll("path")
			.data(dataFilter)
	 		.enter()
	 		.append("svg:path")
	 		.attr( "d", d => flow_shapes["star"](2*halfSize*(12+d.descriptorValue)) )
	 		.attr("fill", d=> color(d.spell) )
	 		.attr("opacity",d=> opacityValue(d.talkTF))
	 		.attr("transform", (d,i) => "translate(" + xSpell(i) + ",0.5)");


	 });  // end of d3.json function

 	console.log('after the data bit');

} // end of loop
