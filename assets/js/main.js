/**
* Template Name: MyResume - v4.1.0
* Template URL: https://bootstrapmade.com/free-html-bootstrap-template-my-resume/
* Author: BootstrapMade.com
* License: https://bootstrapmade.com/license/
*/
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
   * Scrool with ofset on links with a class name .scrollto
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
   * Scroll with ofset on page load with hash links in the url
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
        portfolioIsotope.on('arrangeComplete', function() {
          AOS.refresh()
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









// ======================   D3 stuff =========================



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

// Color scale: give me a spell name, I return a color
const color = d3.scaleOrdinal()
	.domain([0,1,2,3,4,5,6,7,8,9,10,11,12])
	.range(["#FFF29C","#FFF29C","#FED16F","#FF9E6A","#FF867B","#E87493","#E272C7","#D280F8",
		"#AA7AF5","#6D9BFE","#77DBFD","#8DEEC7","#C3E6A6"]);


let colorOffset = 12*Math.random();

const randVal = Math.random();

// make the rainbow start or end with yellow most of the time (cause that's my jam)
if (randVal < 0.3) {
  colorOffset = 0.2;
} else if (randVal > 0.7) {
  colorOffset = 2;
}


// this function makes our graph responsive to the size of the container/screen!
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

const graph = svg.append('g')
  .attr('width',graphWidth)
  .attr('height',graphHeight)
  .attr('transform',`translate(${margin.left},${margin.top})`);


d3.json('circles.json').then(data => {

  // define the x and y scales
  const x = d3.scaleLinear()
    .domain([0,d3.max(data,d=>d.histogramX)])
    .range([0,graphWidth]);

  const y = d3.scaleLinear()
    .domain([0,d3.max(data,d=>d.histogramY)])
    .range([0,graphHeight]);


	// find the existing paths (stars) in the html
	const circles = graph.selectAll("circle")
		.data(data);

	// add stars for the remaining data points
	circles.enter()
		.append("circle")
      .attr('cy', -200 )
      .attr('cx', d=> x(d.histogramX))
      .attr('r', 9)
			.attr("fill",(d,i)=>color(Math.round(i/12 + 2*Math.random() -1 + colorOffset)))
			.attr("opacity",0.8)

      .transition().duration(1000)
        .delay(d=> 80*d.histogramY +300*Math.random() )
        .ease(d3.easeBounceOut)
        .attr('cy', d=> graphHeight - y(d.histogramY) );

  d3.selectAll("circle")
    .transition().duration(1200)
        .delay(d=> 4200+1100*Math.random())
        .ease(d3.easePolyInOut.exponent(3))
        .attr('cy', d=> graphHeight - 0.93*(y(d.scatterY) + 100*Math.random()-50) )
        .attr('cx', d=> 0.93*(x(d.scatterX)+ 100*Math.random()-50) )
        .attr('r',d=>5+25*Math.random())
        .attr("opacity", d=>0.25+0.6*Math.random())
        ;
      // .attr("transform", d=> "translate(" + x(d.position) + "," + y(jitter(d.namePosition)) + ")");
			// .attr("transform", (d,i) => "translate("+(800-1600*Math.random())+","+
			// 	(800-1600*Math.random())+")")
			// .transition().filter(d=> ".class"+d.spell)
		 	// .transition().duration(800)  // loading animation (arrive from all over)
		 	// 	.attr("transform", d=> "translate(" + x(d.position) + "," + y(jitter(d.namePosition)) + ")")
			// 	.attr("opacity",1)
			// 	.delay(d => 800*Math.random() );



})
