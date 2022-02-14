
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


function setIsotope() {
  let portfolioContainer = select('.teams');
  if (portfolioContainer) {
    let portfolioIsotope = new Isotope(portfolioContainer, {
      itemSelector: '.teamCard'
    });
  }
}


// started this code with a basic collapsible tree diagram from "d3noob" (https://github.com/d3noob)
// example pulled from: https://blockbuilder.org/d3noob/9de0768412ac2ce5dbec430bb1370efe

// pulled in a snippet from Rob Schmuecker's example to enable auto-sizing the height of the tree
// http://bl.ocks.org/robschmuecker/7880033

var startTime = new Date();

var treeFile = "DMOrgChart.json";
const animationDelay = 0;
var idealTeamSize = document.getElementsByName("inputTeamSize")[0].value;
console.log('team');
console.log(idealTeamSize);

const forceImage = d3.select("#forceGif");
const whiteBox = d3.select(".whiteBox");
const removeStuff = d3.selectAll(".orgForce img");

const color1A = "url(#role1Gradient)";
const color1B = "#9EBEF2";
const color2A = "url(#role2Gradient)";
const color2B = "#FFDBAE";
const color3A = "#999";
const color3B = "#CCC";
const color3C = "#DDD";
const colorOrder = {
  "url(#role1Gradient)" : 1,
  "#9EBEF2" : 2,
  "url(#role2Gradient)" : 3,
  "#FFDBAE" : 4
};


var initialOffsetX = 120,
  initialOffsetY = 15,
  etwText = "(TMP",
  heightScale = 0.51;

// change the things that are specific to the dummy org chart data
if (treeFile === "DMOrgChart.json") {
  initialOffsetX = 90;
  initialOffsetY = 45;
  heightScale = 0.44;
} else {
  inputRole1 = document.querySelector(".inputRole1");
  inputRole1.value = "VISUALIZATION";
  inputRole2 = document.querySelector(".inputRole2");
  inputRole2.value = "DATA SCIENTIST";
  etwText = "(ETW";
}

// Creating Pie generator
var pie = d3.pie()
  .sort(null);


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



var rolename1 = document.getElementsByName("rolename1")[0].value.trim().toUpperCase();
var rolename2 = document.getElementsByName("rolename2")[0].value.trim().toUpperCase();

function formChanged() {
  rolename1 = document.getElementsByName("rolename1")[0].value.trim().toUpperCase();
  rolename2 = document.getElementsByName("rolename2")[0].value.trim().toUpperCase();
  rolename1 = (rolename1 === "" ? "sdjkadjskladsds" : rolename1);
  rolename2 = (rolename2 === "" ? "sdjkadjskladsds" : rolename2);
  idealTeamSize = document.getElementsByName("inputTeamSize")[0].value;
  console.log("form changed",rolename1,rolename2);
  renderTree(setIsotope);
}

// shift the contents of an array by n
function shift(arr, direction, n) {
  var times = n > arr.length ? n % arr.length : n;
  return arr.concat(arr.splice(0, (direction > 0 ? arr.length - times : times)));
}

// Set the dimensions and margins of the diagram
var margin = {top: 20, right: 80, bottom: 20, left: 80},
  width = 1060 - margin.left - margin.right,
  height = 600 - margin.top - margin.bottom;

// initiate the zoom
var zoom = d3.zoom().on("zoom", function(event) {
  svg.attr("transform", event.transform)
});

// append the svg object to the body of the page
// appends a 'group' element to 'svg'
// moves the 'group' element to the top left margin
var svg = d3.select(".orgChartArea").append("svg")
  .attr("width", width + margin.right + margin.left)
  .attr("height", height + margin.top + margin.bottom)
  .call(zoom)
  .call(responsivefy)
  .append("g")
  .attr("transform", "translate(" +
    margin.left + "," + margin.top + ")");

var iNode = 0,
  duration = 750,
  root;

// Create the svg:defs element
var svgDefs = svg.append('defs');

// define a gradient for role 1
var role1Gradient = svgDefs.append('linearGradient')
    .attr('id', 'role1Gradient');
role1Gradient.append('stop')
    .attr('class', 'stop-left')
    .attr('offset', '0.15');
role1Gradient.append('stop')
    .attr('class', 'stop-right')
    .attr('offset', '1');

// define a gradient for role 2
var role2Gradient = svgDefs.append('linearGradient')
    .attr('id', 'role2Gradient');
role2Gradient.append('stop')
    .attr('class', 'stop-left')
    .attr('offset', '0.15');
role2Gradient.append('stop')
    .attr('class', 'stop-right')
    .attr('offset', '1');


// Define the divs for the tooltips
const tooltipTree = d3.select("body").append("div")
  .attr("class", "tooltip tooltipTree");
