

const spellsFullList = ["Lumos","Accio","Muffliato","Riddikulus","Expecto Patronum",
	"Expelliarmus","Impedimenta","Stupefy","Crucio","Avada Kedavra"];

const spellsShortList = ["Lumo","Acci","Muff","Ridd","Expa","Expe","Impe","Stup","Cruc",
	"Avke"];

// for a given full name, return the shortened name
const spellShortened = d3.scaleOrdinal()
	.domain(spellsFullList)
	.range(spellsShortList);


// define my custom shape (for now there is just one, but i'm leaving it open to
//   add more later if needed)
// I couldn't find a star shape svg that I liked so I created this one by hand
const flow_shapes = {
  star: function(size) {
    const points = [ [0.4019*size, 0.3269*size], [0.5*size,0],
		[0.5981*size, 0.3269*size], [0.6731*size, 0.4019*size], [size, 0.5*size],
		[0.6731*size, 0.5981*size], [0.5981*size, 0.6731*size], [0.5*size, size],
		[0.4019*size, 0.6731*size], [0.3269*size, 0.5981*size], [0, 0.5*size],
		[0.3269*size, 0.4019*size], [0.4019*size, 0.3269*size] ]
    return d3.line()(points);
  }
};

// initial viewport size - vw seems to be 10-20 px wider than $(this).width() used below
const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)

var spellDelay = 0;
var tooltipOffsetSpellX = 0;
var tooltipOffsetY = -28;
var tooltipOffsetScatter = 0;

// if the screen seems to be a phone, shrink the "spacer" div to 0
// then set time delays based on which graphs are likely in view
// on wide screens the delays create a nice sequence
// on smaller screens (where only one graph is viewable at a time) the delays
//   are essentially a workaround to improve the experience
// the better approach for smaller screens would be to detect when the user had
//   scrolled to the visualizations and begin the animations at that time.
if (vw <= 767) {  						// likely a phone
	$(".spacer").css("height","0px");
	var scatterDelay = 1800;
	var scatterDampen = 1.7;
	var tooltipOffsetSpellX = 90;
	var tooltipOffsetY = 28;
	var tooltipOffsetScatter = -125;
} else if (vw <= 991) {       // likely a tablet
	var scatterDelay = 1400;
	var scatterDampen = 1.3;
} else {											// likely a desktop
	$(".textBlock").css("padding","0 20%");
	var scatterDelay = 0;
	var spellDelay = 1200;
	var scatterDampen = 1;
}

// if the window is resized, change the formatting values accordingly
$(window).resize(function() {
		if ($(this).width() <= 752) {    // likely a phone
			$(".spacer").css("height","0px");
			$(".textBlock").css("padding","0 10%");
		} else if ($(this).width() <= 976) {	// likely a tablet
			$(".spacer").css("height","72px");
			$(".textBlock").css("padding","0 10%");
		} else {														// likely a desktop
			$(".spacer").css("height","72px");
			$(".textBlock").css("padding","0 20%");
		};
});

// determine the size of each star based on the emphasis descriptor value
function starSize(thisDescriptorValue, scaler = 1) {
	return scaler*0.3*(12+thisDescriptorValue)
};

// define a "jitter" function based on the namePosition
function jitter(namePos,harrySeparate = true,rangeDefault = 0.2) {
	if (namePos === 7 && harrySeparate) {
		return namePos -0.5 + Math.random();  // HP gets more space and more jitter
	} else {
		return namePos -(0.5*rangeDefault) + Math.random()*rangeDefault;
	}
};

// define the word to be used in the tooltip - "mentioned" or "performed"
function spellAction(talk) {
	if (talk === "TRUE") {
		return "mentioned"
	} else {
		return "performed"
	}
};

// determine the opacity of each shape based on whether the spell was cast or
//   merely mentioned in conversation
function opacityValue(talk) {
	if (talk === "TRUE") {
		return 0.4
	} else {
		return 0.8
	}
};

// Color scale: give me a spell name, I return a color
const color = d3.scaleOrdinal()
	.domain(spellsFullList)
	.range(["#55CC66","#00BFC0","#00A3FF","#5566FF","#735FF8","#8A58F0","#A24DE4",
		"#BA3ED4","#F2006C","#EE0044"]);

