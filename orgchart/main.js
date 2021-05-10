// started this code with a basic collapsible tree diagram from "d3noob" (https://github.com/d3noob)
// example pulled from: https://blockbuilder.org/d3noob/9de0768412ac2ce5dbec430bb1370efe

// pulled in a snippet from Rob Schmuecker's tree to enable auto-sizing the height of the tree
// http://bl.ocks.org/robschmuecker/7880033


var startTime = new Date();

var treeFile = "DMOrgChart.json";

var initialOffsetX = 120,
  initialOffsetY = 0;

if (treeFile === "DMOrgChart.json") {
  initialOffsetX = 90;
  initialOffsetY = 45;
  inputRole1 = document.querySelector(".inputRole1");
  inputRole1.value = "ACTUARY";
  inputRole2 = document.querySelector(".inputRole2");
  inputRole2.value = "COUNSEL";
}


// this function makes our svg responsive to the size of the container/screen!
// provided by Ben Clinkinbeard and Brendan Sudol
function responsivefy(thisSvg) {
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
    const w = parseInt(container.style('width'));
    thisSvg.attr('width', w);
    thisSvg.attr('height', Math.round(w / aspect));
  }
}



var rolename1 = document.getElementsByName("rolename1")[0].value;
var rolename2 = document.getElementsByName("rolename2")[0].value;

