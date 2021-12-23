

(function() {
  "use strict";

  /**
   * Easy selector helper function
   */
  const select = (el, all = false) => {
    el = el.trim()
    if (all) {
      return [...document.querySelectorAll(el)]
    } else {
      return document.querySelector(el)
    }
  }

  /**
   * Easy event listener function
   */
  const on = (type, el, listener, all = false) => {
    let selectEl = select(el, all)
    if (selectEl) {
      if (all) {
        selectEl.forEach(e => e.addEventListener(type, listener))
      } else {
        selectEl.addEventListener(type, listener)
      }
    }
  }

  /**
   * Easy on scroll event listener
   */
  const onscroll = (el, listener) => {
    el.addEventListener('scroll', listener)
  }


  /**
   * Scrolls to an element with header offset
   */
  const scrollto = (el) => {
    let elementPos = select(el).offsetTop
    window.scrollTo({
      top: elementPos,
      behavior: 'smooth'
    })
  }

  /**
   * Mobile nav toggle
   */
  on('click', '.mobile-nav-toggle', function(e) {
    select('body').classList.toggle('mobile-nav-active')
    this.classList.toggle('bi-list')
    this.classList.toggle('bi-x')
  })

  /**
   * Scrool with offset on links with a class name .scrollto
   */
  on('click', '.scrollto', function(e) {
    if (select(this.hash)) {
      e.preventDefault()

      let body = select('body')
      if (body.classList.contains('mobile-nav-active')) {
        body.classList.remove('mobile-nav-active')
        let navbarToggle = select('.mobile-nav-toggle')
        navbarToggle.classList.toggle('bi-list')
        navbarToggle.classList.toggle('bi-x')
      }
      scrollto(this.hash)
    }
  }, true)

  /**
   * Scroll with offset on page load with hash links in the url
   */
  window.addEventListener('load', () => {
    if (window.location.hash) {
      if (select(window.location.hash)) {
        scrollto(window.location.hash)
      }
    }
  });

  /**
   * Porfolio isotope and filter
   */
  window.addEventListener('load', () => {
    let portfolioContainer = select('.portfolio-container');
    if (portfolioContainer) {
      let portfolioIsotope = new Isotope(portfolioContainer, {
        itemSelector: '.portfolio-item'
      });

      let portfolioFilters = select('#portfolio-flters li', true);

      on('click', '#portfolio-flters li', function(e) {
        e.preventDefault();
        portfolioFilters.forEach(function(el) {
          el.classList.remove('filter-active');
        });
        this.classList.add('filter-active');

        portfolioIsotope.arrange({
          filter: this.getAttribute('data-filter')
        });
      }, true);
    }

  });

  /**
   * Initiate portfolio lightbox
   */
  const portfolioLightbox = GLightbox({
    selector: '.portfolio-lightbox'
  });

  /**
   * Initiate portfolio details lightbox
   */
  const portfolioDetailsLightbox = GLightbox({
    selector: '.portfolio-details-lightbox',
    width: '90%',
    height: '90vh'
  });

  /**
   * Portfolio details slider
   */
  new Swiper('.portfolio-details-slider', {
    speed: 400,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false
    },
    pagination: {
      el: '.swiper-pagination',
      type: 'bullets',
      clickable: true
    }
  });


})()










// ======================   D3 loading animation   =========================


const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);

const spellsFullList = ["Lumos","Accio","Muffliato","Riddikulus","Expecto Patronum",
	"Expelliarmus","Impedimenta","Stupefy","Crucio","Avada Kedavra"];


// determine the size of each star based on the emphasis descriptor value
function starSize(thisDescriptorValue, scaler = 1) {
	return scaler*0.3*(12+thisDescriptorValue)
};

// define a "jitter" function based on the namePosition
function jitter(namePos,harrySeparate = true,rangeDefault = 0.2) {
	return namePos -(0.5*rangeDefault) + Math.random()*rangeDefault;
};

// Color scale: give me a number, I return a color
// const color = d3.scaleOrdinal()
// 	.domain([0,1,2,3,4,5,6,7,8,9,10,11,12])
// 	.range(["#FFEE88","#FFEE88","#ffcc6d","#FFAC69","#ff9473","#fe8187","#e278d6","#ad8aff",
// 		"#7c97ff","#66B9FF","#77DBFD","#83E8D0","#C3E6A6"]);


// used to create semi-randomness in the color order
let colorOffset = 12*Math.random();
const randVal = Math.random();

// make the rainbow start or end with yellow most of the time ('cause that's my jam)
if (randVal < 0.3) {
  colorOffset = 0.2;
} else if (randVal > 0.7) {
  colorOffset = 2;
}


