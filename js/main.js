/**
 * A single object that will be globla exposed and house various sub objects
 */
var myGlobal = {
  //hold our queue state
  queueProjects: curQueueProjects(),
  //hold current stats
  stats: {},
  //hold some unfiltered stats
  staticStats: {},
  //timers
  timerTimeout: null,
  resizeTimeout: null,
  searchTimeout: null,
  queueTimeout: null,
  statTimeOut: null,
  assignedCheckTimeout: null,
  updateStats: true,

  queueActive: false,
  lastSeenFull: false,
  requestDelaySecs: 1,
  requestDelaySecsFull: 60,
  lastRequestTime: moment(),
  errorCodes: {404: "not found", 400: "full", 422: "full", 401: "no auth"},
  //hold ajax spinner
  spinner: new Spinner(),
  //prevent rapid events in case an event loop sneaks in
  eventThrottle: 50,
  //prevent window resize form firing anything until it stops
  sizeThrottle: 100,
  //prevent search from firing until typing slows a little
  searchThrottle: 150,
  //prevent trying to load new data while a data load is active
  loadingNow: false,
  //flag to prevent date picker events from firing date picker updates
  datePickerActive: false,
  //toggle picker event so dates can be edited without firing events
  datePickerEnabled: false,
  //prevent search and filter events from stepping on eachother
  listUpdateActive: false,
  //how many days back should a refresh (not initial load) try to grab
  refreshDays: 30,
  //should a cors proxy be used?
  useProxy: true,
  //prevent filter events while search is already running
  debug: false
};

/**
 * options for listjs including an ugly html template to use
 * for the list itself when parsing in items from Udacity data
 */
var options = {
  valueNames: [ 'project_id',
                { name: 'nanodegree', attr: 'data-content'},
                { name: 'checkcert', attr: 'data-cert'},
                { name: 'initstate', attr: 'data-init'},
                'name', 'status', 'active', ],
  page: 5,
  plugins: [ ListPagination({outerWindow: 1}),
             ListFuzzySearch() ],
  item: '<li class="list-group-item"><div class="row">' +
        '<div class="cell col-sm-1 col-xs-1">' +
        '<a href="javascript:;" class="link"><span class="project_id"></span></a>' +
        '</div><div class="cell col-sm-5 col-xs-5">' +
        '<span class="name nanodegree" data-placement="auto top" ' +
        'data-toggle="popover"' +
        'data-trigger="hover"></span>' +
        '</div><div class="cell col-sm-2 col-xs-2">' +
        '<span class="status"></span>' +
        '</div><div class="cell col-sm-2 col-xs-2">' +
        '<span class="active full_feedback" data-placement="auto top" ' +
        'data-toggle="popover"' +
        'data-trigger="hover"></span>' +
        '</div><div class="cell checkbox-slider--a-rounded col-sm-2 col-xs-2">' +
        '<label class="check-label">' +
          '<input class="checkcert initstate" type="checkbox" checked><span></span>' +
        '</label>' +
        '<span class="queue"></span>' +
        '</div></div>' +
        '</li>'
};


//Instantiate the listjs list
var userList = new List('reviews', options, '');

//initial fill of our stats object
resetStats();

/**
 * sets myGlobal.stats back to clean values
 */
function resetStats() {
  debug("reset stats triggered");
  myGlobal.stats = {
    assigned: [],
    queueStartTime: "not active",
    queueRequests: 0,
    assignedTotal: 0
  };
  debug("reset stats ended");
}

/**
 * parses a javascrip object and manipulates it some for use
 * in the searchable list
 * @param  {object} vals javascript object containing Udacity data from JSON
 * @return {object} parsed and somewhat modified javascript object
 */