const tooltipEmp = d3.select("body").append("div")
  .attr("class", "tooltip tooltipEmp");
const tooltipAnc = d3.select("body").append("div")
  .attr("class", "tooltip tooltipAnc");


// declares a tree layout and assigns the size
var treemap = d3.tree().size([height, width]);


// define the color of each individual node based on role and status (FTE/ETW)
function colorCircle(dataArray) {
  if (dataArray.title.includes(rolename1)) {
    if (dataArray.display_name.includes(etwText)) {
      return color1B
    } else {
      return color1A
    }
  } else if (dataArray.title.includes(rolename2)) {
    if (dataArray.display_name.includes(etwText)) {
      return color2B
    } else {
      return color2A
    }
  } else {
    if (dataArray.display_name.includes(etwText)) {
      return color3B
    } else {
      return color3A
    }
  }
}

// define the radius of the "child" circles that show up around parent nodes
function childCircleRadius(childCount) {
  if (childCount < 9) { return 2.2 }
  else if (childCount < 20) { return 1.6 }
  else { return 1.4 }
}




// read in a 'flattened' json file (one object per node)
function renderTree(myCallback) {d3.json(treeFile).then(function(flatData) {

  // call an initial zoom event to move the graph into view (without this, JD's name gets cut off)
  svg.call(zoom.transform,d3.zoomIdentity.scale(1).translate(initialOffsetX,initialOffsetY));

  // create a hierarchical json file
  root = d3.stratify()
    .id(d => d.user_ntid)
    .parentId(d => d.manager_ntid)
    (flatData);

  // define the initial placement of the root
  root.x0 = height * heightScale;  // no idea why 2.25 works better than 2 here
  root.y0 = 0;



  // --------------------------------------------------------------------------------------
  // BEFORE collapsing the nodes, run some calculations to help identify relevant teams
  // --------------------------------------------------------------------------------------
  let teamLeaders = [];
  let role12Titles = {};

  // this line makes it so that the root node re-renders after entering new search terms
  root.id = iNode ++;
  root.each(function(d) {
    // this line makes it so that the tree re-renders appropriately when entering new search terms
    d.id = iNode ++;

    // add some auxiliary data to each node
    d.data.teamSize = d.descendants().length;  // includes parent/leader
    d.data.fteCount = 0;                       // includes parent/leader
    d.data.role12Nodes = [];                   // does NOT include parent/leader
    d.data.role1CountLead = 0;                 // includes parent/leader
    d.data.role2CountLead = 0;                 // includes parent/leader
    d.data.role1FteCount = 0;                  // includes parent/leader
    d.data.role2FteCount = 0;                  // includes parent/leader
    d.descendants().forEach(function(desc){
      const descIsFTE = (desc.data.display_name.includes(etwText) ? false : true);
      if (descIsFTE) {d.data.fteCount++};
      if (descIsFTE && desc.data.title.includes(rolename1)) {d.data.role1FteCount++};
      if (descIsFTE && desc.data.title.includes(rolename2)) {d.data.role2FteCount++};
      if (desc.data.title.includes(rolename1)) {d.data.role1CountLead++};
      if (desc.data.title.includes(rolename2)) {d.data.role2CountLead++};
      if (d === desc) {return} // the remaining counts shouldn't include the parent/leader
      if (desc.data.title.includes(rolename1) || desc.data.title.includes(rolename2)) {
        d.data.role12Nodes.push(desc);
      };
    });

    const thisTitle = d.data.title.replace(".","");
    const empIsFTE = (d.data.display_name.includes(etwText) ? false : true)
    if (thisTitle.includes(rolename1) || thisTitle.includes(rolename2)) {

      // record titles of FTEs
      if (empIsFTE) {
        if (thisTitle in role12Titles) { role12Titles[thisTitle]++ }
        else { role12Titles[thisTitle] = 1 }
      }

      const leaders = d.ancestors();
      const leaderCount = leaders.length;
      for (var k = 0; k < leaderCount; k++) {  // for some reason this doesn't work as a "forEach" loop
        // if we already captured one of their leaders, skip to the next employee
        if (teamLeaders.includes(leaders[k])) { return }
      }

      let lastTeamCount = 0;
      let leaderFound = false;
      leaders.forEach(function(thisLeader, iLead) {
        if (leaderFound) { return }
        teamCount = thisLeader.descendants().length;
        //console.log(thisLeader.data.display_name,"teamCount:",teamCount);
        if (teamCount > idealTeamSize) {  // once we get a team size larger than idealTeamSize, it's time to compare
          let identifiedLeader;
          let identifiedTeamCount;
          const lastTeamProx = Math.abs(lastTeamCount/idealTeamSize - idealTeamSize/lastTeamCount);
          const teamProx = Math.abs(teamCount/idealTeamSize - idealTeamSize/teamCount);

          if (teamProx < lastTeamProx) {
            if (!teamLeaders.includes(thisLeader) && !teamLeaders.includes(thisLeader.parent)){
              identifiedLeader = thisLeader;
              identifiedTeamCount = teamCount;
            }
          } else {
            if (!teamLeaders.includes(leaders[iLead-1]) && !teamLeaders.includes(leaders[iLead-1].parent)){
              identifiedLeader = leaders[iLead-1];
              identifiedTeamCount = lastTeamCount;
            }
          }

          if (thisLeader.depth <= 1 || thisLeader.height >= 5 || thisLeader.data.teamSize > idealTeamSize*6 ) {
            identifiedLeader = leaders[iLead-1];
            identifiedTeamCount = lastTeamCount;
            //console.log("not this leader",thisLeader.data.display_name);
          }

          leaderFound = true;
          if (identifiedLeader) { // now that we've found a new leader, let's add some additional data
            teamLeaders.push(identifiedLeader);
            identifiedLeader.data.teamSize = identifiedTeamCount;

            let ancestry = "";
            identifiedLeader.ancestors().forEach(function(fancyLeader) {
              ancestry = fancyLeader.data.display_name+ " > "+ancestry;
            })

            // calculate how many role1 and role2 titles are under the identified leader
            let role1s = [];
            let role2s = [];
            let vpCount = 0;
            let srdrCount = 0;
            let ebandCount = 0;
            identifiedLeader.descendants().forEach(function(thisEmp) {
              const thisTitle = thisEmp.data.title;
              if (thisTitle.includes(rolename1)) { role1s.push(thisEmp) };
              if (thisTitle.includes(rolename2)) { role2s.push(thisEmp) };
              if (thisTitle.includes("VP ")) {vpCount++};
              if (thisTitle.includes("SENIOR DIRECTOR")) {srdrCount++};
              if (thisTitle.includes("SR DIR")) {srdrCount++};
              if (thisTitle.includes("PRINCIPAL")) {ebandCount++};
              if (thisTitle.includes("DIR")) {ebandCount++};
            })
            identifiedLeader.data.role1s = role1s.sort(emp => (emp.data.display_name.includes(etwText) ? 1 : -1));
            identifiedLeader.data.role2s = role2s.sort(emp => (emp.data.display_name.includes(etwText) ? 1 : -1));
            identifiedLeader.data.vpCount = vpCount;
            identifiedLeader.data.srdrCount = srdrCount;
            identifiedLeader.data.ebandCount = ebandCount;
            identifiedLeader.data.ftePercent = Math.round(1000*identifiedLeader.data.fteCount/identifiedTeamCount)/1000;
            identifiedLeader.data.ancestry = ancestry.slice(0,-3);
          };

        } else {
          lastTeamCount = teamCount;
        }
      })
      // } // end of loop over teamLeaders


    }  // end of looping over role 1 / role 2
  }); // end of root.each
  console.log("teamLeaders:");
  console.log(teamLeaders);
  role12Titles = Object.entries(role12Titles).sort(function(titlePairA,titlePairB){return titlePairB[1] - titlePairA[1]});
  console.log(role12Titles);
  var endTime = new Date();
  console.log(endTime-startTime,"elapsed milliseconds");

  teamLeaders.sort(function(a, b){
    return b.data.role1CountLead + b.data.role2CountLead
      - (a.data.role1CountLead + a.data.role2CountLead)
  });

  // get rid of any team leaders with too few roles of interest (also limit to 30)
  teamLeaders = teamLeaders.filter(leader =>
    (leader.data.role1CountLead + leader.data.role2CountLead) > 2
  ).slice(0,30);



  // --------------------------------------------------------------------------------------
  // RENDER THE ORG CHART TREE
  // --------------------------------------------------------------------------------------

  // collapse after the second level
  root.children.forEach(collapse);

  update(root);

  // collapse the node and all its children
  function collapse(d) {
    if (d.children) {
      d._children = d.children
      d._children.forEach(collapse)
      d.children = null
    }
  }

  function update(source) {
    // Compute the new height, function counts total children of root node and sets tree height accordingly.
    // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
    // This makes the layout more consistent.
    var levelWidth = [1];
    var childCount = function(level, n) {

      if (n.children && n.children.length > 0) {
        if (levelWidth.length <= level + 1) levelWidth.push(0);

        levelWidth[level + 1] += n.children.length;
        n.children.forEach(function(d) {
          childCount(level + 1, d);
        });
      }
    };
    childCount(0, root);
    var newHeight = d3.max(levelWidth) * 38; // 38 pixels per line
    treemap = treemap.size([newHeight, width]);


    // assigns the x and y position for the nodes
    var treeData = treemap(root);

    // compute the new tree layout
    var nodes = treeData.descendants(),
      links = treeData.descendants().slice(1);

    // normalize for fixed-depth
    nodes.forEach(function(d) {
      d.y = d.depth * 210
    });


    // ****************** Nodes section ***************************

    // update the nodes...
    var node = svg.selectAll('g.node')
      .data(nodes, d => d.id || (d.id = ++iNode));

    // enter any new nodes at the parent's previous position
    var nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr("transform", d => "translate(" + source.y0 + "," + source.x0 + ")")
      .on('click', click);

    // add "ghost" circle to increase clickable area (idea from Rob Schmuecker)
    nodeEnter.append('circle')
      .attr('class', 'ghostCircle')
      .attr('r', 1e-6)
      .style("opacity", 0);

    // add circle for each node
    nodeEnter.append('circle')
      .attr('class', 'node')
      .attr('r', 1e-6)
      .style("fill", d => colorCircle(d.data));

    // add circles to each node that has children matching role1 or role2
    // there CERTAINLY is a better/cleaner way to do this, I just haven't found it yet
    nodeEnter.append("g")
      .attr('fill', function(d, i) {
        if (d._children || d.children) {

          // create a list of colors for the child "easter egg" nodes
          let myColorList = [];
          d.data.role12Nodes.forEach(function(thisNode){
            myColorList.push(colorCircle(thisNode.data))
          });
          myColorList.sort((a,b) => colorOrder[a] - colorOrder[b]);
          // this "shift" allows the circles to lay better when there are a lot of them (in most cases)
          myColorList = shift(myColorList,-1,Math.ceil(myColorList.length/12));

          // populate one entry in indexData for each role1 and role2 identified
          var indexData = Array.from({length: d.data.role12Nodes.length}, (_, i) => i);  // [0,1,2,...]

          var childrenCircles = d3.select(this).selectAll(".childrenCircle")
            .data(indexData)
            .join("g");
          childrenCircles.append("circle")
            .style("fill", (d,i) => myColorList[i])
            .attr("cx", (d,i) => 8* Math.cos( 2*Math.PI * i  / indexData.length ) )
            .attr("cy", (d,i) => 8* Math.sin( 2*Math.PI * i  / indexData.length ) )
            .attr("r", childCircleRadius(indexData.length));
        }
        return "black";
      })

    // Add labels for the nodes
    nodeEnter.append('text')
      .attr("dy", ".35em")
      .attr("x", d => d.children || d._children ? -13 : 13)
      .attr("text-anchor", d => d.children || d._children ? "end" : "start")
      .text(d => d.data.display_name.substring(0,20));


    // UPDATE
    var nodeUpdate = nodeEnter.merge(node);

    // Transition to the proper position for the node
    nodeUpdate.transition()
      .duration(duration)
      .attr("transform", d => "translate(" + d.y + "," + d.x + ")");

    // Update the node attributes and style
    nodeUpdate.select('circle.ghostCircle')
      .attr('r', 15);

    // Update the node attributes and style
    nodeUpdate.select('circle.node')
      .attr('r', 5)
      .style("fill", d => colorCircle(d.data))
      .attr('cursor', 'pointer')

      // tooltip
      .on("mouseover", function(event,d) {
        tooltipTree.transition()
          .duration(200)
          .style("opacity", .9);
        tooltipTree.html(d.data.title+(d.data.teamSize > 1 ? "<br>Team Size: "+d.data.teamSize : ""))
          .style("left", (event.pageX + 6) + "px")
          .style("top", (event.pageY - 12) + "px");
      })
      .on("mouseout", function(d) {
        tooltipTree.transition()
         .duration(500)
         .style("opacity", 0);
      });


    // Remove any exiting nodes
    var nodeExit = node.exit().transition()
      .duration(duration)
      .attr("transform", d => "translate(" + source.y + "," + source.x + ")")
      .remove();

    // On exit reduce the node circles size to 0
    nodeExit.select('circle')
      .attr('r', 1e-6);

    // On exit reduce the opacity of text labels
    nodeExit.select('text')
      .style('fill-opacity', 1e-6);


    // ****************** links section ***************************

    // Update the links...
    var link = svg.selectAll('path.link')
      .data(links, d => d.id);

    // Enter any new links at the parent's previous position.
    var linkEnter = link.enter().insert('path', "g")
      .attr("class", "link")
      .attr('d', function(d) {
        var o = {
          x: source.x0,
          y: source.y0
        }
        return diagonal(o, o)
      });

    // UPDATE
    var linkUpdate = linkEnter.merge(link);

    // Transition back to the parent element position
    linkUpdate.transition()
      .duration(duration)
      .attr('d', d => diagonal(d, d.parent));

    // Remove any exiting links
    var linkExit = link.exit().transition()
      .duration(duration)
      .attr('d', function(d) {
        var o = {
          x: source.x,
          y: source.y
        }
        return diagonal(o, o)
      })
      .remove();

    // Store the old positions for transition.
    nodes.forEach(function(d) {
      d.x0 = d.x;
      d.y0 = d.y;
    });

    // creates a curved (diagonal) path from parent to the child nodes
    function diagonal(s, d) {
      path = `M ${s.y} ${s.x} C ${(s.y + d.y) / 2} ${s.x}, ${(s.y + d.y) / 2} ${d.x}, ${d.y} ${d.x}`
      return path
    }

    // toggle children on click
    function click(event, d) {
      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
      update(d);
    }

  }


  // --------------------------------------------------------------------------------------
  // CREATE ROLE SUMMARY
  // --------------------------------------------------------------------------------------

  // clear contents from roleGraph divs
  d3.select(".roleGraph.role1").html("");
  d3.select(".roleGraph.role2").html("");
  d3.select(".roleGraph.titles").html("");

  // initiate svgs for each section
  const role1Svg = d3.select(".roleGraph.role1").attr("id", "role1Svg")
    .append("svg")
    .attr("width", 200)
    .attr("height", 110)
    .call(responsivefy,maxWidth=460);
  const role2Svg = d3.select(".roleGraph.role2").attr("id", "role2Svg")
    .append("svg")
    .attr("width", 200)
    .attr("height", 110)
    .call(responsivefy,maxWidth=460);
  const roleTitleSvg = d3.select(".roleGraph.titles").attr("id", "roleTitleSvg")
    .append("svg")
    .attr("width", 200)
    .attr("height", 110)
    .call(responsivefy,maxWidth=460);

  // add labels to the role summaries
  role1Svg.append("text")
    .text(root.data.role1CountLead)
    .attr("class","roleCountLg");
  role2Svg.append("text")
    .text(root.data.role2CountLead)
    .attr("class","roleCountLg");
  role1Svg.append("text")
    .text(rolename1 +" roles")
    .attr("class","roleCountDesc");
  role1Svg.append("text")
    .text("in the organization")
    .attr("class","roleCountDesc next");
  role2Svg.append("text")
    .text(rolename2 +" roles")
    .attr("class","roleCountDesc");
  role2Svg.append("text")
    .text("in the organization")
    .attr("class","roleCountDesc next");

  // add donut chart to represent FTE % for role 1
  const pieDataRole1 = [root.data.role1FteCount,root.data.role1CountLead-root.data.role1FteCount];
  const arcs1 = role1Svg.selectAll("arc")
    .data(pie(pieDataRole1))
    .join("g")
    .attr("transform", "translate(143,53)");
  arcs1.append("path")
    .attr("class", (data, i) => i===0 ? "role1 fte" : "role1 etw")
    .attr("d", d3.arc().innerRadius(21).outerRadius(28));

  // label the donut chart
  arcs1.append("text")
    .text(function() {
      if (root.data.role1CountLead === 0) {return ""}
      else {return Math.round(100*(root.data.role1FteCount/root.data.role1CountLead))+"%"}
    })
    .attr("class","roleFtePct")
    .attr("text-anchor", "middle")
    .attr("dy",2)
    .append('svg:tspan')
    .text(root.data.role1CountLead === 0 ? "" : "FTE")
    .attr("class","teamFteLabel")
    .attr('x', 0)
    .attr('dy', 11);

  // add donut chart to represent FTE % for role 2
  const pieDataRole2 = [root.data.role2FteCount,root.data.role2CountLead-root.data.role2FteCount];
  const arcs2 = role2Svg.selectAll("arc")
    .data(pie(pieDataRole2))
    .join("g")
    .attr("transform", "translate(143,53)");
  arcs2.append("path")
    .attr("class", (data, i) => i===0 ? "role2 fte" : "role2 etw")
    .attr("d", d3.arc().innerRadius(21).outerRadius(28));

  // label the donut chart
  arcs2.append("text")
    .text(function() {
      if (root.data.role2CountLead === 0) {return ""}
      else {return Math.round(100*(root.data.role2FteCount/root.data.role2CountLead))+"%"}
    })
    .attr("class","roleFtePct")
    .attr("text-anchor", "middle")
    .attr("dy",2)
    .append('svg:tspan')
    .text(root.data.role2CountLead === 0 ? "" : "FTE")
    .attr("class","teamFteLabel")
    .attr('x', 0)
    .attr('dy', 11);



  // create a bar chart of top job titles
  var barMargin = {top: 20, right: 10, bottom: 8, left: 10};
  barSvg = roleTitleSvg.append("g")
    .attr("transform", "translate(" + barMargin.left + "," + barMargin.top + ")");

  // Add X axis
  var x = d3.scaleLinear()
    .domain([0, d3.max(role12Titles.slice(0, 8),d=>d[1])])
    .range([ 0, 200 - barMargin.left - barMargin.right]);

  // Y axis
  var y = d3.scaleBand()
    .range([ 0, 110 - barMargin.top - barMargin.bottom ])
    .domain(role12Titles.slice(0, 8).map(d => d[0] ))
    .padding(.25);

  // background bars
  barSvg.selectAll("rect")
    .data(role12Titles.slice(0, 8))
    .join("rect")
    .attr("x", x(0) )
    .attr("y", d => y(d[0]) )
    .attr("width", 200 - barMargin.left - barMargin.right)
    .attr("height", y.bandwidth() )
    .attr("fill","#EEE");

  //Bars
  barSvg.selectAll("rect.dt")
    .data(role12Titles.slice(0, 8))
    .join("rect")
    .attr("x", x(0) )
    .attr("y", d => y(d[0]) )
    .attr("width", d => x(d[1]) )
    .attr("height", y.bandwidth() )
    .attr("class", d=> ( d[0].includes(rolename1) ? "dt role1 fte" : "dt role2 fte" ));

  // add job titles to the bars
  barSvg.selectAll("text")
    .data(role12Titles.slice(0, 8))
    .join("text")
    .text(d=> d[0] + "  -  ("+d[1]+")")
    .attr("x", 2)
    .attr("y", d => y(d[0])+6 );

  roleTitleSvg.append("text")
    .attr("class","barTitle")
    .text("TOP JOB TITLES (FTE)");



  // --------------------------------------------------------------------------------------
  // CREATE INDIVIDUAL TEAM CARDS
  // --------------------------------------------------------------------------------------

  // clear contents from team cards section
  d3.select(".teamCards .row.teams").html("");

  // initiate the individual team cards
  d3.select(".teamCards .row.teams").selectAll("div.teamCard")
    .data(teamLeaders)
    .join("div")
      .attr("class","col-xl-4 col-md-6 teamCard")
      .append("div")
        .attr("class",d=>"d-flex flex-column align-items-start justify-content-between block "+d.data.user_ntid)
        .attr("id",d=>"teamGraphs-"+d.data.user_ntid);


  // Add content to the individual team cards
  teamLeaders.forEach(function(thisLeader) {
    const thisTeamCard = d3.select("."+thisLeader.data.user_ntid);
    const rowCount = 20;

    // add leader name
    thisTeamCard.append("h5")
      .text(thisLeader.data.display_name);

    thisTeamCard.append("h5")
      .text(thisLeader.data.title)
      .attr("class","titleText");

    // add an svg so we can add shapes
    const teamSvg = thisTeamCard.append("svg")
      .attr("width", 215)
      .attr("height", 95)
      .attr("class", "teamGraphs "+thisLeader.data.user_ntid )
      .call(responsivefy,maxWidth=400);

    // create an invisible rectangle to enable a tooltip for the leader name;
    teamSvg.append("rect")
      .attr("x", 0 )
      .attr("y", 0 )
      .attr("width", 150)
      .attr("height", 18 )
      .attr("fill","#eee")
      .attr("opacity",0)

      // tooltip
      .on("mouseover", function(event,d) {
        tooltipAnc.transition()
          .duration(200)
          .style("opacity", 0.9);
        tooltipAnc.html(thisLeader.data.ancestry)
          .style("left", (event.pageX + 6) + "px")
          .style("top", (event.pageY - 12) + "px");
      })
      .on("mouseout", function(d) {
        tooltipAnc.transition()
         .duration(500)
         .style("opacity", 0);
      });;




    const spacer = 33;

    // add headers for the subsections
    const subSectionHeaders = teamSvg.append("text")
      .text("TEAM TOTAL")
      .attr("class","teamHeaders")
      .attr("text-anchor", "start")
      .attr("transform", "translate(159,5)")
    if (thisLeader.data.role1CountLead > 0) {
      subSectionHeaders.append('svg:tspan')
      .text(rolename1)
      .attr("x",0).attr("dy", spacer);
    }
    if (thisLeader.data.role2CountLead > 0) {
      subSectionHeaders.append('svg:tspan')
      .text(rolename2)
      .attr("x",0).attr("dy", spacer);
    }

    // add team/role counts
    const empCounts = teamSvg.append("text")
      .text(thisLeader.data.teamSize)
      .attr("class","empCounts")
      .attr("text-anchor", "start")
      .attr("transform", "translate(159,23)")
    if (thisLeader.data.role1CountLead > 0) {
      empCounts.append('svg:tspan')
      .text(thisLeader.data.role1CountLead)
      .attr("class", "role1")
      .attr("x",0).attr("dy", spacer);
    }
    if (thisLeader.data.role2CountLead > 0) {
      empCounts.append('svg:tspan')
      .text(thisLeader.data.role2CountLead)
      .attr("class", "role2")
      .attr("x",0).attr("dy", spacer);
    }


    // add donut chart for team total
    const pieDataT = [thisLeader.data.ftePercent,1-thisLeader.data.ftePercent];
    const arcsT = teamSvg.selectAll("arc")
      .data(pie(pieDataT))
      .join("g")
      .attr("transform", "translate(196,17.5)");
    arcsT.append("path")
      .attr("fill", (data, i) => i===0 ? color3A : color3C)
      .attr("d", d3.arc().innerRadius(6).outerRadius(9.8));
    // label the donut chart
    arcsT.append("text")
      .text(Math.round(100*thisLeader.data.ftePercent)+"%")
      .attr("class","teamFte")
      .attr("text-anchor", "middle")
      .attr("dy",1.1)
      .append('svg:tspan')
      .text("FTE")
      .attr("class","teamFteLabel")
      .attr('x', 0)
      .attr('dy', 6);

    // add donut chart for role1
    if (thisLeader.data.role1CountLead > 0) {
      const pieData1 = [thisLeader.data.role1FteCount,thisLeader.data.role1CountLead - thisLeader.data.role1FteCount];
      const arcs1 = teamSvg.selectAll("arc")
        .data(pie(pieData1))
        .join("g")
        .attr("transform", `translate(196,${17.5+spacer})`);
      arcs1.append("path")
        .attr("class", (data, i) => i===0 ? "role1 fte" : "role1 etw")
        .attr("d", d3.arc().innerRadius(5.8).outerRadius(9.8));
      // label the donut chart
      arcs1.append("text")
        .text(Math.round(100*(thisLeader.data.role1FteCount/thisLeader.data.role1CountLead))+"%")
        .attr("class","teamFte")
        .attr("text-anchor", "middle")
        .attr("dy",1.1)
        .append('svg:tspan')
        .text("FTE")
        .attr("class","teamFteLabel")
        .attr('x', 0)
        .attr('dy', 6);
    }

    // add donut chart for role2
    const spacer2 = (thisLeader.data.role1CountLead > 0 ? spacer*2 : spacer);
    if (thisLeader.data.role2CountLead > 0) {
      const pieData2 = [thisLeader.data.role2FteCount,thisLeader.data.role2CountLead - thisLeader.data.role2FteCount];
      const arcs2 = teamSvg.selectAll("arc")
        .data(pie(pieData2))
        .join("g")
        .attr("transform", `translate(196,${17.5+spacer2})`);
      arcs2.append("path")
        .attr("class", (data, i) => i===0 ? "role2 fte" : "role2 etw")
        .attr("d", d3.arc().innerRadius(5.8).outerRadius(9.8));
      // label the donut chart
      arcs2.append("text")
        .text(Math.round(100*(thisLeader.data.role2FteCount/thisLeader.data.role2CountLead))+"%")
        .attr("class","teamFte")
        .attr("text-anchor", "middle")
        .attr("dy",1.1)
        .append('svg:tspan')
        .text("FTE")
        .attr("class","teamFteLabel")
        .attr('x', 0)
        .attr('dy', 6);
    }




    var circleGroup = teamSvg.append("g").attr("class","empCircles")

    // add a circle for each employee of role 1
    circleGroup.selectAll("circle .role1.emp")
      .data(thisLeader.data.role1s)
      .join("circle")
        .attr("cx", (d,iRole) => 8+(iRole*7.2)%(rowCount*7.2))
        .attr("cy", (d,iRole) => 30 + 8.5*Math.floor(iRole/rowCount))
        .attr("r", 2.8)
        .attr("class",d=> ( d.data.display_name.includes(etwText) ? "role1 etw" : "role1 fte" ))
        .on("mouseover", function(event,d) {
          tooltipEmp.transition()
            .duration(200)
            .style("opacity", .9);
          tooltipEmp.html("<span class='empName'>"+d.data.display_name+
            "</span><br><span class='titleText'>"+d.data.title+"</span>")
            .style("left", (event.pageX + 6) + "px")
            .style("top", (event.pageY - 12) + "px");
        })
        .on("mouseout", function(d) {
          tooltipEmp.transition()
            .duration(500)
            .style("opacity", 0);
        });

    // add a circle for each employee of role 2
    circleGroup.selectAll("circle .role2.emp")
      .data(thisLeader.data.role2s)
      .join("circle")
        .attr("cx", (d,iRole) => 8+(iRole*7.2)%(rowCount*7.2))
        .attr("cy", (d,iRole) => 30 + (thisLeader.data.role1CountLead>0 ? 13 + 8.5*Math.floor(thisLeader.data.role1CountLead/rowCount) : 0) + 8.5*Math.floor(iRole/rowCount) )
        .attr("r", 2.8)
        .attr("class",d=> ( d.data.display_name.includes(etwText) ? "role2 etw" : "role2 fte" ))
        .on("mouseover", function(event,d) {
          tooltipEmp.transition()
            .duration(200)
            .style("opacity", .9);
          tooltipEmp.html("<span class='empName'>"+d.data.display_name+
            "</span><br><span class='titleText'>"+d.data.title+"</span>")
            .style("left", (event.pageX + 6) + "px")
            .style("top", (event.pageY - 12) + "px");
        })
        .on("mouseout", function(d) {
          tooltipEmp.transition()
            .duration(500)
            .style("opacity", 0);
        });



  });  // end of team cards section

  myCallback();

})};  // renderTree()
window.setTimeout(renderTree(setIsotope), animationDelay);



