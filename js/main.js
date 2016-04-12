/**
 * A single object that will be globla exposed and house various sub objects
 */
var myGlobal = {
  //hold our queue state
  queueProjects: curQueueProjects(),
  //hold current stats
  stats: {},
  //hold some unfiltered stats
  statsCache: {},
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
  errorCodes: {
    404: "not found",
    400: "full",
    422: "full",
    401: "no auth"
  },
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
  useProxy: false,
  //sounbd file for alerts
  snd: new Audio("sounds/gotone.mp3"),
  failSnd: new Audio("sounds/notgood.mp3"),
  soundAlert: true,
  emailAlert: false, //work in progress
  //prevent filter events while search is already running
  debug: false
};

/**
 * options for listjs including an ugly html template to use
 * for the list itself when parsing in items from Udacity data
 */
var options = {
  valueNames: ['project_id', {
      name: 'nanodegree',
      attr: 'data-content'
    }, {
      name: 'checkcert',
      attr: 'data-cert'
    }, {
      name: 'initstate',
      attr: 'data-init'
    },
    'name', 'status', 'money',
  ],
  page: 5,
  plugins: [ListPagination({
      outerWindow: 1
    }),
    ListFuzzySearch()
  ],
  item: '<li class="list-group-item"><div class="row">' +
    '<div class="cell col-sm-1 col-xs-1">' +
    '<a href="javascript:;" class="link pulsed"><span class="project_id"></span></a>' +
    '</div><div class="cell col-sm-5 col-xs-5">' +
    '<span class="name nanodegree" data-placement="auto top" ' +
    'data-toggle="popover"' +
    'data-trigger="hover"></span>' +
    '</div><div class="cell col-sm-2 col-xs-2">' +
    '<span class="status"></span>' +
    '</div><div class="cell col-sm-2 col-xs-2">' +
    '<span class="money" data-placement="auto top" ' +
    'data-toggle="popover"' +
    'data-trigger="hover"></span>' +
    '</div><div class="cell checkbox-slider--a-rounded col-sm-2 col-xs-2">' +
    '<label class="check-label">' +
    '<input class="checkcert initstate" type="checkbox" checked><span></span>' +
    '</label>' +
    '<span class="queue-once hidden-xs">' +
    '<i class="queue-once-button fa fa-lg fa-play-circle-o" ' + 
    'data-placement="auto left" ' +
    'data-toggle="popover"' +
    'data-trigger="hover" data-content="Attempt 1x right now">' +
    '</i></span>' +
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
    dur: '',
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
  ret.forEach(function(project) {

    project.checkcert = (project.status === "certified");
    var qp = myGlobal.queueProjects;
    if (!project.checkcert || !qp.hasOwnProperty(project.project_id)) {
      qp[project.project_id] = project.checkcert;
    }

    project.initstate = qp[project.project_id];

    //pull the project name to the top level
    project.name = project.project.name;
    project.nanodegree = project.project.nanodegree_key + ': ' +
      project.project.hashtag.split(',')[1];
    project.money = numToMoney(+project.project.price);

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
  var spanSt2 =
    '<span class="text-success notes" data-placement="auto bottom" ' +
    'data-toggle="popover" data-trigger="hover" data-content="';

  var startTime = myGlobal.stats.queueStartTime;
  var dur = startTime;
  if (dur !== "not active") {
    dur = moment.duration(startTime.diff(moment())).humanize();
    startTime = startTime.format('LT');
  }

  myGlobal.stats.dur = dur;

  if (hasChanged("queueStartTime")) {
    $('.statTimeStarted').html(
      '<span class="hidden-sm">Queue </span>Start Time: ' +
      spnSt + startTime + '</span>');
  }

  if (hasChanged("dur")) {
    debug("update time active stat triggered");
    $('.statTimeActive').html(
      '<span class="hidden-sm">Queue </span>Time Active: ' +
      spnSt + dur + '</span>');
  }
  if (hasChanged("assignedTotal")) {
    $('.statTotalAssigned').html('Total Assigned: ' + spnSt +
      numWithComs(myGlobal.stats.assignedTotal) + '</span>');
  }
  if (hasChanged("queueRequests")) {
    $('.statTotalRequests').html(
      'Total <span class="hidden-sm">Server </span>Requests: ' +
      spnSt + numWithComs(myGlobal.stats.queueRequests) + '</span>');
  }
  if (hasChanged("assigned")) {
    debug("update assigned stats triggered");
    $('.statCurReviews').html(
      '<span class="hidden-sm">Currently </span>Assigned: ' +
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
  }

  //update our cache
  myGlobal.statsCache = JSON.parse(JSON.stringify(myGlobal.stats));

  //keep firing this unless the setting for it is disabled
  if (myGlobal.updateStats) {
    myGlobal.statTimeOut = setTimeout(updateStats, 1000);
  }

  debug("Update Stats ended");
}

/**
 * check if the current stat is different than the cached version
 * This is used to cut down on the number of unecessary dom manipulations
 * @param  {string} statStr the name of a stat to compare against the cache
 * @return {Boolean} if the stats has changed since last cached
 */
function hasChanged(statStr) {
  var now = JSON.stringify(myGlobal.stats[statStr]);
  var then = JSON.stringify(myGlobal.statsCache[statStr]);
  if (now !== then) {
    return true;
  }
  return false;
}

/**
 * Get JSON from a token to check what projects are assigned
 * @param  {string} token user auth token from Udacity
 */
function assignedCheck(token) {
  debug("Assigned Check triggered");
  token = token || curToken();

  if (myGlobal.queueActive || myGlobal.stats.assigned.length) {
    myGlobal.stats.queueRequests += 1;
    $.ajax({
        method: 'GET',
        url: 'https://review-api.udacity.com/api/v1/me/submissions/assigned.json',
        headers: {
          Authorization: token
        }
      })
      .done(function(data) {
        debug(data);

        myGlobal.stats.assigned = data.map(function(proj) {
          return proj.id;
        });
      })
      .fail(function(error) {
        //TODO, actually handle this fail
      })
      .always(function() {
        if (myGlobal.updateStats) {
          myGlobal.assignedCheckTimeout = setTimeout(function() {
            assignedCheck(token);
          }, 30000);
        }
      });
  } else {
    //keep looping even though we don't pull ajax
    myGlobal.assignedCheckTimeout = setTimeout(function() {
      assignedCheck(token);
    }, 30000);
  }
  debug("Assigned Check ended");
}

function startQueue() {
  $('.toggleQueue').find('.fa').addClass('fa-pause').removeClass('fa-play');

  debug("queue started");
  myGlobal.queueActive = true;
  myGlobal.lastSeenFull = false;
  myGlobal.stats.queueStartTime = moment();
  runQueue(0);
}

function stopQueue() {
  $('.toggleQueue').find('.fa').addClass('fa-play').removeClass('fa-pause');

  debug("queue stopped");
  myGlobal.queueActive = false;
  myGlobal.stats.queueStartTime = "not active";
  clearTimeout(myGlobal.queueTimeout);
  myGlobal.lastSeenFull = false;
}

function startStats() {
  myGlobal.updateStats = true;
  assignedCheck();
  updateStats();
}

function stopStats() {
  myGlobal.updateStats = false;
  clearTimeout(myGlobal.statTimeOut);
  clearTimeout(myGlobal.assignedCheckTimeout);
}

function getDelay() {
  var delayOffset = moment().diff(myGlobal.lastRequestTime);
  var delay = Math.max(0, myGlobal.requestDelaySecs * 1000 - delayOffset);

  //wait longer if the last time we checked we already had
  //a full project log assigned to ease off the server a bit
  //Assume anything more than 1 project is also a reason to slow down
  //by checking assigned length
  if (myGlobal.lastSeenFull || myGlobal.stats.assigned.length > 1) {
    delay = myGlobal.requestDelaySecsFull * 1000;
  }

  return delay;

}

/**
 * Loop to attempt to assign projects using auth token
 * @param  {string} token user auth token from Udacity
 */
function runQueue(i, token) {
  debug("Run Queue triggered");
  token = token || curToken();

  var arr = queueOnly();

  if (i === undefined || i >= arr.length) {
    i = 0;
  }

  debug("queue index: " + i);

  pulse($('.project_id').filter(function() {
    return $(this).html() === arr[i];
  }).closest('li'), 950);
  // TODO: remove this if testing shows set timer looks fine
  // Math.min(950, getDelay()));

  if (arr.length) {
    assignAttempt(arr[i], token)
      .done(function(res) {
        debug(res);
        if (res.result === "error") {
          if (res.info === "full") {
            myGlobal.lastSeenFull = true;
          } else {
            myGlobal.lastSeenFull = false;
          }
          if (res.info === "no auth" || res.info === "unknown") {
            //TODO: make an auth alert for the user
            //turn off the queue since we either
            //have a bad token or an unknown issue
            handleFailAlert();
            stopQueue();
          }
        } else {
          myGlobal.stats.assignedTotal += 1;
          myGlobal.stats.assigned.push(res.info);
          handleAlert(); //try to handle alert such as playing a sound

          //this could check against a known max here to prevent one more
          //server hit but then it would not be dynamic if Udacity
          //changes their max queue size, which is no good
          myGlobal.lastSeenFull = false;
        }

        //start queue again with the next index
        //if the queue is still active
        if (myGlobal.queueActive) {
          myGlobal.queueTimeout = setTimeout(function() {
            runQueue(i += 1, token);
          }, getDelay());
        } else {
          debug("queue halted");
        }
      });
  } else {
    //keep looping even if nothign is selected
    //so that the queue keeps going if things are
    //ticked off and on during the loop
    myGlobal.lastRequestTime = moment();
    runQueue(i);
  }

  debug("Run Queue ended");
}


//Run just a single attempt for one project
//for when you want to grab something but not run your queue
function singleAttempt(id, token) {
  debug("Single Attempt triggered");
  token = token || curToken();

  assignAttempt(id, token)
    .done(function(res) {
      debug(res);
      if (res.result === "error") {
        if (res.info === "full") {
          myGlobal.lastSeenFull = true;
        } else {
          myGlobal.lastSeenFull = false;
        }
        if (res.info === "no auth" || res.info === "unknown") {
          //TODO: make an auth alert for the user
          //turn off the queue since we either
          //have a bad token or an unknown issue
          handleFailAlert();
        }
      } else {
        myGlobal.stats.assignedTotal += 1;
        myGlobal.stats.assigned.push(res.id);
        handleAlert(); //try to handle alert such as playing a sound

        //this could check against a known max here to prevent one more
        //server hit but then it would not be dynamic if Udacity
        //changes their max queue size, which is no good
        myGlobal.lastSeenFull = false;
      }
    });

  debug("Single Attempt ended");
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
  debug(projId);
  myGlobal.stats.queueRequests += 1;
  myGlobal.lastRequestTime = moment();
  $.ajax({
      method: 'POST',
      url: 'https://review-api.udacity.com/api/v1/projects/' +
        projId + '/submissions/assign.json',
      headers: {
        Authorization: token
      }
    })
    .done(function(data) {
      debug(data);
      deff.resolve({
        result: "assigned",
        info: data.id
      });
    })
    .fail(function(error) {
      debug(error);
      var errInfo = myGlobal.errorCodes[error.status] || "unknown";
      deff.resolve({
        result: "error",
        info: errInfo
      });
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
  userList.sort('project_id', {
    order: "asc"
  });
  tour.end();
  $('.jumbotron').addClass('hide');
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

  //show an instructional tour if this is the first load
  //of this tool that makes it to this stage
  tour2.start();
  //remove the throttle on filter updates to the navbar
  setTimeout(function() {
    myGlobal.stats.throttled = false;
  }, myGlobal.eventThrottle);
  debug("Handle Data ended");
}

/**
 * Get JSON from a token using a CORS proxy
 * @param  {string} token user auth token from Udacity
 */
function handleToken(token) {
  debug("Handle Token triggered");
  startSpin(200);

  saveToken(token);

  $.ajax({
      method: 'GET',
      url: 'https://review-api.udacity.com/api/v1/me/certifications.json',
      headers: {
        Authorization: token
      }
    })
    .done(function(data) {
      debug(data);

      //clear out any existing searches for the new data
      $('.my-fuzzy-search').val('');
      $('.my-search').val('');

      var resJSON = JSON.stringify(data);
      if (isJson(resJSON)) {
        saveData(resJSON);

        if (userList.size()) {
          userList.clear();
        }
        userList.filter();
        handleData(resJSON);
        debug('filters cleared');
        stopSpin();
      } else {
        $('#alert1').removeClass('hide');
        //TODO, decide if this should be permanently removed or not
        // deleteToken();
        // $('#lastToken').addClass('hide');
      }
    })
    .fail(function(error) {
      stopSpin();
      $('#alert3').removeClass('hide');
      //TODO, decide if this should be permanently removed or not
      //deleteToken();
      // $('#lastToken').addClass('hide');
    });
  debug("Handle Token ended");
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
    .popover({
      container: 'body'
    }).addClass('hoverable');
  $('.duration').popover({
    container: 'body'
  }).addClass('hoverable');
  $('.queue-once-button').popover({
    container: 'body'
  }).addClass('hoverable');  
  debug("Handle Hover ended");
  $('.checkcert:not([data-cert="true"]').prop("checked", false).prop(
    "disabled", true);
  $('.checkcert:not([data-init="true"]').prop("checked", false);
}

function handleCheck(el) {
  el.setAttribute("data-init", "" + el.checked);
  var project_id = +$(el).closest('.row').find('.project_id').html();
  myGlobal.queueProjects[project_id] = el.checked;
  saveQueueProjects(JSON.stringify(myGlobal.queueProjects));
}

/**
 * Runs any set alerts.  Initially this is a sound alert only
 */
function handleAlert() {
  //sound alert
  if (myGlobal.soundAlert) soundAlert(myGlobal.snd);
  //email alert
  //TODO: finish adding ability to set email settings by user
  //so this is actually useful
  if (myGlobal.emailAlert && myGlobal.stats.assigned.length) {
    var message = myGlobal.stats.assigned.map(function(id) {
      return "https://review.udacity.com/#!/submissions/" + id;
    }).join(' , ');

    debug("email message: " + message);
    sendEmail(message);
  }
}

/**
 * Runs any set alerts for unexpected failure.
 */
function handleFailAlert() {
  //sound alert
  if (myGlobal.soundAlert) soundAlert(myGlobal.failSnd);
  //email alert
  //TODO: finish adding ability to set email settings by user
  //so this is actually useful
  if (myGlobal.emailAlert) {
    var message = "An unexpected error occured and your Udacity " +
    "review queue has stopped";

    debug("email message: " + message);
    sendEmail(message);
  }
}

/**
 * sound helper that will play a sound object after attempting
 * to stop any existing play of that sound currently active
 * @param  {sound object} snd the sound to play / replay
 */
function soundAlert(snd) {
  //stop it before starting in case it is played twice
  //could overlap two sounds but that can get ugly sounding
  snd.pause();
  snd.currentTime = 0;
  snd.play();
}

/**
 * send an email alert via formspree.io service
 * @param  {string} message the email message to send
 */
function sendEmail(message) {
  var email = curEmail();
  if (email.length) {
    $.post("https://formspree.io/" + email, {
        _subject: "review assigned by the queue tool",
        message: "Reviews Currently Assigned"
      },
      function(data) {
        debug(data);
      }, "json");
  }
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
  var content = '' +
    // pre + 'Project ID: ' + '<a target="_blank" href="' +
    //             data.link + '">' + data.project_id + '</a></li>' +
    pre + 'Project Title: ' + data.project.name +
    ' (ID: ' + data.project_id + ')</li>' +
    pre + 'Nanodegree: ' + data.nanodegree + '</li>' +
    pre + 'Project Status: ' + data.status +
    ' (Active: ' + data.active + ')</li>' +
    pre + 'Grader ID: ' + data.grader_id + '</li>' +
    pre + 'Current Price: ' + data.money + '</li>' +
    pre + 'Training Count: ' + data.trainings_count + '</li>' +
    pre + 'Created: ' + moment(data.created_at).format('llll') + '</li>' +
    pre + 'Certified: ' + moment(data.certified_at).format('llll') + '</li>' +
    pre + 'Updated: ' + moment(data.updated_at).format('llll') + '</li>';

  //start section that is likely to be null
  if (data.waitlisted_at) {
    content += pre + 'Waitlisted: ' + moment(data.waitlisted_at).format(
      'llll') + '</li>';
  }
  if (data.project.required_skills) {
    content += pre + 'Required Skills: ' + marked(data.project.required_skills) +
      '</li>';
  }
  if (data.training_id) {
    content += pre + 'Training ID: ' + data.training_id + '</li>';
  }
  if (data.project.file_filter_regex) {
    content += pre + 'File Filter Regex: ' + data.project.file_filter_regex +
      '</li>';
  }
  if (data.project.waitlist !== undefined) {
    content += pre + 'Waitlist: ' + data.project.waitlist + '</li>';
  }
  if (data.project.upload_types.length > 0) {
    content += pre + 'Upload Types: ' + data.project.upload_types.join(', ') +
      '</li>';
  }
  if (data.project.description) {
    content += pre + 'Description: ' + marked(data.project.description) +
      '</li>';
  }


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
    if (myGlobal.datePickerEnabled) filterListDates();
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
function filterListDates() {
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
  aux.rows = "10";

  aux.value = "copy(JSON.parse(localStorage.currentUser).token)";

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
    } else {
      debug('Handling Data as no token found on refresh');
      var oldData = curDataStr();
      if (oldData !== '') {
        userList.clear();
        resetStats();
        handleData(oldData);
      } else {
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

  if (myGlobal.spinner === undefined) {
    myGlobal.spinner = new Spinner();
  }
  myGlobal.timerTimeout = setTimeout(function() {
    myGlobal.spinner.spin(document.getElementById('spin-target'));
    $('.fa-refresh').addClass('fa-spin');
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
  $('.fa-refresh').removeClass('fa-spin');
}

/**
 * Enables and disables custom darker page theme
 */
function toggleTheme(firstLoad) {
  var themeState = localStorage.getItem('themeState') || "on";
  if (!firstLoad) {
    themeState = (themeState === "on") ? "off" : "on";
    localStorage.setItem('themeState', themeState);
  }
  themeState === "on" ? themeOn() : themeOff();
}

/**
 * enable custom darker page theme
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
 * Enables and disables custom darker page theme
 */
function toggleSound(firstLoad) {
  var soundState = curSound();
  if (!firstLoad) {
    soundState = (soundState === "on") ? "off" : "on";
    saveSound(soundState);
  }
  soundState === "on" ? soundOn() : soundOff();
}

/**
 * enable sound alert
 */
function soundOn() {
  $('.toggleSound').find('.fa').addClass('fa-volume-up').removeClass(
    'fa-volume-off');
  myGlobal.soundAlert = true;
}

/**
 * disable sound alert
 */
function soundOff() {
  $('.toggleSound').find('.fa').addClass('fa-volume-off').removeClass(
    'fa-volume-up');
  myGlobal.soundAlert = false;
  myGlobal.snd.pause();
  myGlobal.snd.currentTime = 0;
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
  var navSize = $('.navbar-header').outerHeight(true) || $('#navbar').outerHeight(
    true);
  var listMargins = 22;
  var wiggleRoom = 25;

  var baseSize = filterSize + buttonSize + pageSize +
    navSize + listMargins + wiggleRoom;

  var rawNum = (window.innerHeight - baseSize) / itemSize;
  return Math.max(rawNum, 5); //show 5 items or more always
}

/**
 * convert a number to monetary format with $ and commas
 * will also work with a number parsable string as input
 * @param  {number} num [number to convert to money string]
 * @return {string}   [string in format of $1,000.00]
 */
function numToMoney(num) {
  num = Math.round(num * 100) / 100;
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
function nameInArr(name, arr) {
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
  return $.grep(arr, function(e) {
    return e.name == name;
  });
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
  return JSON.parse(curQueueProjectsStr() || '{}');
}

function saveSound(data) {
  localStorage.setItem('lastSoundToggle', data);
}

function deleteSound() {
  localStorage.removeItem('lastSoundToggle');
}

function curSound() {
  return localStorage.getItem('lastSoundToggle') || "on";
}

function saveEmail(data) {
  localStorage.setItem('lastEmailToggle', data);
}

function deleteEmail() {
  localStorage.removeItem('lastEmailToggle');
}

function curEmail() {
  return localStorage.getItem('lastEmailToggle') || "on";
}

function saveEmailAddress(data) {
  localStorage.setItem('lastEmailAddress', data);
}

function deleteEmailAddress() {
  localStorage.removeItem('lastEmailAddress');
}

function curEmailAddress() {
  return localStorage.getItem('lastEmailAddress') || "";
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
 * @param  {number} delay time to keep effect in place (defaults to 200)
 */
function pulse(el, delay) {
  delay = delay || 200;
  if (!el.jquery) el = $(el);
  el.addClass('pulse');
  setTimeout(function() {
    el.removeClass('pulse');
  }, delay);
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
$('#lastData').click(function() {
  if (!myGlobal.loadingNow) {
    var oldData = curDataStr();
    if (isJson(oldData)) {
      handleData(oldData);
    } else {
      $('#alert2').removeClass('hide');
    }
  }
});

/**
 * click handler for the button that loads previously saved
 * user data from localStorage
 */
$('#lastToken').click(function() {
  if (!myGlobal.loadingNow) {
    var oldToken = curToken();
    handleToken(oldToken);
  }
});

/**
 * click handler for the helper code button in navbar
 */
$('.copyCode').click(function() {
  copyCodeToClipboard();
});

/**
 * click handler for the stop start button in navbar
 */
$('.toggleQueue').click(function() {
  if (myGlobal.queueActive) {
    stopQueue();
  } else {
    startQueue();
  }
});

/**
 * click handler for the data refresh in navbar
 */
$('.refreshData').click(function() {
  refreshData();
});

/**
 * click handler for .json export in navbar
 */
$('.exportJSON').click(function() {
  exportJSON();
});

/**
 * click handler for CSV export in navbar
 */
$('.exportCSV').click(function() {
  exportCSV();
});

/**
 * click handler for theme toggle in navbar
 */
$('.toggleTheme').click(function() {
  toggleTheme();
});

/**
 * click handler for theme toggle in navbar
 */
$('.toggleSound').click(function() {
  toggleSound();
});

/**
 * click handler for objects that get a pulse visual effect
 */
$('body').on('click', '.pulsed', function() {
  this.blur();
  pulse(this);
  pulse($(this).find('.fa'));
});

/**
 * click handler for id links to open modal for that id
 * set to inherit event from main list since these are
 * dynamic appends
 */
$('#main-list').on('click', '.project_id', function() {
  handleModal(this.innerHTML);
});

/**
 * click handler for id links to open modal for that id
 * set to inherit event from main list since these are
 * dynamic appends
 */
$('#main-list').on('click', '.queue-once', function() {
  var id = $(this).closest('.row').find('.project_id').html()
  //make entire row pulse
  pulse($(this).closest('li'), 950);

  singleAttempt(id);
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
  if (!myGlobal.loadingNow) {
    $('.my-fuzzy-search').val('');
    clearTimeout(myGlobal.searchTimeout);
    //use 200ms timer to check when active typing has ended
    myGlobal.searchTimeout = setTimeout(function() {
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

  if (!myGlobal.loadingNow) {
    $('.my-search').val('');
    clearTimeout(myGlobal.searchTimeout);
    //use 200ms timer to check when active typing has ended
    myGlobal.searchTimeout = setTimeout(function() {
      var filterArr = ['id', 'name', 'status', 'active'];
      userList.fuzzySearch.search($('.my-fuzzy-search').val(),
        filterArr);
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
    if (isJson(this.value)) {
      //store this data in case we want to reload it
      saveData(this.value);
      handleData(this.value);
      this.value = '';
    } else {
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
$('.help').popover({
  container: 'body'
});
$('.refreshData').popover({
  container: 'body'
});

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
window.onresize = function() {
  clearTimeout(myGlobal.resizeTimeout);
  //prevent scrollbar on resize and restore after resize ends
  $('html, body').css('overflow-y', 'hidden');
  //use timer to check when active resizing has ended
  myGlobal.resizeTimeout = setTimeout(function() {
    $('html, body').css('overflow-y', 'visible');
    var oldPageSize = userList.page;
    var newPageSize = getPageSize();
    userList.page = newPageSize;
    userList.update();
    userList.show(1, userList.page);
    if (newPageSize > oldPageSize) handleHover();
  }, myGlobal.sizeThrottle);
};

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
  toggleSound(true); //set sound off if it was off on last load
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
  //show an instructional tour if this is the first load of this tool
  tour.start();
});

//ajax cors proxy setup.  Should only be enabled if API cors headers are
//still having issues.  Toggled via myGlobal.useProxy setting.
$.ajaxPrefilter(function(options) {
  if (myGlobal.useProxy && options.crossDomain && jQuery.support.cors) {
    options.url = 'https://corsproxy-simplydallas.rhcloud.com/' + options.url;
  }
});