var parseVals = function(vals) {
  debug("parse vals triggered");
  var ret = JSON.parse(JSON.stringify(vals));
  myGlobal.stats.reviewCount += ret.length; //total reviews
  ret.forEach(function(review){

    review.checkcert = (review.status === "certified");
    var qp = myGlobal.queueProjects;
    if (!review.checkcert || !qp.hasOwnProperty(review.project_id)) {
      qp[review.project_id] = review.checkcert;
    }

    review.initstate = qp[review.project_id];

    //linkify id
    review.link = "https://review.udacity.com/#!/reviews/" + review.id;
    //pull the project name to the top level
    review.name = review.project.name;
    review.nanodegree = review.project.nanodegree_key + ': ' +
                        review.project.hashtag.split(',')[1];
    review.earned = numToMoney(+review.price);
    //if completed_at is missing, use created_at instead
    //TODO: consider a gener date helper function with multiple fallbacks
    if (moment(review.completed_at,moment.ISO_8601,true).isValid()) {
      review.completedDate = moment(review.completed_at).format("L");
    }
    else {
      review.completedDate = moment(review.created_at).format("L");
    }
    //date stuff
    var dateAssn = moment(review.assigned_at);
    var dateComp = moment(review.completed_at);
    var tempDur = moment.duration(dateComp.diff(dateAssn));

    review.duration = "Time to finish: " + pad(tempDur.hours()) + ":" +
                      pad(tempDur.minutes()) + ":" + pad(tempDur.seconds());
    review.rawDur = tempDur;

    // parseReviewStats(review);

  });

  //save projects so we can remember their last state
  saveQueueProjects(JSON.stringify(myGlobal.queueProjects));

  //some format cleanup on stats to make them presentable
  // cleanStats(); //needs to be first as it relies on unmutated numbers
  debug("parse vals ended (returned)");
  return ret;
};


/**
 * update the various navbar dom elements with stat information
 */
function updateStats() {
  debug("update stats triggered");
  var spnSt = '<span class="text-success">';
  var spanSt2 = '<span class="text-success notes" data-placement="auto bottom" ' +
        'data-toggle="popover" data-trigger="hover" data-content="';

  var startTime = myGlobal.stats.queueStartTime;
  var dur = startTime;
  if (dur !== "not active") {
    dur = moment.duration(startTime.diff(moment())).humanize();
    startTime = startTime.format('LT');
  }
  $('.statTimeStarted').html(
    '<span class="hidden-sm">Queue </span>Start Time: ' +
    spnSt + startTime + '</span>');

  $('.statTimeActive').html(
    '<span class="hidden-sm">Queue </span>Time Active: ' +
    spnSt + dur + '</span>');
  $('.statTotalAssigned').html('Total Assigned: ' + spnSt +
    numWithComs(myGlobal.stats.assignedTotal) + '</span>');
  $('.statTotalRequests').html(
    'Total <span class="hidden-sm">Server </span>Requests: ' +
    spnSt + numWithComs(myGlobal.stats.queueRequests) + '</span>');
  $('.statCurReviews').html('<span class="hidden-sm">Currently </span>Assigned: ' +
    spnSt + myGlobal.stats.assigned.length + '</span>');

  var projStr = '';
  var projPre = '<li><a href="https://review.udacity.com/#!/submissions/';
  var projSuf1 = '" target="_blank">';
  var projSuf2 = '</a></li>';
  myGlobal.stats.assigned.forEach(function(project) {
    //earned stuff
    projStr += projPre + project + projSuf1 + project + projSuf2;
  });
  $('.curReviewsDD').html(projStr);

  //keep firing this unless the setting for it is disabled
  if (myGlobal.updateStats) {
    myGlobal.statTimeOut = setTimeout(updateStats, 1000);
  }

  debug("Update Stats ended");
}

/**
 * Get JSON from a token to check what projects are assigned
 * @param  {string} token user auth token from Udacity
 */
function assignedCheck(token) {
  debug("Assigned Check triggered");
  token = token || curToken();


  $.ajax({method: 'GET',
      url: 'https://review-api.udacity.com/api/v1/me/submissions/assigned.json',
      headers: { Authorization: token }
  })
  .done(function(data){
    debug(data);

    myGlobal.stats.assigned = data.map(function(proj) {
      return proj.id;
    })
  })
  .fail(function(error){
    //TODO, actually handle this fail
  })
  .always(function(){
    if(myGlobal.updateStats) {
      myGlobal.assignedCheckTimeout = setTimeout(function(){
        assignedCheck(token);
      }, 30000)
    }
  })

  debug("Assigned Check ended");
}

/**
 * ajax helper for a single project assignment attempt
 * @param  {number} projId the project id we are attempting to assign
 * @param  {string} token  auth token to use with request
 * @return {promise}       a jquery promise
 */
function assignAttempt(projId, token) {
  token = token || curToken();

  var deff = jQuery.Deferred();
  debug(projId)
  myGlobal.stats.queueRequests += 1;
  myGlobal.lastRequestTime = moment();
  $.ajax({method: 'POST',
      url: 'https://review-api.udacity.com/api/v1/projects/' +
              projId + '/submissions/assign.json',
      headers: { Authorization: token }
  })
  .done(function(data){
    debug(data);
    myGlobal.stats.assignedTotal += 1;
    deff.resolve({result: "assigned", info: data.id});
  })
  .fail(function(error){
    debug(error);
    var errInfo = myGlobal.errorCodes[error.status] || "unknown";
    deff.resolve({result: "error", info: errInfo});
  });

  return deff.promise();
}

