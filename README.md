# Ganchos

## What is it?
A tool written in typescript and node.js designed to run in the background on a machine listening for events such as file system events (deleting, adding files, etc), certain network events, and other events like key presses (future enhancement). Events are broadcasted out to plugins and the ones that are configured to care about a certain event will be executed. There is also the option for simple scheduling to be turned on for a plugin so that it can be run on an interval. This can be combined with the event based execution. A plugin can be anything. A program you built, or an existing one someone else made that has a thin wrapper around it to make it work with Ganchos.

## Why? 
<i><b>The real reason is that it's been the project I've used to play with different technologies over the years: typescript, react/redux, rust, low level network programming, etc. I also use it on my local machines.</i></b>

Provide a simple and straightforward way to add custom automation to your machine. The idea behind Ganchos is to provide a cross-platform way to easily hook into events and run code in response without having to worry about common concerns like:
 1. __Logging__. There is consistent logging that happens in Ganchos in order to make things as transparent as possible if something goes wrong. Logging is also   available to the plugins, Ganchos will automatically use their use stderr/stdout to manage logging at the plugin level. The intent is to make it easy to track down issues--wherever they occur--so that time is not wasted when something is not working as expected.
 2. __Configuration__. How ganchos operates is highly configurable, though it should just work with the defaults. The other type of configuration is for the plugins. Ganchos provides some basic configuration for all plugins: enabling/disabling, limiting a plugin to only run on a certain OS, etc. The rest is up to the plugin itself. Everything is driven from JSON config files, and all config related files and plugins are hot-loaded so that the app won't have to be restarted when making changes.
 3. __Encapsulate the drudgery__. A goal of Ganchos is to handle the tedious work of ensuring plugins don't run out of control, determining when they should or should not run, that they are not interfering with themselves or other plugins when running, that issues of concurrency are handled properly, etc. It manages these types of concerns so that the user can just drop a plugin into a directory and not have to worry about all the other stuff that goes on behind the scenes to make it work. A future version will include a web based UI that allows viewing of logs and tracing the activity of a plugin over time spans. As well as configuration of the various plugins, viewing the health of the Ganchos system--things along those lines. Currently this is not yet available.