// generate randomized data
function genRandomHist([theseDataGen, thisValueKeeper],numValues,centerVal,stDev,maxVal) {
  [...Array(numValues).keys()].forEach(function(index) {
    let xValue = -1;
    while (xValue < 1 || xValue > 36 || thisValueKeeper[xValue] > maxVal) {
      xValue = Math.round(d3.randomNormal(centerVal, stDev)())
    }
    if (xValue in thisValueKeeper) {
      thisValueKeeper[xValue]++;
    } else {
      thisValueKeeper[xValue] = 1
    }
    theseDataGen.push([xValue, thisValueKeeper[xValue]]);
  });
  return [theseDataGen, thisValueKeeper];
}

// build a "random" histogram in a shape that works well for the design
const randDist1 = genRandomHist([[],{}],30,6,1.3,26);
const randDist2 = genRandomHist(randDist1,13,6,0.3,26);
const randDist3 = genRandomHist(randDist2,13,6,2.4,26);

const randDist4 = genRandomHist(randDist3,37,31,1.3,30);
const randDist5 = genRandomHist(randDist4,14,31,0.3,30);
const randDist6 = genRandomHist(randDist5,17,31,2.1,30);

const randDist7 = genRandomHist(randDist6,8,13,3.4,10);
const randDist8 = genRandomHist(randDist7,4,34,1.2,30);
const randDist9 = genRandomHist(randDist8,4,2,1.2,30);

let dataGen = randDist9[0].sort((a,b) => a[0]*100 + a[1] - b[0]*100 - b[1]);


// this function makes our svg responsive to the size of the container/screen!
// initial version provided by Ben Clinkinbeard and Brendan Sudol
function responsivefy(thisSvg,maxWidth=4000) {
  const container = d3.select(thisSvg.node().parentNode),
    width = parseInt(thisSvg.style('width'), 10),
    height = parseInt(thisSvg.style('height'), 10),
    aspect = width / height;
  thisSvg.attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMinYMid')
    .call(resize);
  d3.select(window).on(
    'resize.' + container.attr('id'),
    resize
  );
  function resize() {
    const w = Math.min(maxWidth,parseInt(container.style('width')));
    thisSvg.attr('width', w);
    thisSvg.attr('height', Math.round(w / aspect));
  }
}



const timeoutLength = 8800;

//  CREATE THE D3 ANIMATION
const svgWidth = 900;
const svgHeight = 600;

const margin = {top: 30, right: 30, bottom: 30, left: 30};
const graphWidth = svgWidth - margin.left - margin.right;
const graphHeight = svgHeight - margin.top - margin.bottom;

const svg = d3.select('.canvas')
  .append('svg')
    .attr('width', svgWidth)
    .attr('height', svgHeight)
		.call(responsivefy);


// DEFINE A SET OF GRADIENTS
// Create the svg:defs element
var svgDefs = svg.append('defs');

// define 12 gradients
var grad01 = svgDefs.append('linearGradient').attr('id', 'grad01');
grad01.append('stop').attr('class', 'stop-left').attr('offset', '0.1');
grad01.append('stop').attr('class', 'stop-right').attr('offset', '0.9');
var grad02 = svgDefs.append('linearGradient').attr('id', 'grad02');
grad02.append('stop').attr('class', 'stop-left').attr('offset', '0.1');
grad02.append('stop').attr('class', 'stop-right').attr('offset', '0.9');
var grad03 = svgDefs.append('linearGradient').attr('id', 'grad03');
grad03.append('stop').attr('class', 'stop-left').attr('offset', '0.1');
grad03.append('stop').attr('class', 'stop-right').attr('offset', '0.9');
var grad04 = svgDefs.append('linearGradient').attr('id', 'grad04');
grad04.append('stop').attr('class', 'stop-left').attr('offset', '0.1');
grad04.append('stop').attr('class', 'stop-right').attr('offset', '0.9');
var grad05 = svgDefs.append('linearGradient').attr('id', 'grad05');
grad05.append('stop').attr('class', 'stop-left').attr('offset', '0.1');
grad05.append('stop').attr('class', 'stop-right').attr('offset', '0.9');
var grad06 = svgDefs.append('linearGradient').attr('id', 'grad06');
grad06.append('stop').attr('class', 'stop-left').attr('offset', '0.1');
grad06.append('stop').attr('class', 'stop-right').attr('offset', '0.9');
var grad07 = svgDefs.append('linearGradient').attr('id', 'grad07');
grad07.append('stop').attr('class', 'stop-left').attr('offset', '0.1');
grad07.append('stop').attr('class', 'stop-right').attr('offset', '0.9');
var grad08 = svgDefs.append('linearGradient').attr('id', 'grad08');
grad08.append('stop').attr('class', 'stop-left').attr('offset', '0.1');
grad08.append('stop').attr('class', 'stop-right').attr('offset', '0.9');
var grad09 = svgDefs.append('linearGradient').attr('id', 'grad09');
grad09.append('stop').attr('class', 'stop-left').attr('offset', '0.1');
grad09.append('stop').attr('class', 'stop-right').attr('offset', '0.9');
var grad10 = svgDefs.append('linearGradient').attr('id', 'grad10');
grad10.append('stop').attr('class', 'stop-left').attr('offset', '0.1');
grad10.append('stop').attr('class', 'stop-right').attr('offset', '0.9');
var grad11 = svgDefs.append('linearGradient').attr('id', 'grad11');
grad11.append('stop').attr('class', 'stop-left').attr('offset', '0.1');
grad11.append('stop').attr('class', 'stop-right').attr('offset', '0.9');
var grad12 = svgDefs.append('linearGradient').attr('id', 'grad12');
grad12.append('stop').attr('class', 'stop-left').attr('offset', '0.1');
grad12.append('stop').attr('class', 'stop-right').attr('offset', '0.9');


