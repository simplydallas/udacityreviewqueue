// Instances of the tour
var tour = new Tour({
  name: "queueLaunchTour",
  steps: [
  {
    element: "#tokenInput",
    title: "Paste Your Token",
    content: "This is where you will paste your Udacity API token." +
     "  You can get it from the review dashboard by clicking the API " +
     "Access link or by pasting a little code into the dev console while at " +
     '<a target="_blank" ' + 
     'href="https://review.udacity.com/#!/submissions/dashboard">' +
     'https://review.udacity.com/#!/submissions/dashboard</a>',
    placement: "bottom"
  },
  {
    element: ".fa-clipboard",
    title: "Code Helper",
    content: "Click this icon if you want to do it via the console and " +
    "it will copy the code snippet into your clipboard for you on most browsers.",
    placement: "left"
  }
]});

var tour2 = new Tour({
  name: "queueLoadedTour",
  steps: [
  {
    element: ".check-label:first",
    title: "Select Projects to Assign",
    content: "Click these toggles to select the projects you want to work.  " +
    "Green is on, white is off, grey is not certified and can't be turned on.",
    placement: "bottom"
  },
  {
    element: ".fa-play, .fa-pause",
    title: "Start Queue",
    content: "Click this icon to start the queue and begin " +
    "attempting to assign the selected projects.  Click it again as a pause button " + 
    "to stop the queue from grabbing any more projects.  " +
    "Remember to turn it off when you are done!",
    placement: "left"
  },
  {
    element: ".statCurReviews",
    title: "Assigned Projects",
    content: "Any projects you get assigned will show up here in the dropdown. " +
    "They will show as a number and if you click the number it will take you " + 
    "directly to the review page so you can edit it.  Once you complete the " +
    " project, it will automatically be removed from this list within 30 seconds.",
    placement: "right"
  },
  {
    element: ".list-group-item:first",
    title: "Visual Indicator",
    content: "The text for each project you select will flash green as it is " + 
    "requested.  This should happen about once every second unless you have a full " +
    "log of reviews (currently 2) and then it will happen every 60 seconds.",
    placement: "bottom",
    backdrop: true,
    onShown: function() {
      setTimeout(function(){
        pulse($('.list-group-item:first'), 1000);
        setTimeout(function(){
          pulse($('.list-group-item:first'), 1000);
        }, 2000);
      }, 800)
    }
  },
    {
    element: ".fa-volume-up, .fa-volume-off",
    title: "Sound Alert",
    content: "Any project that is assigned will trigger a sound alert " + 
    "Click this icon to toggle that sound on and off.  It will be remembered " +
    "between sessions.",
    placement: "bottom"
  }
  
]});

// Initialize the tour
tour.init();
tour2.init();

//will start these in the main.js file