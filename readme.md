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
  * It is worth noting that even while the queue is running you can still toggle these on and off without restarting the queue.  If you have none toggled on, no actual server request will be sent but the queue will continue checking until you turn it off.
8. In the top right, there is a play button.  Hit this and it will start trying to gather projects for you.  It will try roughly once every two seconds per request and you can tell which project it is currently trying to grab as it will flash green if it is currently visible on the page.
  * If you hit your max number of reviews, the queue will continue but it will only try once every minute or so until it gets a response other than one saying your queue is full.  It will the return back to once every two seconds.
9. In the navbar there are some stats.  The most important of these is the one that says Currentl Assigned.  If this says more than 0, you can open the dropdown and there will be a link to any currently assigned project in there that when clicked will open the review for editing (on the Udacity page)

### Theme

* The default theme can be toggled off to show a mostly white layout similar to the default Udacity or Bootstrap theme.  Click the settings cog in the top right and then the paintbrush.  It will remember your preference for next time.

### Sound

* The default is on.  There is a sound that will play when any project is assigned form the queue by the tool.  Click the settings cog in the top right then the volume iconto toggle this setting.  This will also impact the unexpected error sound.  Your preference is remembered for next time.

### Idle timer
* User testing has shown this tool to be stable and it will usually run for days without issue if no network connectivity issues occur.  So to reduce potential impacts for students when something happens to you such as falling asleep with the queue active, there is a 4 hour timer that will stop the queue.  Every time you have any activity on the page it will restart this 4 hour timer from the beginning.  Activity includes things like scrolling, moving the mouse, clicking, typing, or touching on mobile.  If the idle timer stops the queue you can restart it by pressing the play button as usual.

### The following information is presented

* Project id
  * id is the default sort item and is in descending order
  * a click on the id will opan a modal with detailed information.
* Project name
* Project certification status (training, certified, etc.)
* Current price
  * This is the price the last time you refreshed your certification list using your token so it can get out of date.
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

* The code is growing organically so it is probably hard to grok and could use some better organization.
* Options to be alerted need to be improved.
* modal is ugly on some projects due to overflow

### Possible enhancements (feel free to pull requests these or anything else you find useful and we will discuss it)

* More alerts besides just the one sound.  Possibly email, etc.
* Much more obvious display of currently assigned projects instead of only the navbar dropdown.
* Error/issue alert improvements
* Turn off the queue automatically if a specific review id is detected multiple times in the off chance someone is leaving their queue on, letting projects expire, and picking them back up again automatically as they expire.

-Dallas Frank