function startQueue() {
  debug("queue started");
  myGlobal.queueActive = true;
  myGlobal.lastSeenFull = false;
  myGlobal.stats.queueStartTime = moment();
  runQueue(0);
}

function stopQueue() {
  debug("queue stopped");
  myGlobal.queueActive = false;
  myGlobal.stats.queueStartTime = "not active";
  clearTimeout(myGlobal.queueTimeout);
}

function startStats() {
  myGlobal.updateStats = true;
  assignedCheck();
  updateStats();
}

function stopStats() {
  myGlobal.updateStats = false;
  clearTimeout(myGlobal.statTimeOut)
  clearTimeout(myGlobal.assignedCheckTimeout)
}
/**
 * Loop to attempt to assign projects using auth token
 * @param  {string} token user auth token from Udacity
 */
function runQueue(i, token) {
  debug("Run Queue triggered");
  token = token || curToken();

  var arr = queueOnly();
  var token = curToken();
  var delayOffset = moment().diff(myGlobal.lastRequestTime);
  var delay = Math.max(0, myGlobal.requestDelaySecs * 1000 - delayOffset);

  //wait longer if the last time we checked we already had
  //a full project log assigned to ease off the server a bit
  if (myGlobal.lastSeenFull) {
    delay = myGlobal.requestDelaySecsFull * 1000;
  };

  if (i === undefined || i >= arr.length) {
    i = 0;
  }

  pulse($('.project_id').filter(function() {
      return $(this).html() === arr[i];
    }).closest('li'), Math.min(950, delay));

  debug(i);
  myGlobal.queueTimeout = setTimeout(function(){
    if(arr.length) {
      assignAttempt(arr[i], token)
      .done(function(res){
        debug(res);
        if(res.result === "error") {
          if(res.info === "full") {
            myGlobal.lastSeenFull = true;
          }
          else if (res.info === "no auth" || res.info === "unknown") {
            //TODO: make an auth alert for the user
            //turn off the queue since we either
            //have a bad token or an unknown issue
            myGlobal.queueActive = false;
          }
        }
        else {
          //TODO: put the review grabbed logic here
          console.log("booya ", res.info)
        }

        //start queue again with the next index
        //if the queue is still active
        if(myGlobal.queueActive) {
          runQueue(i += 1, token);
        }
        else {
          debug("queue halted");
        }
      })
    }
    else {
      //keep looping even if nothign is selected
      //so that the queue keeps going if things are
      //ticked off and on during the loop
      myGlobal.lastRequestTime = moment();
      runQueue(i);
    }
  }, delay)

  debug("Run Queue ended");
}

/**
 * ajax helper for a single project assignment attempt
 * @param  {number} projId the project id we are attempting to assign
 * @param  {string} token  auth token to use with request
 * @return {promise}       a jquery promise
 */
function assignAttempt(projId, token) {
  token = token || curToken();

  var deff = jQuery.Deferred();
  debug(projId)
  myGlobal.stats.queueRequests += 1;
  myGlobal.lastRequestTime = moment();
  $.ajax({method: 'POST',
      url: 'https://review-api.udacity.com/api/v1/projects/' +
              projId + '/submissions/assign.json',
      headers: { Authorization: token }
  })
  .done(function(data){
    debug(data);
    myGlobal.stats.assignedTotal += 1;
    deff.resolve({result: "assigned", info: data.id});
  })
  .fail(function(error){
    debug(error);
    var errInfo = myGlobal.errorCodes[error.status] || "unknown";
    deff.resolve({result: "error", info: errInfo});
  });

  return deff.promise();
}

/**
 * initialization function that kicks off various tasks
 * once varified data has been fed in from user input or local storage
 * @param  {string} dataStr [the JSON data in string format]
 */
function handleData(dataStr) {
  debug("Handle Data triggered");
  userList.add(parseVals(JSON.parse(dataStr)));
  userList.sort('project_id', { order: "asc" });
  $('.jumbotron, .copyCode').addClass('hide');
  $('.reviewsRow, .dropdown, .exportJSON, .exportCSV, .toggleQueue')
     .removeClass('hide');
  $('.navbar-brand').addClass('visible-xs');
  $('.search').focus();
  if (curToken() !== '') $('.refreshData').removeClass('hide');
  // myGlobal.staticStats = JSON.parse(JSON.stringify(myGlobal.stats));
  //fit the list to our current page state
  userList.page = getPageSize();
  userList.update();
  startStats();
  handleHover();

  //remove the throttle on filter updates to the navbar
  setTimeout(function(){myGlobal.stats.throttled = false;}, myGlobal.eventThrottle);
  debug("Handle Data ended");
}

