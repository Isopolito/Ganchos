These plugins act as an integration test for Ganchos. They cover fs events (adding,deleting files and directories), 
events for the internet going up/down, and external ip address changing. Plugin input data is put into the environment 
for some plugins and passed in as JSON strings for others, so that functionality is tested here too. Unfortunately, 
things aren't fully automated yet though. 

There is a bash script in this directory that will help out by doing things like creating and deleting files. 
It has the temp directory matching what's in the test_addOrDelete plugin: ~/tmp. To run: `triggerFsEvents.sh`

The internet can be turned off and on to test the inetUp/Down events. If you have a VPN, changing servers will easily fire off the ipChange event. 

The test_schedule script, runs every minute. It will fire off when Ganchos starts up, and then every minute after that. 
So have the integration test run for at a couple of minutes.

Finally, once all the events have been triggered there is a script that will check the logs to ensure that the plugins responded properly to the events. 
To run: `nodejs verifyLogs.js GANCHOS_DIR_PATH` where GANCHOS_DIR_PATH is the directory where you're currently testing Ganchos.

TODO: 
1. Rewrite the bash plugins to javascript files so it's not OS dependent
2. Automate as much of this process as possible. One potential way to make this a little smoother
  is to start the verifyLogs script before the test. It will monitor the log file for the expected actions,
  and print to screen the log messages it expects to find when it finds them. Once everything
  is found, the program will says so and then exit.


