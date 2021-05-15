
// started this code with a basic collapsible tree diagram from "d3noob" (https://github.com/d3noob)
// example pulled from: https://blockbuilder.org/d3noob/9de0768412ac2ce5dbec430bb1370efe

// pulled in a snippet from Rob Schmuecker's example to enable auto-sizing the height of the tree
// http://bl.ocks.org/robschmuecker/7880033


var startTime = new Date();

var treeFile = "DMOrgChart.json";

var initialOffsetX = 120,
  initialOffsetY = 0,
  etwText = "(ETW";

// change the things that are specific to the dummy org chart data
if (treeFile === "DMOrgChart.json") {
  initialOffsetX = 90;
  initialOffsetY = 45;
  inputRole1 = document.querySelector(".inputRole1");
  inputRole1.value = "ACTUARY";
  inputRole2 = document.querySelector(".inputRole2");
  inputRole2.value = "COUNSEL";
  etwText = "ER";
}

// may get rid of this function at some point - keeping it here for later use
drag = simulation => {

  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
}


function range(start, end) {
    var ans = [];
    for (let i = start; i <= end; i++) {
        ans.push(i);
    }
    return ans;
}

// Creating Pie generator
var pie = d3.pie();

// Creating arc
var arc = d3.arc()
  .innerRadius(14)
  .outerRadius(18);


// this function makes our svg responsive to the size of the container/screen!
// initial version provided by Ben Clinkinbeard and Brendan Sudol
function responsivefy(thisSvg,maxWidth=4000) {
  // container will be the DOM element that the svg is appended to
  // we then measure the container and find its aspect ratio
  const container = d3.select(thisSvg.node().parentNode),
    width = parseInt(thisSvg.style('width'), 10),
    height = parseInt(thisSvg.style('height'), 10),
    aspect = width / height;

  // set viewBox attribute to the initial size control scaling without
  // preserveAspectRatio
  // resize svg on inital page load
  thisSvg.attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMinYMid')
    .call(resize);

  // add a listener so the chart will be resized when the window resizes
  // multiple listeners for the same event type requires a namespace, i.e.,
  // 'click.foo'
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
    const w = Math.min(maxWidth,parseInt(container.style('width')));
    thisSvg.attr('width', w);
    thisSvg.attr('height', Math.round(w / aspect));
  }
}



var rolename1 = document.getElementsByName("rolename1")[0].value.toUpperCase();
var rolename2 = document.getElementsByName("rolename2")[0].value.toUpperCase();

function formChanged() {
  rolename1 = document.getElementsByName("rolename1")[0].value.toUpperCase();
  rolename2 = document.getElementsByName("rolename2")[0].value.toUpperCase();
  rolename1 = (rolename1 === "" ? "sdjkadjskladsds" : rolename1);
  rolename2 = (rolename2 === "" ? "sdjkadjskladsds" : rolename2);
  console.log("form changed",rolename1,rolename2);
  renderTree();
}

// shift the contents of an array by n
function shift(arr, direction, n) {
  var times = n > arr.length ? n % arr.length : n;
  return arr.concat(arr.splice(0, (direction > 0 ? arr.length - times : times)));
}

// Set the dimensions and margins of the diagram
var margin = {
    top: 20,
    right: 80,
    bottom: 20,
    left: 80
  },
  width = 1060 - margin.left - margin.right,
  height = 600 - margin.top - margin.bottom;

// initiate the zoom
var zoom = d3.zoom().on("zoom", function(event) {
  svg.attr("transform", event.transform)
});

// append the svg object to the body of the page
// appends a 'group' element to 'svg'
// moves the 'group' element to the top left margin
var svg = d3.select(".org").append("svg")
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

// Define the divs for the tooltips
const tooltipTree = d3.select("body").append("div")
  .attr("class", "tooltip tooltipTree")
  .style("opacity", 0);

const tooltipEmp = d3.select("body").append("div")
  .attr("class", "tooltip tooltipEmp")
  .style("opacity", 0);


// declares a tree layout and assigns the size
var treemap = d3.tree().size([height, width]);


// define the color of each individual node based on role and status (FTE/ETW)
function colorCircle(dataArray) {
  if (dataArray.title.includes(rolename1)) {
    if (dataArray.display_name.includes(etwText)) {
      return "#B4C2F1"  // #B4C2F1   #AFE3D5
    } else {
      return "#4C70D6"  // #4C70D6   #70D0B9
    }
  } else if (dataArray.title.includes(rolename2)) {
    if (dataArray.display_name.includes(etwText)) {
      return "#FFDBAE"  // #FFDBAE   #FFBEAC
    } else {
      return "#FDA943"  // #FDA943   #FF9473
    }
  } else {
    if (dataArray.display_name.includes(etwText)) {
      return "#CCC"
    } else {
      return "#999"
    }
  }
}