function formChanged() {
  rolename1 = document.getElementsByName("rolename1")[0].value;
  rolename2 = document.getElementsByName("rolename2")[0].value;
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

var i = 0,
  duration = 750,
  root;

// Define the div for the tooltip
const divCircle = d3.select("body").append("div")
  .attr("class", "tooltip tooltipCircle")
  .style("opacity", 0);

// declares a tree layout and assigns the size
var treemap = d3.tree().size([height, width]);


// define the color of each individual node based on role and status (FTE/ETW)
function colorCircle(dataArray) {
  if (dataArray.title.includes(rolename1)) {
    if (dataArray.display_name.includes("(ETW")) {
      return "#B4C2F1"  // #B4C2F1   #AFE3D5
    } else {
      return "#4C70D6"  // #4C70D6   #70D0B9
    }
  } else if (dataArray.title.includes(rolename2)) {
    if (dataArray.display_name.includes("(ETW")) {
      return "#FFDBAE"  // #FFDBAE   #FFBEAC
    } else {
      return "#FDA943"  // #FDA943   #FF9473
    }
  } else {
    if (dataArray.display_name.includes("(ETW")) {
      return "#CCC"
    } else {
      return "#999"
    }
  }
}

// define the radius of the "child" circles that show up around parent nodes
function childCircleRadius(childCount) {
  if (childCount < 10) {
    return 2.2
  } else if (childCount < 20) {
    return 1.6
  } else {
    return 1.2
  }
}


// initiate an array to stash the root into (for later use)
var globalRootKeeper = {"root":''};

// read in a 'flattened' json file (one object per node)
function renderTree() {d3.json(treeFile).then(function(flatData) {

  // call an initial zoom event to move the graph into view (without this, JD's name gets cut off)
  svg.call(zoom.transform,d3.zoomIdentity.scale(1).translate(initialOffsetX,initialOffsetY));

  // create a hierarchical json file
  var treeData = d3.stratify()
    .id(d => d.user_ntid)
    .parentId(d => d.manager_ntid)
    (flatData);


  // assigns parent, children, height, depth
  root = d3.hierarchy(treeData, d => d.children);
  root.x0 = height / 2;
  root.y0 = 0;



  // --------------------------------------------------------------------------------------
  // BEFORE collapsing the nodes, run some calculations to help identify relevant teams
  // --------------------------------------------------------------------------------------
  const alreadyCapturedEmps = [];
  const teamLeaders = [];
  root.each(function(d,i) {
    if (alreadyCapturedEmps.includes(d)) {
      return
    }
    thisTitle = d.data.data.title;
    if (thisTitle.includes(rolename1)) {
      console.log(d.data.data.display_name,"-",thisTitle);
      const leaders = d.ancestors();
      const leaderCount = Math.min(leaders.length,5);
      let lastTeamCount = 0;
      let leaderFound = false;
      for (var i = 0; i < leaderCount; i++) {
        if (leaderFound) { return }
        teamCount = leaders[i].descendants().length;
        console.log(leaders[i].data.data.display_name,"teamCount:",teamCount);
        if (teamCount > 35) {  // once we get a team size larger than 35, it's time to compare
          let identifiedLeader;
          let identifiedTeamCount;
          const lastTeamProx = Math.abs(lastTeamCount/35 - 35/lastTeamCount);
          const teamProx = Math.abs(teamCount/35 - 35/teamCount);

          if (teamProx < lastTeamProx) {
            if (!teamLeaders.includes(leaders[i]) && !teamLeaders.includes(leaders[i].parent)){
              identifiedLeader = leaders[i];
              identifiedTeamCount = teamCount;
            }
          } else {
            if (!teamLeaders.includes(leaders[i-1]) && !teamLeaders.includes(leaders[i-1].parent)){
              identifiedLeader = leaders[i-1];
              identifiedTeamCount = lastTeamCount;
            }
          }

          leaderFound = true;
          if (identifiedLeader) { // now that we've found a new leader, let's add some additional data
            teamLeaders.push(identifiedLeader);
            identifiedLeader.data.data.teamSize = identifiedTeamCount;


            // calculate how many role1 and role2 titles are under the identified leader
            let role1Count = 0;
            let role2Count = 0;
            let fteCount = 0;
            let vpCount = 0;
            let srdrCount = 0;
            let ebandCount = 0;
            for (var j = 0; j < identifiedTeamCount; j++ ) {
              const thisEmp = identifiedLeader.descendants()[j];
              const thisTitle = thisEmp.data.data.title;
              const thisName = thisEmp.data.data.display_name;
              if (thisTitle.includes(rolename1)) {role1Count++};
              if (thisTitle.includes(rolename2)) {role2Count++};
              if (thisTitle.includes("VP ")) {vpCount++};
              if (thisTitle.includes("SENIOR DIRECTOR")) {srdrCount++};
              if (thisTitle.includes("SR DIR")) {srdrCount++};
              if (thisTitle.includes("PRINCIPAL")) {ebandCount++};
              if (thisTitle.includes("DIR")) {ebandCount++};
              if (!thisName.includes("(ETW")) {fteCount++};

            }
            identifiedLeader.data.data.role1Count = role1Count;
            identifiedLeader.data.data.role2Count = role1Count;
            identifiedLeader.data.data.fteCount = fteCount;
            identifiedLeader.data.data.vpCount = vpCount;
            identifiedLeader.data.data.srdrCount = srdrCount;
            identifiedLeader.data.data.ebandCount = ebandCount;
            identifiedLeader.data.data.ftePercent = Math.round(1000*fteCount/identifiedTeamCount)/1000;

          };

        } else {
          lastTeamCount = teamCount;
        }
      }

      alreadyCapturedEmps.push(d);
    }
    // if (i%1000 === 0) {console.log(i)}
  });
  console.log("teamLeaders:");
  console.log(teamLeaders);
  console.log(alreadyCapturedEmps);
  var endTime = new Date();
  console.log(endTime-startTime,"elapsed milliseconds");






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
      .data(nodes, d => d.id || (d.id = ++i));

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
      .style("fill", d => colorCircle(d.data.data));

    // add circles to each node that has children matching role1 or role2
    // there CERTAINLY is a better/cleaner way to do this, I just haven't found it yet
    nodeEnter.append("g")
      .attr('fill', function(d, i) {
        if (d._children || d.children) {
          var counts = { "children": 0, "role1": 0, "role2": 0, "role12Nodes":[], "role12Colors":[] };

          function getCounts(parent) {
            if (Array.isArray(parent.children)) {
              counts["children"] += parent.children.length;
              parent.children.forEach(function(child) {
                counts["role1"] += (child.data.title.includes(rolename1) ? 1 : 0);
                counts["role2"] += (child.data.title.includes(rolename2) ? 1 : 0);
                if (child.data.title.includes(rolename1)) {
                  counts["role12Colors"].push(colorCircle(child.data))
                }
                if (child.data.title.includes(rolename2)) {
                  counts["role12Colors"].push(colorCircle(child.data))
                }

                if (Array.isArray(child.children)) { getCounts(child) }
              });
            }
            return counts;
          }
          getCounts(d.data);

          // populate one entry in "role12Nodes" for each role1 and role2 identified
          counts["role12Nodes"] = Array.from({length: counts["role1"]+counts["role2"]}, (_, i) => i);  // [0,1,2,...]

          var dataCounts = counts;
          // console.log("final", d.data.data.display_name, dataCounts);
          var data = counts["role12Nodes"];
          counts["role12Colors"].sort();
          counts["role12Colors"] = shift(counts["role12Colors"],1,4);
          var childrenCircles = d3.select(this).selectAll(".childrenCircle")
            .data(data)
            .join("g");
          childrenCircles.append("circle")
            .style("fill", (d,i) => counts["role12Colors"][i])
            .attr("cx", (d,i) => 8* Math.cos( 2*Math.PI * i  / counts["role12Nodes"].length ) )
            .attr("cy", (d,i) => 8* Math.sin( 2*Math.PI * i  / counts["role12Nodes"].length ) )
            .attr("r", childCircleRadius(counts["role12Nodes"].length));

        }
        return "black";
      })

    // Add labels for the nodes
    nodeEnter.append('text')
      .attr("dy", ".35em")
      .attr("x", d => d.children || d._children ? -13 : 13)
      .attr("text-anchor", d => d.children || d._children ? "end" : "start")
      .text(d => d.data.data.display_name.substring(0,20))
      .style("font-weight",function(d) {
        if (treeFile === "NikeOrgChart.json"  && (d._children || d.children)) {
          var counts = { "children": 0, "fte": 0 };

          function getCounts(parent) {
            if (Array.isArray(parent.children)) {
              counts["children"] += parent.children.length;
              parent.children.forEach(function(child) {
                counts["fte"] += (!child.data.display_name.includes("(ETW") ? 1 : 0);
                if (Array.isArray(child.children)) {  getCounts(child)  }
              });
            }
            return counts;
          }
          getCounts(d.data);
          if (counts["fte"]/counts["children"] > 0.75) {
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
      .style("fill", d => colorCircle(d.data.data))
      .attr('cursor', 'pointer')

      // tooltip
      .on("mouseover", function(event,d) {
        divCircle.transition()
          .duration(200)
          .style("opacity", .9);
        divCircle.html(d.data.data.title)
          .style("left", (event.pageX + 6) + "px")
          .style("top", (event.pageY - 12) + "px");
      })
      .on("mouseout", function(d) {
        divCircle.transition()
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
