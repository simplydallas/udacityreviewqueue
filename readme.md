# Udacity Completed Review Viewer

### Steps to get this working

1. Download/clone this repository and open the index.html file or open the [live version here](https://simplydallas.github.io/udacityreviewqueue/).  (live version is recommended)
  * If you have already used this in the past and there has been an update, remember to force a refresh without browser cache.  The method for that depends but it is generally one of the following:
  ```
  Windows: ctrl + F5 or shift + F5
  Mac/Apple: Apple + R or command + R
  Linux: F5
  ```
2. Open the [Udacity reviewer dashboard](https://review.udacity.com/#!/submissions/dashboard) and make sure you are logged in
3. Get your token.  You can do this by either using the API Access link and copying all of the random looking text in the text area and copying it to your clipboard or you can do it from the dev console by pasting the following into the console and hitting enter (it will then be in your clipboard):
  ```
  copy(JSON.parse(localStorage.currentUser).token)
  ```
  * opening the dev console changes based on your browser but for chrome it is `Control+Shift+J` in windows and `Command+Option+j` on a Mac.

4. In the webpage/tool paste your token into the text box and hit enter
5. There is a small refresh icon in the top right that you can use to update data without reloading the page.  You should very rarely have to do this but if you have a project come out of training or something, it may be useful.
6. Your data is also stored locally on your pc.
  * If you refresh after the first use you should see a button that says `Load locally stored list from last refresh`.
  * This will not pull fresh data from Udacity but it will let you see your last loaded data without getting it and pasting it again.
  * You will also see a button that says: `Continue with the token you last used`.  This will fetch new data from Udacity.
7. Once the page is loaded, there will be toggle switches next to each project.  Turn them on for the ones you want to assign and off for any you want to ignore.
8. In the top right, there is a play button.  Hit this and it will start trying to gather projects for you.  It will try roughly once a second per request and you can tell which project it is currently trying to grab as it will flash green if it is currently visible on the page.
  * If you hit your max number of reviews, the queue will continue but it will only try once every minute or so until it gets a response other than one saying your queue is full.  It will the return back to once a second.
9. In the navbar there are some stats.  The most important of these is the one that says Currentl Assigned.  If this says more than 0, you can open the dropdown and there will be a link to any currently assigned project in there that when clicked will open the review for editing (on the Udacity page)

### Theme

* The default theme can be toggled off to show a mostly white layout similar to the default Udacity or Bootstrap theme.  Just click the little paintbrush in the top right.  It will remember your preference for next time.

### The following information is presented

* Project id
  * id is the default sort item and is in descending order
  * a click on the id will opan a modal with detailed information.
* Project name
* Project certification status (training, certified, etc.)
* Current active stats
  * This is the active state in the Udacity dashboard, so basically if you have it checked off as a review you want in the actual Udacity review site.  This is not an indication of if you have it toggled on in your queue.
* Queue toggle
  * green is on, white is off, and grey is disabled because you are not certified yet.

#### Basic overall stats are shown on the navbar / header

* Current projects assigned (dropdown menu shows links to those prokjects)
  * This updates every 30 seconds or so if you have the queue active or if you have at least one project showing assigned
* Total Assigned count
  * this is a count of all assignments the tool has claimed for you this session
* Total Server Requests
  * This increments every time you check a project in the queue and for the 30 second assigned list update.
* Queue time active
  * This is a rough plain English measurement of how long the queue has been running since the last time you started it.
* Queue start time (time stamp of when you started the current queue session)

### Search and filter options

* There are two search boxes where you can search for text from any of the visible data points to narrow down your results.  This will mostly be useful if you are certified for a lot of projects.
  * Strict Search is your standard search that will only show things with `excd` in a field if you search for `excd` (so probably nothing).
  * Fuzzy Search is a proximity search and works closer to what you see in a web search engine.  `excd` will return things like `exceeded` as well as anything that says `excd`.
  * The two types of search are exclusive and only one can be used at a time.

### known issues and caveats

* The code needs a lot of cleanup.
* Better error handling for unknown errors, auth errors, etc. are needed.
* Options to be alerted need to be improved.
* modal is ugly on some projects due to overflow

### Possible enhancements (feel free to pull requests these or anything else you find useful and we will discuss it)

* Possibly change result column to feedback with result hover instead of the other way around once more than 30 days of history is enabled for feedback (supposed to be next week).


-Dallas Frank