// define the radius of the "child" circles that show up around parent nodes
function childCircleRadius(childCount) {
  if (childCount < 9) {
    return 2.2
  } else if (childCount < 20) {
    return 1.6
  } else {
    return 1.4
  }
}


// initiate an array to stash the root into (for later use)
var globalRootKeeper = {"root":''};



function renderForceTree() { d3.json(treeFile).then( function(flatData) {
  // chart = {
    var forceData = d3.stratify()
      .id(d => d.user_ntid)
      .parentId(d => d.manager_ntid)
      (flatData);
    const rootForce = d3.hierarchy(forceData);
    const linksForce = rootForce.links();
    const nodesForce = rootForce.descendants();

    const simulation = d3.forceSimulation(nodesForce)
        .force("link", d3.forceLink(linksForce).id(d => d.user_ntid).distance(0).strength(1))
        .force("charge", d3.forceManyBody().strength(-6))
        .force("x", d3.forceX())
        .force("y", d3.forceY());

    const svgForce = d3.select(".orgForce").append("svg")
        .attr("viewBox", [-600 / 2, -400 / 2, 600, 400]);

    const linkForce = svgForce.append("g")
        .attr("stroke", "#e5e5e5")
        .attr("stroke-opacity", 0.9)
        .attr("stroke-width",0.25)
      .selectAll("line")
      .data(linksForce)
      .join("line");

    const nodeForce = svgForce.append("g")
        .attr("fill", "#fff")
        .attr("stroke-width", 0.25)
      .selectAll("circle")
      .data(nodesForce)
      .join("circle")
        .attr("fill", d=> colorCircle(d.data))
        .attr("r", 1.2)
        .call(drag(simulation));

    nodeForce.append("title")
        .text(d => d.data.display_name);

    simulation.on("tick", () => {
      linkForce
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);

      nodeForce
          .attr("cx", d => d.x)
          .attr("cy", d => d.y);
    });

    return svgForce.node();
  })
} // end renderForceTree
// renderForceTree();