// add input range slider for ideal team size
// code for slider originally from Sean Stopnik  https://css-tricks.com/value-bubbles-for-range-inputs/
var rangeSlider = function(){
  var slider = $('.range-slider'),
      range = $('.range-slider__range'),
      value = $('.range-slider__value');

  slider.each(function(){

    value.each(function(){
      var value = $(this).prev().attr('value');
      $(this).html(value);
    });

    range.on('input', function(){
      $(this).next(value).html(this.value);
    });
  });
};

rangeSlider();



// create color legend
legendColorSvg = d3.select(".legendDraw").append("svg")
  .attr("width", 150)
  .attr("height", 85)
  .call(responsivefy)
  .append("g");
legendColorSvg.append("text")
  .attr("x",10).attr("y",15).attr("class","legendText")
  .text("FTE");
legendColorSvg.append("text")
  .attr("x",31).attr("y",15).attr("class","legendText")
  .text(etwText.substring(1, 4));
legendColorSvg.append("text")
  .attr("x",46).attr("y",30).attr("dy",3).attr("class","legendTextRole")
  .text(rolename1);
legendColorSvg.append("text")
  .attr("x",46).attr("y",50).attr("dy",3).attr("class","legendTextRole")
  .text(rolename2);
legendColorSvg.append("text")
  .attr("x",46).attr("y",70).attr("dy",3).attr("class","legendTextRole")
  .text("OTHER");