// Color scale: give me a number, I return a color
// const color = d3.scaleOrdinal()
// 	.domain([0,1,2,3,4,5,6,7,8,9,10,11,12])
// 	.range(["#FFEE88","#FFEE88","#ffcc6d","#FFAC69","#ff9473","#fe8187","#e278d6","#ad8aff",
// 		"#7c97ff","#66B9FF","#77DBFD","#83E8D0","#C3E6A6"]);

const color = d3.scaleOrdinal()
	.domain([0,1,2,3,4,5,6,7,8,9,10,11,12])
	.range(["url(#grad01)","url(#grad01)","url(#grad02)","url(#grad03)","url(#grad04)","url(#grad05)","url(#grad06)",
		"url(#grad07)","url(#grad08)","url(#grad09)","url(#grad10)","url(#grad11)","url(#grad12)"]);



const graph = svg.append('g')
  .attr('width',graphWidth)
  .attr('height',graphHeight)
  .attr('transform',`translate(${margin.left},${margin.top})`);

d3.json('circlesWithMobile.json').then(data => {

  // overwrite the existing histogram values with the randomly generated ones
  [...Array(140).keys()].forEach(function(index) {
    data[index].histogramX = dataGen[index][0];
    data[index].histogramY = dataGen[index][1];
  });

  // define the x and y scales
  const x = d3.scaleLinear()
    // .domain([0,d3.max(data,d=>d.histogramX)])
    .domain([0,36])
    .range([0,graphWidth]);

  const y = d3.scaleLinear()
    // .domain([0,d3.max(data,d=>d.histogramY)])
    .domain([0,30])
    .range([0,graphHeight]);


	// find the existing circles in the html
	const circles = graph.selectAll("circle")   // need to make this more specific...
		.data(data);

	// add circles for the remaining data points (position them above the svg)
	circles.enter()
		.append("circle")
      .attr('cy', -200 )
      .attr('cx', d=> x(d.histogramX))
      .attr('r', 9)
      // define the class as a number from 1-12 - we will use it to set the color and for animations
      .attr('class',(d,i) => (Math.round(i/12 + 2*Math.random() -1 + colorOffset)))
      .attr('fill',function(d,i) {return color(+d3.select(this).attr("class"))})
			.attr('opacity',0.8)

    // "bounce" the circles into place
    .transition().duration(1000)
      .delay(d=> 80*d.histogramY +300*Math.random() )
      .ease(d3.easeBounceOut)
      .attr('cy', d=> graphHeight - y(d.histogramY) );


  // resize the circles and move them into their scatter-plot positioning
  d3.selectAll("circle")
    .transition().duration(1200)
        .delay(d=> 4200+1100*Math.random())
        .ease(d3.easePolyInOut.exponent(3))
        // use a different graph shape for the scatter plot depending on screen size
        .attr('cy', function(d) {
            if (vw < 800) {
              return graphHeight - 0.93*(y(d.scatterYMobile) + 100*Math.random()-50)
            } else {
              return graphHeight - 0.93*(y(d.scatterY) + 100*Math.random()-50)
            }
        })
        .attr('cx', function(d) {
          if (vw < 800) {
            return 0.93*(x(d.scatterXMobile)+ 100*Math.random()-50)
          } else {
            return 0.93*(x(d.scatterX)+ 100*Math.random()-50)
          }
        })
        .attr('r',d=>5+25*Math.random())
        .attr("opacity", d=>0.25+0.6*Math.random())
        ;

  // sort and reposition the circles into color-specific positions around a larger circle
  d3.selectAll("circle")
    .transition().duration(1000)
      .delay(timeoutLength-1600)
      .ease(d3.easePolyInOut.exponent(3))
      .attr('r',d=>6+10*Math.random())
      .attr('opacity',0.2)
      .attr('cx', function(d) { return graphWidth/2  + 1.2*200*Math.cos(  (+d3.select(this).attr("class")-1 + colorOffset)  / 12 * 2*Math.PI)  } )
      .attr('cy', function(d) { return graphHeight/2 + 1.2*200*Math.sin(  (+d3.select(this).attr("class")-1 + colorOffset)  / 12 * 2*Math.PI)  } )

    // constrict toward the center of the larger circle (to mimic the behavior of the force graph)
    .transition().duration(800)
      .delay(d => 200*Math.random())
      .ease(d3.easeCubicInOut)
      .attr('opacity',0.8)
      .attr('cx', function(d) { return graphWidth/2  + 0.9*200*Math.cos(  (+d3.select(this).attr("class")-1 + colorOffset)  / 12 * 2*Math.PI)  } )
      .attr('cy', function(d) { return graphHeight/2 + 0.9*200*Math.sin(  (+d3.select(this).attr("class")-1 + colorOffset)  / 12 * 2*Math.PI)  } )
      ;

  // fade the circles to be invisible - make way for the forceCollision layout (below)
  d3.selectAll("circle")
    .transition().duration(200)
      .delay(timeoutLength)
      .attr("opacity",0);

});