// read in a 'flattened' json file (one object per node)
function renderTree() {d3.json(treeFile).then(function(flatData) {

  // call an initial zoom event to move the graph into view (without this, JD's name gets cut off)
  svg.call(zoom.transform,d3.zoomIdentity.scale(1).translate(initialOffsetX,initialOffsetY));

  // create a hierarchical json file
  root = d3.stratify()
    .id(d => d.user_ntid)
    .parentId(d => d.manager_ntid)
    (flatData);

  // define the initial placement of the root
  root.x0 = height / 2.25;  // no idea why 2.25 works better than 2 here
  root.y0 = 0;



  // --------------------------------------------------------------------------------------
  // BEFORE collapsing the nodes, run some calculations to help identify relevant teams
  // --------------------------------------------------------------------------------------
  let teamLeaders = [];
  let role1Titles = {};
  let role2Titles = {};

  // this line makes it so that the root node re-renders after entering new search terms
  root.id = iNode ++;
  root.each(function(d) {
    // this line makes it so that the tree re-renders appropriately when entering new search terms
    d.id = iNode ++;

    // add some auxiliary data to each node
    d.data.teamSize = d.descendants().length;  // includes parent/leader
    d.data.fteCount = 0;                       // includes parent/leader
    d.data.role1Count = 0;                     // does NOT include parent/leader
    d.data.role2Count = 0;                     // does NOT include parent/leader
    d.data.role12Nodes = [];                   // does NOT include parent/leader
    d.descendants().forEach(function(desc){
      if (!desc.data.display_name.includes(etwText)) {d.data.fteCount++};
      if (d === desc) {return} // the remaining counts shouldn't include the parent/leader
      if (desc.data.title.includes(rolename1)) {d.data.role1Count++};
      if (desc.data.title.includes(rolename2)) {d.data.role2Count++};
      if (desc.data.title.includes(rolename1) || desc.data.title.includes(rolename2)) {
        d.data.role12Nodes.push(desc);
      };
    });


    const thisTitle = d.data.title.replace(".","");
    const empIsFTE = (d.data.display_name.includes(etwText) ? false : true)
    if (thisTitle.includes(rolename1) || thisTitle.includes(rolename2)) {

      // record titles of FTEs
      if (empIsFTE && thisTitle.includes(rolename1)) {
        if (thisTitle in role1Titles) {
          role1Titles[thisTitle]++;
        } else {
          role1Titles[thisTitle] = 1;
        }
      }
      if (empIsFTE && thisTitle.includes(rolename2)) {
        if (thisTitle in role2Titles) {
          role2Titles[thisTitle]++;
        } else {
          role2Titles[thisTitle] = 1;
        }
      }

      const leaders = d.ancestors();
      const leaderCount = leaders.length;
      for (var k = 0; k < leaderCount; k++) {
        // if we already captured one of their leaders, skip to the next employee
        if (teamLeaders.includes(leaders[k])) { return }
      }

      let lastTeamCount = 0;
      let leaderFound = false;
      for (var iLead = 0; iLead < leaderCount; iLead++) {
        if (leaderFound) { return }
        teamCount = leaders[iLead].descendants().length;
        console.log(leaders[iLead].data.display_name,"teamCount:",teamCount);
        if (teamCount > 35) {  // once we get a team size larger than 35, it's time to compare
          let identifiedLeader;
          let identifiedTeamCount;
          const lastTeamProx = Math.abs(lastTeamCount/35 - 35/lastTeamCount);
          const teamProx = Math.abs(teamCount/35 - 35/teamCount);

          if (teamProx < lastTeamProx) {
            if (!teamLeaders.includes(leaders[iLead]) && !teamLeaders.includes(leaders[iLead].parent)){
              identifiedLeader = leaders[iLead];
              identifiedTeamCount = teamCount;
            }
          } else {
            if (!teamLeaders.includes(leaders[iLead-1]) && !teamLeaders.includes(leaders[iLead-1].parent)){
              identifiedLeader = leaders[iLead-1];
              identifiedTeamCount = lastTeamCount;
            }
          }

          leaderFound = true;
          if (identifiedLeader) { // now that we've found a new leader, let's add some additional data
            teamLeaders.push(identifiedLeader);
            identifiedLeader.data.teamSize = identifiedTeamCount;


            // calculate how many role1 and role2 titles are under the identified leader
            let role1s = [];
            let role2s = [];
            let vpCount = 0;
            let srdrCount = 0;
            let ebandCount = 0;
            for (var j = 0; j < identifiedTeamCount; j++ ) {
              const thisEmp = identifiedLeader.descendants()[j];
              const thisTitle = thisEmp.data.title;
              if (thisTitle.includes(rolename1)) { role1s.push(thisEmp) };
              if (thisTitle.includes(rolename2)) { role2s.push(thisEmp) };
              if (thisTitle.includes("VP ")) {vpCount++};
              if (thisTitle.includes("SENIOR DIRECTOR")) {srdrCount++};
              if (thisTitle.includes("SR DIR")) {srdrCount++};
              if (thisTitle.includes("PRINCIPAL")) {ebandCount++};
              if (thisTitle.includes("DIR")) {ebandCount++};

            }
            identifiedLeader.data.role1s = role1s.sort(emp => (emp.data.display_name.includes(etwText) ? 1 : -1));
            identifiedLeader.data.role2s = role2s.sort(emp => (emp.data.display_name.includes(etwText) ? 1 : -1));
            identifiedLeader.data.vpCount = vpCount;
            identifiedLeader.data.srdrCount = srdrCount;
            identifiedLeader.data.ebandCount = ebandCount;
            identifiedLeader.data.ftePercent = Math.round(1000*identifiedLeader.data.fteCount/identifiedTeamCount)/1000;

          };

        } else {
          lastTeamCount = teamCount;
        }
      }
    }
  });
  console.log("teamLeaders:");
  console.log(teamLeaders);
  console.log(role1Titles);
  console.log(role2Titles);
  var endTime = new Date();
  console.log(endTime-startTime,"elapsed milliseconds");

  teamLeaders.sort(function(a, b){
    return b.data.role1Count + b.data.role2Count
      - (a.data.role1Count + a.data.role2Count)
  });

  // get rid of any team leaders with too few roles of interest (also limit to 30)
  teamLeaders = teamLeaders.filter(leader =>
    (leader.data.role1Count + leader.data.role2Count) > 2
  ).slice(0,30);

  // clear contents from team cards section
  d3.select(".teamCards .row").html("");

  // initiate the individual team cards
  d3.select(".teamCards .row").selectAll("div.teamCard")
    .data(teamLeaders)
    .join("div")
      .attr("class","col-12 col-md-6 col-xl-4 teamCard")
      .append("div")
        .attr("class",d=>"d-flex flex-column align-items-start justify-content-between block "+d.data.user_ntid)
        .attr("id",d=>"teamGraphs-"+d.data.user_ntid);

  // Add content to the individual team cards

  teamLeaders.forEach(function(thisLeader) {
    // const attributes = thisLeader.data;
    const roleCountTotal = thisLeader.data.role1Count + thisLeader.data.role2Count;
    console.log(thisLeader.data.display_name,"(",roleCountTotal,")");
    const thisTeamCard = d3.select("."+thisLeader.data.user_ntid);
    const rowCount = 20;

    // add leader name
    thisTeamCard.append("h5")
      .text(thisLeader.data.display_name);

    thisTeamCard.append("h5")
      .text(thisLeader.data.title)
      .attr("class","leaderTitle");

    // add an svg so we can add shapes
    const teamSvg = thisTeamCard.append("svg")
      .attr("width", 200)
      .attr("height", 90)
      .attr("class", "teamGraphs "+thisLeader.data.user_ntid )
      .call(responsivefy,maxWidth=400);

    teamSvg.append("text")
      .text("TEAM SIZE")
      .attr("class","teamSizeLabel")
      .attr("text-anchor", "middle")
      .attr("transform", "translate(25,25)")
      .append('svg:tspan')
      .text(thisLeader.data.teamSize)
      .attr("class","teamSize")
      .attr("text-anchor","middle")
      .attr("x",0)
      .attr("dy", 15)

    var pieData = [thisLeader.data.ftePercent,1-thisLeader.data.ftePercent];

    var arcs = teamSvg.selectAll("arc")
      .data(pie(pieData))
      .join("g")
      .attr("transform", "translate(25,66)");

    arcs.append("path")
      .attr("fill", (data, i) => i===0 ? "#999" : "#DDD")
      .attr("d", arc);


    arcs.append("text")
      .text(Math.round(100*thisLeader.data.ftePercent)+"%")
      .attr("class","teamFte")
      .attr("text-anchor", "middle")
      .attr("dy",-1)
      .append('svg:tspan')
      .attr('x', 0)
      .attr('dy', 8)
      .attr("class","teamFteLabel")
      .text("FTE");


    // add a circle for each employee of role 1
    thisTeamCard.select("svg").selectAll("circle .role1.emp")
      .data(thisLeader.data.role1s)
      .join("circle")
        .attr("cx", (d,iRole) => 53+(iRole*7.4)%(rowCount*7.4))
        .attr("cy", (d,iRole) => 30 + 9*Math.floor(iRole/rowCount))
        .style("fill",d=> ( d.data.display_name.includes(etwText) ? "#B4C2F1" :"#4C70D6" ))
        .attr("r", 2.9)
        .attr("class","role1 emp")
        .on("mouseover", function(event,d) {
          tooltipEmp.transition()
            .duration(200)
            .style("opacity", .9);
          tooltipEmp.html(d.data.display_name+"<br>"+d.data.title)
            .style("left", (event.pageX + 6) + "px")
            .style("top", (event.pageY - 12) + "px");
        })
        .on("mouseout", function(d) {
          tooltipEmp.transition()
            .duration(500)
            .style("opacity", 0);
        });

    // add a circle for each employee of role 2
    thisTeamCard.select("svg").selectAll("circle .role2.emp")
      .data(thisLeader.data.role2s)
      .join("circle")
        .attr("cx", (d,iRole) => 53+(iRole*7.4)%(rowCount*7.4))
        .attr("cy", (d,iRole) => 30 + (thisLeader.data.role1Count>0 ? 13 + 9*Math.floor(thisLeader.data.role1Count/rowCount) : 0) + 9*Math.floor(iRole/rowCount) )
        .style("fill",d=> ( d.data.display_name.includes(etwText) ? "#FFDBAE" :"#FDA943" ))
        .attr("r", 2.9)
        .attr("class","role2 emp")
        .on("mouseover", function(event,d) {
          tooltipEmp.transition()
            .duration(200)
            .style("opacity", .9);
          tooltipEmp.html(d.data.display_name+"<br>"+d.data.title)
            .style("left", (event.pageX + 6) + "px")
            .style("top", (event.pageY - 12) + "px");
        })
        .on("mouseout", function(d) {
          tooltipEmp.transition()
            .duration(500)
            .style("opacity", 0);
        });



  });



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
          myColorList.sort();
          // this "shift" allows the circles to lay better when there are a lot of them (in most cases)
          myColorList = shift(myColorList,1,Math.ceil(myColorList.length/12));

          // populate one entry in indexData for each role1 and role2 identified
          var indexData = Array.from({length: d.data.role1Count+d.data.role2Count}, (_, i) => i);  // [0,1,2,...]

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
      .text(d => d.data.display_name.substring(0,20))
      .style("font-weight",function(d) {
        if (treeFile === "NikeOrgChart.json"  && (d._children || d.children)) {
          if (d.data.fteCount/d.data.teamSize > 0.75) {
            return "normal" ////////////////////////// suppressing this feature for now
            return "bold"
          }
        }
        return "normal"

      })
      ;


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
        tooltipTree.html(d.data.title)
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

      path = `M ${s.y} ${s.x}
          C ${(s.y + d.y) / 2} ${s.x},
            ${(s.y + d.y) / 2} ${d.x},
            ${d.y} ${d.x}`

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


})};
renderTree()
