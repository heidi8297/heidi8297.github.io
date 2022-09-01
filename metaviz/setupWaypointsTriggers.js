// this function establishes waypoints triggers within the "natural disasters" page
//   which we then use to fire off the different "step" functions which transition
//   between different panes of the scrollytelling visualization
(function() {

  // helper function so we can map over dom selection
  function selectionToArray(selection) {
    var len = selection.length
    var result = []
    for (var i = 0; i < len; i++) {
      result.push(selection[i])
    }
    return result
  } // selectionToArray()

  function waypoints() {
    // select dom elements
    var graphicEl = document.querySelector('.graphic')
    var triggerEls = selectionToArray(graphicEl.querySelectorAll('.trigger'))
    var preProse = document.querySelector('.preProse')
    var postProse = document.querySelector('.postProse')
    var legendInst = document.querySelector('.legendInstructions')
    var varSpacer = document.querySelector('.variableSpacer')

    // a global function creates and handles all the vis + updates
    var graphic = createGraphic('.graphic')

    // setup a waypoint trigger for each trigger element
    var waypoints = triggerEls.map(function(el) {

      // get the step, cast as number
      var step = +el.getAttribute('data-step')

      return new Waypoint({
        element: el, // our trigger element
        handler: function(direction) {
          // if the direction is down then we use that number,
          // else, we want to trigger the previous one
          var nextStep = direction === 'down' ? step : Math.max(0, step - 1)

          // tell our graphic to update with a specific step
          graphic.update(nextStep)

          // the "active" class is shown with opacity 1, the others are shown with reduced opacity
          // managing the "active" states is made much more complicated by the fact
          //   that there are three text sections that are NOT tied to waypoints
          if (direction === 'down') {
            triggerEls[Math.max(0, step - 1)].classList.remove("active")
            triggerEls[step].classList.add("active")
            if (step === 1) {
              preProse.classList.remove("active")
              legendInst.classList.add("active")
              varSpacer.classList.add("active")
            } else if (step === 2) {
              legendInst.classList.remove("active")
              varSpacer.classList.remove("active")
            }
            else if (step === 12) {postProse.classList.add("active")}
          } else {
            triggerEls[step].classList.remove("active")
            triggerEls[nextStep].classList.add("active")
            if (nextStep === 0) {
              preProse.classList.add("active")
              legendInst.classList.remove("active")
              varSpacer.classList.remove("active")
            } else if (nextStep === 1) {
              legendInst.classList.add("active")
              varSpacer.classList.add("active")
            }
            else if (nextStep === 11 ) {postProse.classList.remove("active")}
          }

        },
        offset: '68%',  // trigger 65% down from top of the viewport
      }) // return new Waypoint
    }) // var waypoints

  } // waypoints()

  waypoints()

})()