// D3 force layout (for last portion of the loading animation)

setTimeout(function(){

  var widthForce = 900,
      heightForce = 600,
      padding = 1.5, // separation between nodes
      maxRadius = 12;


  var n = 150, // total number of nodes
      m = 12; // number of distinct clusters

  // The largest node for each cluster.
  var clusters = new Array(m);


  var nodes = d3.range(n).map(function () {
    var i = Math.floor(Math.random() * m),
        r = 1.3*Math.sqrt(( (i+colorOffset)%12  + 1) / m * -Math.log(Math.random())) * maxRadius,
        d = {
          cluster: i,
          radius: r,
          x: widthForce/2  +1.2*200*Math.cos((i+colorOffset) / m * 2*Math.PI)  -0.5 + Math.random(),
          y: heightForce/2 +1.2*200*Math.sin((i+colorOffset) / m * 2*Math.PI)  -0.5 + Math.random()
        };
    if (!clusters[i] || (r > clusters[i].radius)) clusters[i] = d;
    return d;
  });

  var maxRad = d3.max(nodes, d => d.radius ),
    maxStrength = 0.15;


  var simulation = d3.forceSimulation()
    // pull toward mouse (see 'mousemove' handler below)
    .force('attract', d3.forceAttract()
      .target([widthForce/2, heightForce/2])
      .strength( d => 0.007+1.2*Math.pow((d.radius / maxRad) * maxStrength, 2) ))

    // cluster by section
    .force('cluster', d3.forceCluster()
      .centers(d => clusters[d.cluster] )
      .strength(1.25)
      .centerInertia(0.1))

    // apply collision with padding
    .force('collide', d3.forceCollide( d=> d.radius + padding )
      .strength(1.5))

    .on('tick', layoutTick)
    .nodes(nodes);


  // add svg to designated div in the DOM
  var svgForce = d3.select('.canvasForce').append('svg')
      .attr('width', widthForce)
      .attr('height', heightForce)
      .call(responsivefy);


  // add circle for each entry in nodes
  var node = svgForce.selectAll('circle')
    .data(nodes)
    .enter().append('circle')
      .style('fill', d => color(d.cluster+1) )
      .style('opacity',0.8)
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

  // allow the user to click and drag each circle
  function dragstarted (event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged (event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended (event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  // make the clusters follow the mouse...
  svgForce.on('mousemove', function (event) {
      simulation.force('attract').target(d3.pointer(event));
      simulation
        .alphaTarget(0.3)
        .restart();
    });

  // ramp up collision strength to provide smooth transition
  var transitionTime = 3000;
  var t = d3.timer(function (elapsed) {
    var dt = elapsed / transitionTime;
    simulation.force('collide').strength(Math.pow(dt, 2) * 0.7);
    if (dt >= 1.0) t.stop();
  });

  function layoutTick (e) {
    node
      .attr('cx', d => d.x )
      .attr('cy', d => d.y )
      .attr('r', d => d.radius );
  }

},timeoutLength);
