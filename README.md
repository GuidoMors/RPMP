**RPMP: Roleplaying Music Player**

A useful tool for Dungeonmasters and Handlers which can play music through your browser. 

The music comes from google spreadsheets you can configure yourself with links to youtube and mp3's in google drive.


**SETUP:**

-create spreadsheet containing your music using the following example: https://docs.google.com/spreadsheets/d/1alcp3kRT8cPaMXm4fr4xqSQfg-RSK8kp6Jkb5-u2GcQ/edit?gid=0#gid=0

-setup spreadsheats.json (see below)

-do npm install to get the node modules





**SETTING UP SPREADSHEETS.JSON**

Copy spreadsheets-example.json and rename it to spreadsheets.json all within the same folder. Then fill in the fields:

APIKEY: request an api key for your own google environment https://support.google.com/googleapi/answer/6158862?hl=en

SPREADSHEET ID: you can get the spreadsheet id from the google drive url.

For example if the url is: https://docs.google.com/spreadsheets/d/1alcp3kRT8cPaMXm4fr4xqSQfg-RSK8kp6Jkb5-u2GcQ/edit?gid=0#gid=0

the spreadsheet has id:                                           1alcp3kRT8cPaMXm4fr4xqSQfg-RSK8kp6Jkb5-u2GcQ

OTHER FIELDS: the name and shorthand of the spreadsheat can be anything. The name of a tab has to be the exact name that it has in the google drive spreadsheet. You can find the tab names at the bottom while having the spreadsheet open.



**LAUNCHING RPMP:**

execute run.bat