// Color scale for making the stars sparkle
const colorTwinkle = d3.scaleOrdinal()
	.domain(spellsFullList)
	.range(["#BCFFC6","#AFF8F8","#B0E2FF","#BFC6FF","#C4BBFF","#D3BDFF","#E4BDFF",
		"#F5BFFF","#FFB3D7","#FFA8C1"]);

// Full book names
const bookName = d3.scaleOrdinal()
	.domain(["2: CoS","3: PoA","4: GoF","5: OotP","6: HBP","7: DH"])
	.range(["Chamber of Secrets","Prisoner of Azkaban","Goblet of Fire",
	"Order of the Phoenix","Half Blood Prince","Deathly Hallows"]);

// Book numbers (I could use substring, but this is more readable)
const bookNum = d3.scaleOrdinal()
	.domain(["2: CoS","3: PoA","4: GoF","5: OotP","6: HBP","7: DH"])
	.range([2,3,4,5,6,7]);

// determine the color based both on spell name and talkTF
function colorFinal(spellName,talkBool) {
	if (talkBool === "TRUE") {
		return "none"
	} else {
		return color(spellName)
	}
};

// determine the stroke based on spell name and talkTF
function stroke(spellName,talkBool) {
	if (talkBool === "TRUE") {
		return color(spellName)
	} else {
		return "none"
	}
};

// create special tooltip add-on(s)
function extraText(thisPosition) {
	if (thisPosition === 762170) {
		return "<br><br><em>Technically Dolores Umbridge was not a Death Eater,"+
		" but her behavior was so despicable, she may as well have been</em>";
	} else {
		return "";
	}
};


// this function makes our graph responsive to the size of the container/screen!
// function from Ben Clinkinbeard
function responsivefy(thisSvg) {
  // container will be the DOM element that the svg is appended to
  // we then measure the container and find its aspect ratio
  const container = d3.select(thisSvg.node().parentNode),
      width = parseInt(thisSvg.style('width'), 10),
      height = parseInt(thisSvg.style('height'), 10),
      aspect = width / height;

  // set viewBox attribute to the initial size control scaling without
	//   preserveAspectRatio
  // resize svg on inital page load
  thisSvg.attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMinYMid')
      .call(resize);

  // add a listener so the chart will be resized when the window resizes
  // multiple listeners for the same event type requires a namespace, i.e.,
	//   'click.foo'
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
      thisSvg.attr('width', w);
      thisSvg.attr('height', Math.round(w / aspect));
  }
}



//  CREATE THE SCATTER PLOT
const svgWidth = 640;
const svgHeight = 600;

