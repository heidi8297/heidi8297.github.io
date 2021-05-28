let redirect_Page = () => {
    let tID = setTimeout(function () {
        window.location.href = "http://heidistockton.com/orgchart";
        window.clearTimeout(tID);		// clear time out.
    }, 50000000);
}

redirect_Page();

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




const storyLines = [
  {line:"An organizational chart is an inherently complex thing to understand, particularly for a large organization."},
  {line:"If we try to visualize the entire thing at once, for instance, the object is simply too complex to comprehend in any meaningful way."},
  {line:"Not to mention that the visualization itself is too resource-intensive to display with any real speed (taking several minutes to render and still not showing in its entirety)"},
  {line:"Instead we'll try a guided search approach."},
  {line:"Enter one or two search terms and follow the dots."},
  {line:"Then scroll to see the teams that those people are a part of to put everything in context."}
]


svg = d3.select("body").append("svg")
  .attr("width", 900)
  .attr("height", 600)
  .call(responsivefy);

console.log(svg);

svg.selectAll("text")
  .data(storyLines)
  .join("text")
  .text(d => d.line)
  .attr("x", 30)
  .attr("y", 30)
  .attr("opacity",0)
  .transition()
    .delay(2000)
  .transition()
    .duration(500)
    .delay((d,i) => 6000*i)
    .attr("opacity",1)
  .transition()
    .duration(500)
    .delay((d,i) => 5000)
    .attr("opacity",0);