## How to use it?
The following examples assume that Ganchos is [installed and running](https://github.com/Isopolito/Ganchos/blob/master/README.md#installing-and-running-ganchos).
<br>When testing plugins, it's helpful to have a terminal up with a `tail -f` on today's log. If in production these would be in: `~/.ganchos/logs/DATE-plugin`.
*Note most file related activity in Ganchos is hot-loaded so no need to restart the app after creating these examples.*

__Example 1: Create a plugin to wrap around the unix command `ls` that runs every minute__
  1. Go to the default plugin directory
     <br>`cd ~/.ganchos/plugins` 

  2. Create the new plugin using the stubbed out bash script template. *Note that the template already uses `ls` command as an example.*
     <br>`ganchos --template bashwrapper > newPlugin.sh`
  
  3. Give execute permissions to new script
    <br>`chmod 755 newPlugin.sh`

  5. Create meta file for new plugin
     <br>`ganchos --template meta > newPlugin.meta`
  
  5. Configure it. For this example make sure to set:
     * `putDataInEnvironment`: true 
     * `execFilePath`: "newPlugin.sh"
     * `isEligibleForSchedule`: true
     * `defaultConfig`: { "runEveryXMinutes": 1 }

---

## What is a plugin in Ganchos?
Located: All directories listed in [general config's](https://github.com/Isopolito/Ganchos#general-settings) `pluginPaths` setting

A plugin has two parts: the file to execute and the meta file. . Restarting Ganchos is not necessary when a plugin has been added, deleted, or modified. When it's time to run a plugin, by default Ganchos will pass in the data as parameters to the execution file in the following order:

1. __Plugin Configuration__ (JSON string): This is the [plugin configuration](https://github.com/Isopolito/Ganchos#plugin-configuration-files) file that lives in `~/.ganchos/config/plugins/PLUGIN_NAME`. 
2. __Event Type__ (string): You can see the options [here](engine/src/shared/plugins/EventType.ts). Will be 'none' if the plugin is called because of something other than an event.
3. __Event Data__ (JSON string): A serialized instance of [this](engine/src/shared/plugins/EventData.ts). Will be empty if executed because of something other than an event.

If however the meta file setting `putDataInEnvironment` is true, the data for each of the above parameters will be split up into variables and placed 
into the environment the plugin executes in. See below _Optional Meta File Properties_ for details.

#### The file to execute
This should be a script or a binary file. Ganchos looks at the file extension to determine what type of file it is and how to run it. Files ending in `.js` will be ran with node.js. Other types of files should have execute permissions. When using an existing program as a Ganchos plugin, this file can be a script that takes the input data from Ganchos and calls the program passing in the data in the form it needs. The script can get fancy and download the program if it doesn't exist, or compile it if the source code is provided with the plugin. A plugin and its files can be in a separate directory inside of `pluginPaths`, which helps in organizing plugins since there can be many files as part of a plugin.

#### The meta file
A meta file is a text file in JSON that describes to Ganchos what the plugin is, and how to run it. Typically a user that didn't write a plugin *shouldn't* have to modify this. 

*Note: Any JSON consumed by ganchos can have comments included like this: `// rest of this line is ignored`. These will be stripped out internally before Ganchos parses it.*

##### Mandatory Meta File Properties

* `name`: *String*; the name of the plugin as it will show up in the UI
* `description`: *String*; describe what the plugin does
* `category`: *String*; for grouping plugins by function: media, filesystem, etc
* `defaultConfig`: *JSON String*; will be the configuration used by the plugin the first time it's run. Ganchos will automatically create
 the plugin's JSON configuration file on disk with this after the first run. Can be empty, i.e. `{}`.
* `execFilePath`: *String*; The plugin code file to execute, can be a binary file or a script. First Ganchos will check to see if the path exists as provided. 
This allows a fully qualified path to be used and the plugin can live anywhere on the system. If it's not found, the path will be 
treated as relative to the plugin directory where the meta file lives.

##### Optional Meta File Properties
* `putDataInEnvironment`: *Boolean*; when true will put the input data to the plugin into the environment instead of passing it in as parameters to the exec file. Useful for shell scripts. Ganchos [Event Type](engine/src/shared/plugins/EventType.ts) and [Event Data](engine/src/shared/plugins/EventData.ts) will be preceded by `ganchos_`. For instance: `ganchos_eventType`. EventData will have all the non-null properties provided in the same format, ex: `ganchos_filePath`.  All the [plugin configuration](https://github.com/Isopolito/Ganchos#plugin-configuration-file-options) settings will be saved into the environment like `ganchosConfig_SETTINGNAME`.
* `isEligibleForSchedule`: *Boolean*; when true, plugin will be ran by the scheduler on startup and then on the interval provided by the `runEveryXMinutes` plugin configuration setting
* `osTypesToRunOn`: *Array of strings*; if provided, the plugin will only run on the os types in the list. Values are: 'aix' | 'darwin' | 'freebsd' | 'linux' | 'openbsd' | 'sunos' | 'win32'
* `eventTypes`: *Array of strings*; the plugin will be executed when an event in the list occurs. If this is empty the plugin will ignore events altogether. 
For file system events, the plugin configuration `watchPaths` and `excludeWatchPaths` properties can be used to include or ignore a plugin respectively.

  Below are the available [Event Types](engine/src/shared/plugins/EventType.ts) by category.

  1. **File system**: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir' | 'ready' | 'raw' | 'error' 
  <br>EventData properties for this event: `filePath`

  2. **Network**: 'inetChange' | 'inetUp' | 'inetDown'. 
  <br>EventData properties for event `inetChange`: `oldIpAddress`, `newIpAddress`

  3. **General purpose**: 'none' 
  <br> If a plugin executes because of something other than an event (ex: scheduling) the eventType will be 'none'

## Plugin Configuration
Located: `~/.ganchos/config/plugins/PLUGIN_NAME`

The plugin configuration file is what the user modifies in order to control how the plugin operates

*Note: Any JSON consumed by ganchos can have comments included like this: `// rest of this line is ignored`. These will be stripped out internally before Ganchos parses it.*

Configuration files for the plugins are JSON objects. They most likely won't exist the first time a plugin is run, however they will be created automatically based on the `defaultConfig` value provided in the plugin's meta file. The configuration files must have the exact same name as what's in the `name` field of the plugin meta file--that's how they're located. The contents of this file is the JSON configuration that is passed into the plugin on execution (or put into the environment if that meta file setting is used). These will be hot loaded by Ganchos, so no need to restart the application after modification.

*Note: The config settings below are completely optional and are used by Ganchos if they are in the plugin config file* 

* `enabled`: *Boolean*; if provided and true (or when not provided at all) the plugin will be turned on. If value is false, the plugin is turned off and ignored.
* `watchPaths`: *Array of strings*; listen for events on these file system paths
* `excludeWatchPaths`: *Array of strings*; ignore these paths when listening for events
* `runDelayInMinutes`: *Number*; if provided and greater than 0, will wait for desired number of minutes (fractional values acceptable) before executing plugin logic. This can be used as rudimentary means for chaining together plugins. For example if you wanted plugin A and plugin B to respond to the same thing but you want A to run first, you could delay B so that it runs after A is finished. This has it's limitations because plugin A has to consistently finish in
a certain amount of time in order to know how long to delay B for. 
* `runEveryXMinutes`: *Number*; if a plugin is marked as eligible for scheduling, this will be the value used for the waiting interval between executions. Fractional numbers are acceptable. 
If the number is less than the value in general settings--`pluginScheduleIntervalFloorInMinutes`--scheduling will be disabled for the plugin. This is a safety mechanism so that a plugin can't accidentally be set to run too often. 
In these cases, Ganchos will check every 5 minutes to see if the plugin configuration has been updated to an acceptable value, if so it will be reschedule it.

## General Configuration
Located: `~/.ganchos/config/general`

These are the [configuration settings](engine/src/shared/config/GeneralConfig.ts) that will control how ganchos operates.
* `pluginPaths`: Array of string. (*default*: ~/.ganchos/plugins) - All the paths to monitor for plugins.
* `pluginMetaExtension`: (*default*: 'meta') - The extension Ganchos uses to identify the `meta` file of a plugin.
* `pluginScheduleIntervalFloorInMinutes`: (*default*: 0.5) - If a plugin configuration has scheduling interval lower than this number, it will not be executed. This is a way to protect against a misconfigured plugin running out of control.
* `eventQueuePluginExecutionTimeout`: (*default* 0) If a plugin takes longer than this amount of time to execute (milliseconds) it will be killed. 0 disables this.
* `eventQueuePluginExecutionConcurrency`: (*default* 3) How many instances of the same plugin can run concurrently.

## Environment Variables
* `DEBUG`: a truthy value will turn on extra logging
* `NODE_ENV`: will determine which config directory to use, `~/.ganchos` in production mode (the default). Setting this to DEV is useful for local development.

## Command line arguments
-t, --template: Print out a template. Takes a value that specifies what type of template to generate
   * meta: A standard plugin meta file.
   * bashwrapper: A bash script file stubbed out to wrap around an existing program to use a Ganchos plugin.
-v, --version: Print out version of ganchos and exit.

## Logs
Located: `~/.ganchos/logs`

Logs are split into two files: general and plugins. Each log file is named with the date and the type of log file it is (general or plugin). All the logging that is specific to Ganchos will be in the `-general` file. Log messages coming from a plugin will be in the `-plugin` files. The severity options (what type of log message it is) can be found [here](engine/src/shared/logging/SeverityEnum.ts).

Ganchos will take all plugin output from stderr and will mark it with a severity of `pluginError`. Stdout will be logged as `pluginInfo`. There's an area field in the log output, this can be useful for pinpointing exactly where the message is coming from. If Ganchos detects a `|*|` separator in the plugin output (stderr and stdout) it will split the message on it and the first part will be the log area, the second part will be the message itself.

## Installing and Running Ganchos
* `npm i ganchos`
* `ganchos` 
* Ganchos plugins will automatically be available. Drop plugins into one of the plugin directories configured in the ganchos general config file `~/.ganchos/config/general`

## Goals
* Continue to improve performance
* Get UI developed so that it can provide an easy way to manage everything.
* Make it work on other operating systems (maybe not imporant). Currently only tested on Linux.
* Build in the ability to chain multiple plugins together. A crude version of this can be implemented via delay configuration, but it's not an ideal solution.
* Continue to add logic for detecting events. Key presses, more events for networking activity, etc. 

## Contributing 

Contributing is encouraged and a PR is always welcome. Please create issues for bugs and enhancement requests. 

__For PR's:__
 1. Turn on the pre-push git script for running unit tests before pushing commits. This can be done by running `scripts/install-hooks.sh`
 2. After making changes, the [test_plugins](test_plugins/README.md) can be used as a semi-automated version of integration tests. The README in that directory explains how to use it.
 3. In general, back ticks are used for strings. Single quotes for imports, no semi-colon after import statements.