/**
 * tooltip/popover are only initialized for currently visible
 * dom elements.  So every time we update what is visible this
 * is run again to ensure new elements have their popover
 */
function handleHover() {
  debug("Handle Hover triggered");
  $('.popover').remove(); //be sure no popovers are stuck open
  $('.nanodegree:not([data-content="null"],[data-content=""])')
  .popover({container: 'body'}).addClass('hoverable');
  $('.duration').popover({container: 'body'}).addClass('hoverable');
  debug("Handle Hover ended");
  $('.checkcert:not([data-cert="true"]').prop( "checked", false ).prop( "disabled", true );
  $('.checkcert:not([data-init="true"]').prop( "checked", false );
}


function handleCheck(el) {
  el.setAttribute("data-init", "" + el.checked);
  var project_id = +$(el).closest('.row').find('.project_id').html()
  myGlobal.queueProjects[project_id] = el.checked;
  saveQueueProjects(JSON.stringify(myGlobal.queueProjects));
}

/**
 * Fills the modal with review details and then shows it
 * @param  {int} The review id to show in the modal
 */
function handleModal(project_id) {
  debug("Handle Modal triggered");
  var data = userList.get('project_id', project_id)[0].values();
  var list = $('.modal-list');
  var pre = '<li class="list-group-item">';
  var content = pre + 'Project ID: ' + '<a target="_blank" href="' +
                data.link + '">' + data.project_id + '</a></li>' +
    pre + 'Project Title: ' + data.project.name +
          ' (ID: ' + data.project_id + ')</li>' +
    pre + 'Project Status: ' + data.status +
          ' (Active: ' + data.active + ')</li>' +
    pre + 'Grader ID: ' + data.grader_id + '</li>' +
    pre + 'Current Price: ' + data.project.price + '</li>' +

    pre + 'Created: ' + moment(data.created_at).format('llll') + '</li>' +
    pre + 'Certified: ' + moment(data.certified_at).format('llll') + '</li>' +
    pre + 'Waitlisted: ' + moment(data.waitlisted_at).format('llll') + '</li>' +
    pre + 'Updated: ' + moment(data.updated_at).format('llll') + '</li>' +
    pre + data.duration + '</li>';
    if (data.repo_url) {
      content += pre + '<a target="_blank" href="' + data.repo_url + '">Student Repo</a></li>';
    }
    if (data.archive_url) {
      content += pre + '<a target="_blank" href="' + data.archive_url + '">Student Zip Archive</a></li>';
    }
    // Removed until I can figure out if this is a valid url still
    // and if so, what the prefix is.
    // if (data.zipfile.url) {
    //   content += pre + '<a target="_blank" href="' + data.zipfile.url + '">Zip File</a></li>';
    // }
    if (data.rating) {
      content += pre + 'Student Feedback Rating: ' + data.rating + '</li>';
    }
    if (data.feedback) {
      content += pre + 'Student Feedback Note: ' + data.feedback + '</li>';
    }
    if (data.notes) {
      content += pre + 'Student General Note: ' + marked(data.notes) + '</li>';
    }
    if (data.general_comment) {
      content += pre + 'Grader General Comment: ' + marked(data.general_comment) + '</li>';
    }
    //start section that is likely to be null
    if (data.status_reason) {
      content += pre + 'Status Reason: ' + marked(data.status_reason) + '</li>';
    }
    if (data.result_reason) {
      content += pre + 'Result Reason: ' + marked(data.result_reason) + '</li>';
    }
    if (data.training_id) {
      content += pre + 'Training ID: ' + data.training_id + '</li>';
    }
    if (data.url) {
      content += pre + 'URL: ' + data.url + '</li>';
    }
    if (data.project.upload_types.length > 0) {
      content += pre + 'Upload Types: ' + data.project.upload_types.join(', ') + '</li>';
    }
    if (data.previous_submission_id) {
      content += pre + 'URL: ' + data.previous_submission_id + '</li>';
    }
    if (data.nomination) {
      content += pre + 'URL: ' + data.nomination + '</li>';
    }
    // //end likely to be null section
    // content += pre + 'Udacity Key: ' + data.udacity_key + '</li>';

  list.html(content);
  $('.modal').modal();
  debug("Handle Modal ended");
}