const margin = {top: 0, right: 135, bottom: 50, left: 0};
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
const divScatter = d3.select("body").append("div")
  .attr("class", "tooltip tooltipScatter")
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
			.attr( "d", d => flow_shapes["star"](starSize(d.descriptorValue,2)) )
			.attr("fill",d=>colorFinal(d.spell,d.talkTF))
			.attr("stroke",d => stroke(d.spell,d.talkTF))
			.attr("opacity",0)
			.attr("class",d=> "scatter"+spellShortened(d.spell))
			.attr("transform", (d,i) => "translate("+(800-1600*Math.random())+","+
				(800-1600*Math.random())+")")
			.on("mouseover", function(event,d) {
				divScatter.transition()
         .duration(200)
         .style("opacity", .8);
       	divScatter.html(d.spellcaster+ " "+spellAction(d.talkTF)+" the "+d.spell+" "+
					d.classification+" in "+bookName(d.book)+" (book "+bookNum(d.book)+")."+extraText(d.position))
         .style("left", (event.pageX + tooltipOffsetScatter) + "px")
         .style("top", (event.pageY + tooltipOffsetY) + "px");
      })
     	.on("mouseout", function(d) {
       	divScatter.transition()
         .duration(500)
         .style("opacity", 0);
      })
			.transition().duration(scatterDelay)
			.transition().filter(d=> ".class"+d.spell)
		 	.transition().duration(scatterDampen*800)  // loading animation (arrive from all over)
		 		.attr("transform", d=> "translate(" + (x(d.position)-
					starSize(d.descriptorValue)) + "," + (y(jitter(d.namePosition))-
					starSize(d.descriptorValue)) + ")")
				.attr("opacity",1)
				.delay(d => scatterDampen*800*Math.random() )
			.transition().duration(1600)

			// the stars twinkling transition needs to be made into a function!
			//   I didn't have the time to figure that out, so it appears many places
			.transition().duration(0)			// STARS TWINKLING animation begins here
				.attr("stroke", "#00000000")  // transparent because stars overlap
				.attr("stroke-width",2)				// makes the stars appear larger
				.delay(d => 600000*Math.random())  // make the stars twinkle "randomly"
			.transition().duration(400)
				.attr("fill", d=> colorTwinkle(d.spell))
				.attr("stroke", d=> colorTwinkle(d.spell))
			.transition().duration(400)
				.attr("fill",d=>colorFinal(d.spell,d.talkTF))
				.attr("stroke-width",1)
				.attr("stroke",d => stroke(d.spell,d.talkTF))
				;



	// ADDING AXES TO THE SCATTER PLOT

	// Create the y Axis - just names that line up with the data
	const yScaleForAxis = d3.scaleBand()
		.domain(["**Death Eaters, other", "**Vincent Crabbe", "**Barty Crouch",
			"**Bellatrix Lestrange", "**Voldemort", "", "Harry Potter", " ",
			"Hermione Granger","Remus Lupin","Mrs. Weasley","Ron Weasley",
			"Neville Longbottom","Severus Snape","Albus Dumbledore","Sirius Black",
			"Others"])
		.range([0, graphHeight]);

	// Create the x Axis - just names that line up with the data
	const xScaleForAxis = d3.scaleBand()
		.domain(["progression in the books --------->"])
		.range([0, graphWidth]);

	const yAxisGroup = graph.append("g")
		.attr('transform', `translate(${graphWidth+31}, 20)`);

	const xAxisGroup = graph.append("g")
		.attr('transform', `translate(20, ${graphHeight+20})`);

	// Draw the axis
	yAxisGroup.call(d3.axisLeft(yScaleForAxis))
		.selectAll("text")
		.style("text-anchor", "start")
		.style("font-family", "Raleway")
		.style("font-size", 12);

	// Draw the axis
	xAxisGroup.call(d3.axisBottom(xScaleForAxis))
		.selectAll("text")
		.style("text-anchor", "middle")
		.style("font-family", "Raleway")
		.style("font-size", 12);

	// remove the lines and ticks from the axes
	yAxisGroup.select('.domain').attr('stroke-width', 0);
	yAxisGroup.selectAll('.tick').selectAll('line').remove();
	xAxisGroup.select('.domain').attr('stroke-width', 0);
	xAxisGroup.selectAll('.tick').selectAll('line').remove();
})






// CREATE THE INDIVIDUAL STAR CHARTS FOR EACH SPELL


// Define the div for the tooltip
const divSpell = d3.select("body").append("div")
	.attr("class", "tooltip tooltipSpell")
	.style("opacity", 0);

// set the dimensions of the graph
const graphWidthSpell = 240;
const graphHeightSpell = 29;

// define the x and y scales
const xSpell = d3.scaleLinear()
	.domain([-1,34])  // 34 = the maximum number of occurences of one spell
	.range([0,graphWidthSpell]);

const ySpell = d3.scaleLinear()
	.domain([0,1])
	.range([0,graphHeightSpell]);