legendColorSvg.append("circle")
  .attr("cx",10).attr("cy",30).attr("r",7).attr("class","role1 fte");
legendColorSvg.append("circle")
  .attr("cx",10).attr("cy",50).attr("r",7).attr("class","role2 fte");
legendColorSvg.append("circle")
  .attr("cx",10).attr("cy",70).attr("r",7).attr("class","roleOther fte");
legendColorSvg.append("circle")
  .attr("cx",31).attr("cy",30).attr("r",7).attr("class","role1 etw");
legendColorSvg.append("circle")
  .attr("cx",31).attr("cy",50).attr("r",7).attr("class","role2 etw");
legendColorSvg.append("circle")
  .attr("cx",31).attr("cy",70).attr("r",7).attr("class","roleOther etw");


// add click event to show legend overlay
var item = document.getElementById("infoIcon");
var infoState = "hide";
item.addEventListener("click", showHide, false);
function show() {d3.select(".legendPop").style("opacity",1)}
function hide() {d3.select(".legendPop").style("opacity",0)}
function showHide() {
  if (infoState === "hide") {
    infoState = "show";
    show();
  } else {
    infoState = "hide";
    hide();
  }
}

// Define the div for a tooltip for the information button
const divInfo = d3.select("body").append("div")
  .attr("class", "tooltip tooltipInfo")
  .style("opacity", 0);

// add tooltip to info button
document.addEventListener("mouseover", function(event){
  if (!event.target.closest("#infoIcon")) return;
  divInfo.transition()
   .duration(200)
   .style("opacity", .8)
   .delay(200);
  divInfo.html("See how to read this viz")
   .style("left", (event.pageX - 65) + "px")
   .style("top", (event.pageY + 35) + "px");
})

document.addEventListener("mouseout", function(event){
  if (!event.target.closest("#infoIcon")) return;
  divInfo.transition()
    .duration(500)
    .style("opacity", 0);
})