/**
 * initialize the datepicker for date filtering and add an event listener
 */
function initDatePicker() {
  debug("init date picker triggered");
  $('.input-daterange').datepicker({
      //this will get local date format pattern from moment
      todayBtn: "linked",
      format: moment.localeData().longDateFormat('l').toLowerCase(),
      todayHighlight: true,
      autoclose: true
  }).on('changeDate', function(e) {
      if(myGlobal.datePickerEnabled) filterListDates();
  });
  debug("init date picker ended");
}

/**
 * ensure datePicker has the correct dates in it after a list change
 */
function updateDatePicker() {
  debug("update date picker triggered");
  //prevent unwanted events while we set dates
  myGlobal.datePickerEnabled = false;

  var updated = false;
  var startNow = moment($('.fromDate').datepicker('getDate')).format("l");
  if (startNow !== myGlobal.stats.startDate) {
    $('.fromDate').datepicker('setDate', myGlobal.staticStats.startDate);
    updated = true;
  }
  var endNow = moment($('.toDate').datepicker('getDate')).format("l");
  if (endNow !== myGlobal.stats.recentDate) {
    $('.toDate').datepicker('setDate', myGlobal.staticStats.recentDate);
    updated = true;
  }
  //Now that things are set up, allow date picker events again
  myGlobal.datePickerEnabled = true;
  debug("update date picker ended");
}

/**
 * Filters the review history list based on dates in the datepicker
 */
function filterListDates(){
  debug("date filter triggered");
  myGlobal.datePickerActive = true;
  var f = moment($('.fromDate').datepicker('getDate')).subtract(1, 'day');
  var t = moment($('.toDate').datepicker('getDate')).add(1, 'd');
  userList.filter(function(item) {
    return moment(item.values().completed_at).isBetween(f, t, 'day');
  });
  myGlobal.datePickerActive = false;
  debug("date filter ended");
}

/**
 * Copies the helper code to user's clipboard silently
 * No flash fallback or anything.  It is assumed reviewers
 * are using a decent modern browser
 */
function copyCodeToClipboard() {

  //this works by adding a hidden element, copying from that
  //and then removing the element when done.  Clunky but silent.
    var aux = document.createElement("textarea");

    aux.cols = "400";
    aux.rows = "100";

    aux.value = "copy($.ajax({" +
      "method: 'GET'," +
      "url: 'https://review-api.udacity.com/api/v1/me/submissions/completed.json'," +
      "headers: { Authorization: JSON.parse(localStorage.currentUser).token }," +
      "async: false" +
      "}).done(function(data){console.log('The data should now be in your clipboard " +
      "and ready to paste into the tool');}).responseJSON)";

    document.body.appendChild(aux);
    aux.select();
    document.execCommand("copy");
    document.body.removeChild(aux);
}

/**
 * Either pulls data from ewxisting token or if one is not found
 * resets data to the current stored data in localStorage
 */
function refreshData() {
  if (!myGlobal.loadingNow) {
    var oldToken = curToken();
    if (oldToken !== '') {
      handleToken(oldToken, true);
    }
    else{
      debug('Handling Data as no token found on refresh');
      var oldData = curDataStr();
      if (oldData !== '') {
        userList.clear();
        resetStats();
        handleData(oldData);
      }
      else {
        window.alert("No valid token or data found in localStorage!");
      }
    }
  }
}

/**
 * Begins an AJAX loading spinner after a set delay
 * The delay is to avoid flashing it for very fast responses
 * Also prevents further clicking actions on input boxes/buttons
 * @param  {number} delay number of milliseconds to delay before spinning
 */
function startSpin(delay) {
    myGlobal.loadingNow = true;

    if (myGlobal.spinner == undefined ) {
        myGlobal.spinner = new Spinner();
    }
    myGlobal.timerTimeout = setTimeout(function() {
        myGlobal.spinner.spin(document.getElementById('spin-target'));
    }, delay);
}

/**
 * Stops the AJAX loading spinner and removes any pending spin timeout
 * Also restores clicking actions on input boxes/buttons
 */
function stopSpin() {
    clearTimeout(myGlobal.timerTimeout);
    myGlobal.spinner.stop();
    myGlobal.loadingNow = false;
}

/**
 * Enables and disables custom darker page theme
 */
function toggleTheme(firstLoad) {
  var themeState = localStorage.getItem('themeState');
  if(!firstLoad) {
    themeState = (themeState === "on") ? "off" : "on";
    localStorage.setItem('themeState', themeState);
  }
  themeState === "on" ? themeOn() : themeOff();
}