for (ind = 0; ind < 10; ind++) {

	const thisSpell = spellsFullList[ind]

	// create the svg
	const svgSpell = d3.select('.canvas'+spellsShortList[ind])
	  .append('svg')
	    .attr('width', graphWidthSpell)
	    .attr('height', graphHeightSpell);
			//.call(responsivefy);
			// for some reason I can't seem to use "responsivefy" more than once?

	// create a group to contain the graph
	const graphSpell = svgSpell.append('g')
	  .attr('width',graphWidthSpell)
	  .attr('height',graphHeightSpell);


	d3.json('top10spellsAugmented.json').then( data => {

		// filter the data to only the spells that are equal to "thisSpell"
		// why does this need to be a var???
		var dataFilter = data.filter(function(d) {return d.spell === thisSpell;} );

		//create a star for each (filtered) data point
	 	graphSpell.selectAll("path")
			.data(dataFilter)
	 		.enter()
	 		.append("svg:path")
	 		.attr( "d", d => flow_shapes["star"](starSize(d.descriptorValue,1.7)) )
			.attr("fill",d=>colorFinal(d.spell,d.talkTF))
			.attr("stroke",d => stroke(d.spell,d.talkTF))
			.attr("opacity",0)
			.attr("transform", (d,i) => "translate(" + (xSpell(i)-
				starSize(d.descriptorValue,0.85)) + ","+(jitter(8,false,6)-starSize(d.descriptorValue,0.85))+")")
			.on("mouseover", function(event,d) {
				divSpell.transition()
         .duration(200)
         .style("opacity", .8);
       	divSpell.html(
					"Spellcaster: "+d.spellcaster+"<br>Emphasis descriptor: "+d.descriptor+
					"<br>Book "+d.book.substring(0,1)+": "+bookName(d.book)+"<br>Effect: "+d.effect+"<br><br><em>\""+
					d.concordance+"\"</em>"
					)
         .style("left", (event.pageX - tooltipOffsetSpellX) + "px")
         .style("top", (event.pageY + tooltipOffsetY) + "px");
       })
     .on("mouseout", function(d) {
       divSpell.transition()
         .duration(500)
         .style("opacity", 0);
       })
			.transition().duration(spellDelay)
			.transition().duration(300)
				.attr("opacity",1)
				// the "d =>" function is necessary here to ensure each gets its own
				//   random timing
				.delay( d => 1200*Math.random() )

			.transition().duration(0)			// STARS TWINKLING animation begins here
				.attr("stroke", "#00000000")  // transparent because stars overlap
				.attr("stroke-width",2)				// makes the stars appear larger
				.delay(d => 1200*Math.random())  		// make the stars twinkle "randomly"
			.transition().duration(400)
				.attr("fill", d=> colorTwinkle(d.spell))
				.attr("stroke", d=> colorTwinkle(d.spell))
			.transition().duration(400)
				.attr("fill",d=>colorFinal(d.spell,d.talkTF))
				.attr("stroke-width",1)
				.attr("stroke",d => stroke(d.spell,d.talkTF))
			.transition().duration(0)			// STARS TWINKLING animation begins here
				.attr("stroke", "#00000000")  // transparent because stars overlap
				.attr("stroke-width",2)				// makes the stars appear larger
				.delay(d => 300000*Math.random())  // make the stars twinkle "randomly"
			.transition().duration(400)
				.attr("fill", d=> colorTwinkle(d.spell))
				.attr("stroke", d=> colorTwinkle(d.spell))
			.transition().duration(400)
				.attr("fill",d=>colorFinal(d.spell,d.talkTF))
				.attr("stroke-width",1)
				.attr("stroke",d => stroke(d.spell,d.talkTF))
			;

	 });  // end of d3.json function

}; // end of loop


// Define the div for the tooltip
const divWand = d3.select("body").append("div")
  .attr("class", "tooltip tooltipWand")
  .style("opacity", 0);


// add events to each wand - tooltips and trigger a transition in the scatter plot
for (ind = 0; ind < 10; ind++) {

	const thisSpellFull = spellsFullList[ind]
	const thisSpellShort = spellsShortList[ind]

	// trigger transition on click for each wand
	document.addEventListener('click', function (event) {
		if (!event.target.closest('.wand'+thisSpellShort)) return;
		d3.selectAll(".scatter"+thisSpellShort)
			.transition().duration(0)			// STARS TWINKLING animation begins here
				.attr("stroke", "#00000000")  // transparent because stars overlap
				.attr("stroke-width",4)				// makes the stars appear larger
				.delay((d,i) => 160*i)  		// make the stars twinkle in sequence
			.transition().duration(400)
				.attr("fill", d=> colorTwinkle(d.spell))
				.attr("stroke", d=> colorTwinkle(d.spell))
			.transition().duration(400)
				.attr("fill",d=>colorFinal(d.spell,d.talkTF))
				.attr("stroke-width",1)
				.attr("stroke",d => stroke(d.spell,d.talkTF))
				.delay(2300);
			}, false);


	// add tooltips to each wand
	document.addEventListener("mouseover", function(event){
		if (!event.target.closest('.wand'+thisSpellShort)) return;
		divWand.transition()
		 .duration(200)
		 .style("opacity", .8)
		 .delay(300);
		divWand.html("Click to see when "+thisSpellFull+" is used")
		 .style("left", (event.pageX) + "px")
		 .style("top", (event.pageY + 15) + "px");
	})

	document.addEventListener("mouseout", function(event){
		if (!event.target.closest('.wand'+thisSpellShort)) return;
		divWand.transition()
			.duration(500)
			.style("opacity", 0);
	})

};
