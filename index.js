
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


const svgWidth = 640;
const svgHeight = 600;

const margin = {top: 0, right: 110, bottom: 40, left: 0};
const graphWidth = svgWidth - margin.left - margin.right;
const graphHeight = svgHeight - margin.top - margin.bottom;

const svg = d3.select('.canvas')
  .append('svg')
    .attr('width', svgWidth)
    .attr('height', svgHeight);

const graph = svg.append('g')
  .attr('width',graphWidth)
  .attr('height',graphHeight)
  .attr('transform',`translate(${margin.left},${margin.top})`);


d3.json('top10spellsAugmented.json').then(data => {

  // define the x and y scales
  const x = d3.scaleLinear()
    .domain([0,d3.max(data,d=>d.position)])
    .range([0,graphWidth]);

  const y = d3.scaleLinear()
    .domain([0,d3.max(data,d=>d.namePosition)])
    .range([0,graphHeight]);


  // Color scale: give me a spell name, I return a color
  const color = d3.scaleOrdinal()
    .domain(["Avada Kedavra","Crucio","Stupefy","Impedimenta","Expelliarmus","Expecto Patronum","Riddikulus","Muffliato","Accio","Lumos"])
    .range([ "#EE0044", "#F2006C", "#BA3ED4", "#A24DE4","#8A58F0","#735FF8","#5566FF","#00A3FF","#00BFC0","#55CC66"]);



	// find the existing paths (stars) in the html
	const stars = graph.selectAll("path")
		.data(data);

	// Define the div for the tooltip
	var div = d3.select("body").append("div")
	    .attr("class", "tooltip")
	    .style("opacity", 0);


	// update the existing paths (stars)
	stars.attr( "d", d => flow_shapes["star"](2*halfSize*(10+d.descriptorValue)) )
  	.attr("fill", d=>color(d.spell) )
		.attr("opacity",d=> opacityValue(d.talkTF))
  	.attr("transform", d=> "translate(" + x(d.position) + "," + y(jitter(d.namePosition)) + ")");

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


/////////////////// start new stuff

	// Create the scale
	var yScaleForAxis = d3.scaleBand()
		.domain(["Death Eaters, other", "Vincent Crabbe", "Barty Crouch", "Bellatrix Lestrange", "Voldemort", "", "Harry Potter", " ", "Hermione Granger",
			"Remus Lupin","Mrs. Weasley","Ron Weasley","Severus Snape","Neville Longbottom","Albus Dumbledore","Sirius Black","Others"])         // This is what is written on the Axis: from 0 to 100
		.range([0, graphHeight]);

	const yAxisGroup = graph.append("g")
		.attr('transform', `translate(${graphWidth}, 20)`);

	// Draw the axis
	yAxisGroup.call(d3.axisLeft(yScaleForAxis))
		.selectAll("text")
		.style("text-anchor", "start")
		.style("font-family", "Poppins")
		.style("font-size", 12);

	yAxisGroup.select('.domain').attr('stroke-width', 0);


///////////////// end new stuff


})