/**
 * disable custom darker page theme
 */
function themeOn() {
  $('body').addClass('color-body');
  var nav = $('.navbar-mine, .navbar-default');
  nav.addClass('navbar-mine').removeClass('navbar-default');
}

/**
 * disable custom darker page theme
 */
function themeOff() {
  $('body').removeClass('color-body');
  var nav = $('.navbar-mine, .navbar-default');
  nav.removeClass('navbar-mine').addClass('navbar-default');
}

/**
 * decides the number of items to show based on the current window
 * innerHeight
 * @return {number} the number of items to show
 */
function getPageSize() {
  //assume a height of 32, but if we already have renderred items
  //use their height since zoom throws it off
  var itemSize = $('.list-group-item:first').outerHeight(true);
  itemSize = Math.max(itemSize, 32);
  var filterSize = $('.filter-row').outerHeight(true);
  var buttonSize = $('.button-row').outerHeight(true);
  var pageSize = $('.pagination').outerHeight(true);
  var navSize = $('.navbar-header').outerHeight(true) || $('#navbar').outerHeight(true);
  var listMargins = 22;
  var wiggleRoom = 25;

  var baseSize = filterSize + buttonSize + pageSize +
                 navSize + listMargins + wiggleRoom;

  var rawNum = (window.innerHeight - baseSize) / itemSize;
  return Math.max(rawNum, 5)  //show 5 items or more always
}


/**
 * convert a number to monetary format with $ and commas
 * will also work with a number parsable string as input
 * @param  {number} num [number to convert to money string]
 * @return {string}   [string in format of $1,000.00]
 */
function numToMoney(num) {
    num = Math.round(num*100)/100;
    return '$' + numWithComs(num);
}

/**
 * add commas to numbers at 3 character intervals
 * also works with a number parsable string
 * @param  {number} num [number to convert to string]
 * @return {string}     [number with commas added]
 */
function numWithComs(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * look for a given name in an array.  return true if found
 * @param  {string} name string to look for
 * @param  {array} arr  array to look for a string in
 * @return {boolean}
 */
function nameInArr(name, arr)
{
    var test = findNameInArr(name, arr);
    return (test.length > 0);
}

/**
 * look for a given name in an array.  The format of the array
 * is taken for granted to include a name as a first level key
 * @param  {string} name string to look for
 * @param  {array} arr  array to look for a string in
 * @return {object} object containing the name or a 0 length object
 */
function findNameInArr(name, arr) {
  return $.grep(arr, function(e){ return e.name == name; });
}

/**
 * Takes existing review data and merges in newer data
 * Any old review is overwritten and any new review is appended
 * @param  {object} oldData existing review data
 * @param  {object} newData newer review data from refresh
 * @return {object} merged review data
 */
function mergeData(oldData, newData) {
  var oData = JSON.parse(JSON.stringify(oldData));
  var nData = JSON.parse(JSON.stringify(newData));

  //make a lookup helper to facilitate the merge
  var lookup = {};
  for (var i = 0, len = oData.length; i < len; i++) {
      lookup[oData[i].id] = oData[i];
  }
  //loop through new data and either replace or append to old data
  for (var i = 0, len = nData.length; i < len; i++) {
       var newReview = nData[i];
       var oldReview = lookup[newReview.id];
       if (oldReview !== undefined) {
        oldReview = newReview
       }
       else {
        oData.push(newReview);
       }
  }
  return oData;
}

/**
 * Check if an object is valid Udacity JSON in string format
 * @param  {string} item [object to test]
 * @return {Boolean}
 */
function isJson(item) {
    item = typeof item !== "string" ?
        JSON.stringify(item) :
        item;

    try {
        item = JSON.parse(item);
    } catch (e) {
        return false;
    }

    if (typeof item === "object" && item !== null) {
      if (item[0].project_id !== undefined) {
        return true;
      }
    }

    return false;
}

function saveToken(token) {
  localStorage.setItem('lastToken', token);
}

function deleteToken() {
  localStorage.removeItem('lastToken');
}

function curToken() {
  return localStorage.getItem('lastToken') || '';
}

function saveData(data) {
  localStorage.setItem('lastCertsJSON', data);
}

function curDataStr() {
  return localStorage.getItem('lastCertsJSON') || '';
}

function curData() {
  return JSON.parse(curDataStr() || '{}');
}

function saveQueueProjects(data) {
  localStorage.setItem('lastQueueProjects', data);
}

function deleteQueueProjects() {
  localStorage.removeItem('lastQueueProjects');
}

function curQueueProjectsStr() {
  return localStorage.getItem('lastQueueProjects') || '';
}

function curQueueProjects() {
  return JSON.parse(curQueueProjectsStr()  || '{}');
}

/**
 * returns an array of just project ids that should be polled for
 * based on the state object myGlobal.queueProjects
 * @return {array} all project ids to try to grab in a queue
 */
function queueOnly() {
  var retArr = [];
  var projObj = myGlobal.queueProjects;
  for (var key in projObj) {
    //shouldn't need to check for prototype, but just in case..
    if (!projObj.hasOwnProperty(key)) continue;
    if (projObj[key] === true) {
      retArr.push(key);
    }
  }
  return retArr;
}

/**
 * Visually flashes icons.  Used for click feedback
 * @param  {object} el jQuery or DOM element object to pulse
 */
function pulse(el, delay) {
  delay = delay || 200;
  if (!el.jquery) el = $(el);
  el.addClass('pulse');
  setTimeout(function(){
    el.removeClass('pulse');
    }, delay)
}

/**
 * Simple debug helper so console log debugs can be left in but
 * only trigger when a flag is on
 * @param  {multiple} message what should be logged to the console
 */
function debug(message) {
  if (myGlobal.debug) console.log(message);
}

/******** click and event handlers ********/

/**
 * click handler for the button that loads previously saved
 * user data from localStorage
 */
$('#lastData').click(function(){
  if (!myGlobal.loadingNow) {
    var oldData = curDataStr();
    if (isJson(oldData)) {
      handleData(oldData);
    }
    else {
      $('#alert2').removeClass('hide');
    }
  }
});

/**
 * click handler for the button that loads previously saved
 * user data from localStorage
 */
$('#lastToken').click(function(){
  if (!myGlobal.loadingNow) {
    var oldToken = curToken();
    handleToken(oldToken);
  }
});

/**
 * click handler for the earliest date in navbar
 */
$('.statStart').click(function() {
  this.blur();
  pulse($('.fromDate'));
  $('.fromDate').datepicker('setDate', myGlobal.staticStats.startDate);
});

/**
 * click handler for the recent date in navbar
 */
$('.statRecent').click(function() {
  this.blur();
  pulse($('.toDate'));
  $('.toDate').datepicker('setDate', myGlobal.staticStats.recentDate);
});

/**
 * click handler for the helper code button in navbar
 */
$('.copyCode').click(function() {
  this.blur();
  pulse($(this).find('.fa'));
  copyCodeToClipboard();
});

/**
 * click handler for the stop start button in navbar
 */
$('.toggleQueue').click(function() {
  var icon = $(this).find('.fa');
  this.blur();

  if(myGlobal.queueActive) {
    stopQueue();
    icon.addClass('fa-play');
    icon.removeClass('fa-pause');
  }
  else {
    startQueue();
    icon.addClass('fa-pause');
    icon.removeClass('fa-play');
  }

  pulse(icon);
});

/**
 * click handler for the data refresh in navbar
 */
$('.refreshData').click(function() {
  this.blur();
  pulse($(this).find('.fa'));
  refreshData();
});

/**
 * click handler for .json export in navbar
 */
$('.exportJSON').click(function() {
  this.blur();
  pulse($(this).find('.fa'));
  exportJSON();
});

/**
 * click handler for CSV export in navbar
 */
$('.exportCSV').click(function() {
  this.blur();
  pulse($(this).find('.fa'));
  exportCSV();
});

/**
 * click handler for theme toggle in navbar
 */
$('.toggleTheme').click(function() {
  this.blur();
  toggleTheme();
});

/**
 * click handler for id links to open modal for that id
 * set to inherit event from main list since these are
 * dynamic appends
 */
$('#main-list').on('click', '.id', function() {
  handleModal(this.innerHTML);
});

/**
 * click handler for queue checkbox to update state of
 * wanted queue items
 * @param  {[type]} ) {             handleModal(this.innerHTML);} [description]
 * @return {[type]}   [description]
 */
$('#main-list').on('propertychange click', '.checkcert', function() {
  handleCheck(this);
});

/**
 * Custom search keypress handler to allow restricting search
 * to specific fields only and throttle input
 */
$('.my-search').on('propertychange input', function() {
  if(!myGlobal.loadingNow) {
    $('.my-fuzzy-search').val('');
    clearTimeout(myGlobal.searchTimeout);
    //use 200ms timer to check when active typing has ended
    myGlobal.searchTimeout = setTimeout(function(){
      var filterArr = ['id', 'name', 'status', 'active'];
      userList.search($('.my-search').val(), filterArr);
    }, myGlobal.searchThrottle);
  }
});

/**
 * Custom search keypress handler to allow restricting fuzzy-search
 * to specific fields only and throttle input
 */
$('.my-fuzzy-search').on('propertychange input', function() {

  if(!myGlobal.loadingNow) {
    $('.my-search').val('');
    clearTimeout(myGlobal.searchTimeout);
    //use 200ms timer to check when active typing has ended
    myGlobal.searchTimeout = setTimeout(function(){
      var filterArr = ['id', 'name', 'status', 'active'];
      userList.fuzzySearch.search($('.my-fuzzy-search').val(), filterArr);
    }, myGlobal.searchThrottle);
  }
});

/**
 * Keypress event to capture enter key in the textarea
 * that is used to input JSON data as text from Udacity
 */
$('#jsonInput').keypress(function(event) {
    // Check the keyCode and if the user pressed Enter (code = 13)
    if (event.keyCode == 13 && !myGlobal.loadingNow) {
      if(isJson(this.value)) {
        //store this data in case we want to reload it
        saveData(this.value);
        handleData(this.value);
        this.value = '';
      }
      else {
        this.value = '';
        $('#alert1').removeClass('hide');
      }
    }
});

/**
 * Keypress event to capture enter key in the textarea
 * that is used to input api auth token as text from Udacity
 */
$('#tokenInput').keypress(function(event) {
    // Check the keyCode and if the user pressed Enter (code = 13)
    if (event.keyCode == 13 && !myGlobal.loadingNow) {
      handleToken(this.value);
      this.value = '';
    }
});

/**
 * initialize popover for navbar buttons here so they are only done once
 */
$('.help').popover({container: 'body'});
$('.refreshData').popover({container: 'body'});


/**
 * pad a number to ensure it is 2 digits.
 * Important: Assumes 1 or 2 digit string format number.
 * @param  {string} str input string
 * @return {string}     padded output string
 */
function pad(str) {
  return ("0" + str).slice(-2);
}

/**
 * window resize event so that we can adjust list item number per
 * page to fit any size window within reason
 */
window.onresize = function(){
  clearTimeout(myGlobal.resizeTimeout);
  //prevent scrollbar on resize and restore after resize ends
  $('html, body').css('overflow-y', 'hidden');
  //use timer to check when active resizing has ended
  myGlobal.resizeTimeout = setTimeout(function(){
    $('html, body').css('overflow-y', 'visible');
    var oldPageSize = userList.page;
    var newPageSize = getPageSize();
    userList.page = newPageSize;
    userList.update();
    userList.show(1, userList.page);
    if (newPageSize > oldPageSize) handleHover();
  }, myGlobal.sizeThrottle);
};

// /**
//  * userList events that fire on list changes
//  * Uses a shared throttle to avoid rapid duplicate events
//  */
// userList.on('searchComplete', function() {
//   if (!myGlobal.listUpdateActive && !myGlobal.loadingNow) {
//     myGlobal.listUpdateActive = true;
//     listUpdate('search');
//     myGlobal.listUpdateActive = false;
//   }
// });
// userList.on('filterComplete', function() {
//   if (!myGlobal.listUpdateActive && !myGlobal.loadingNow) {
//     myGlobal.listUpdateActive = true;
//     listUpdate('filter');
//     myGlobal.listUpdateActive = false;
//   }
// });
//below events are not throttled
userList.on('sortComplete', handleHover);
userList.on('pageChangeComplete', handleHover);


/******** end click and event handlers ********/

/**
 * runs when the page loads and checks if there is user data
 * in localStorage.  If so, unhide a button element
 */
$(function() {
  toggleTheme(true); //set theme off if it was off on last load
  var oldData = curDataStr();
  if (oldData !== '') {
    $('#lastData').removeClass('hide');
  }
  var oldToken = curToken();
  if (oldToken !== '') {
    $('#lastToken').removeClass('hide');
  }
  //now that
  // initDatePicker();
  //remove the big white div covering everything now that we
  //are done doing things that will be flashy and ugly on load
  //$('#cover').hide(400, 'opacity');
  $('#cover').fadeOut(500);
});

  $.ajaxPrefilter(function(options) {
      if (myGlobal.useProxy && options.crossDomain && jQuery.support.cors) {
          options.url = 'https://corsproxy-simplydallas.rhcloud.com/' + options.url;
      }
  });
