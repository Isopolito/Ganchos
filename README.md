# Ganchos

A tool written in typescript and node.js designed to run in the background on a machine listening for events such as file system events (deleting, adding files, etc), certain network events, and other 
events like key presses. Events are broadcasted out to the plugins and the ones that are configured to care about a certain event will be executed. There is also a simple scheduling
ability to optionally turn on for a plugin so it can be run on an interval. Everything is driven from JSON config files and configuration and new plugins are hot-loaded so 
that the app won't have to be restarted when modifying, removing, configuring or adding plugins. Logging occurs both on the plugin level and a general operational level. 

There are mechanisms to make all of this robust and safe in the sense that plugins won't get called out of control and bog down the system. Also with the logging and hot-reload configuration,
it's meant to handle all the drudgery and complications like concurrency issues, consistent configuration, and thread safe logging--things of that nature--so that you can write simple code 
to do stuff automatically on your machine in any language and seamlessly plug it in to the ganchos system and not have to worry about anything else. As long as the plugin implements 
the required contract (Plugin settings below) things will work seamlessly.

A future version will include a web based UI that allows viewing of logs and tracing the activity of a plugin over time spans. As well as configuration of the various plugins, viewing the health
of the Ganchos system--things along those lines. Currently this part of Ganchos is not yet available.

### Plugins
`TODO`: write this. talk about different ways plugins can receive event data, config. When set as environment ganchos_ and ganchosConfig_

## Environment Variables
* `DEBUG`: a truthy value will turn on extra logging for general and plugins
* `NODE_ENV`: will determine which config directory to use, `~/.ganchos` in production mode.

## Configuration

### General Settings
Located: `~/.ganchos/config/general`

`TODO`: write this
* `pluginPaths`: (*default*: ~/.ganchos/plugins) -
* `pluginMetaExtension`: (*default*: 'meta') - 
* `pluginScheduleIntervalFloorInMinutes`: (*default*: 0.5) - 
* `eventQueuePluginExecutionTimeout`: 0, // No timeout
* `eventQueuePluginExecutionConcurrency`: 3, // Each plugin can only have 3 executions concurrently when responding to events

### Plugin Settings
Located in the `meta` file associated with plugin. See an example of this file type [here](shared/src/plugins/DefaultPluginMetaFile.meta).
<br>

Plugin settings are what Ganchos uses in order to know how to properly run and display a plugin. A user that didn't write a plugin *shouldn't* have to modify this.
It can be thought of as configuration geared towards Ganchos. The distinction between this and the **Plugin Configuration Files** is that the latter are geared towards 
the end user. It's what they use to configure how the plugin operates.

*Note: Any JSON consumed by ganchos can have comments included like this: `// rest of this line is ignored`. These will be stripped out internally before Ganchos parses it.*

#### Mandatory

* `name`: *String*; the name of the plugin as it will show up in the UI
* `description`: *String*; describe what the plugin does
* `category`: *String*; for grouping plugins by function: media, filesystem, etc
* `defaultJsonConfig`: *JSON String*; will be the configuration used by the plugin the first time it's run. Ganchos will automatically create
 the plugin's JSON configuration file on disk with this after the first run.
* `execFilePath`: *String*; The plugin code file to execute. First Ganchos will check to see if the path exists as provided. 
This allows a fully qualified path to be used and the plugin can live anywhere on the system. If it's not found, the path will be 
treated as relative to the plugin directory where the meta file lives.

#### Optional
* `isEligibleForSchedule`: *Boolean*; when true, plugin will be ran by the scheduler on startup and then on the interval provided by the `runEveryXMinutes` plugin configuration setting
* `osTypesToRunOn`: *Array of strings*; if provided, the plugin will only run on the os types in the list. Values are: 'aix' | 'darwin' | 'freebsd' | 'linux' | 'openbsd' | 'sunos' | 'win32'

`TODO`: list other types of events
* `eventTypes`: *Array of strings*; the plugin will be executed when events in the list occur on paths being watched (`watchPaths`) by the plugin. 
File System Event Values: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir' | 'ready' | 'raw' | 'error' | 'none';

### Plugin Configuration File Options
Located: `~/.ganchos/config/plugins`

*Note: Any JSON consumed by ganchos can have comments included like this: `// rest of this line is ignored`. These will be stripped out internally before Ganchos parses it.*

Configuration files for the plugins are JSON objects. Located in `~/.ganchos/config/plugins` directory. They most likely won't exist the first time a plugin
is run, they will be created automatically based on the `(get)defaultJsonConfig` value provided in the plugin's settings. The configuration 
files must have the exact same name as what's in the `name` field of the plugin settings (meta file)--that's how they're located. The contents of this file is the JSON configuration that is passed into the plugin on execution. 

*Note: A plugin can specify any configuration setting that it needs. The ones below are the configuration options recognized and used by Ganchos and are completely optional.* 

* `enabled`: *Boolean*; if provided and true (or when not provided at all) the plugin will be turned on. If value is false, the plugin is turned off and ignored.
* `watchPaths`: *Array of strings*; listen for events on these file system paths
* `excludeWatchPaths`: *Array of strings*; ignore these paths when listening for events
* `runDelayInMinutes`: *Number*; if provided and greater than 0, will wait for desired number of minutes (fractional values acceptable) before executing plugin logic. This can be used as rudimentary means for chaining together plugins.
For example if you wanted plugin A and plugin B to respond to the same thing but you want A to run first, you could delay B so that it runs after A is finished. This has it's limitations because plugin A has to consistently finish in
a certain amount of time in order to know how long to delay B for. 
* `runEveryXMinutes`: *Number*; if a plugin is marked as eligible for scheduling, this will be the value used for the waiting interval between executions. Fractional numbers are acceptable. 
If the number is less than the value in general settings--`pluginScheduleIntervalFloorInMinutes`--scheduling will be disabled for the plugin. This is a safety mechanism so that a plugin can't accidentally be set to run too often. 
In these cases, Ganchos will check every 5 minutes to see if the plugin configuration has been updated to an acceptable value, if so it will be reschedule it.

## Logs
`TODO`: write this

## Using Ganchos
This will be improved in the future but for now:
<br>

* Install [pm2](https://www.npmjs.com/package/pm2) if needed.
* Download ganchos code
* Run like this: `NODE_ENV=prod pm2 start --name ganchos ${GANCHOS_DIRECTORY}/engine/dist/app.js`
* Ganchos plugins will automatically be available. Drop plugins into one of the plugin directories configured in the ganchos general config file `~/.ganchos/config/general`

## Goals
* Make this rock solid and performant so that it can be used reliably in any environment for important work. The only concern of the end user should be ensuring that their plugins are written correctly.
Ganchos should be robust enough to never fail through any fault of its own, gracefully handle bad plugins and expose any potential problems via clear logging so that in the case of a plugin with a bug, 
the developer can easily track down and fix their issues. 
* Get UI developed so that it can provide an easy and intuitive way to manage this. Ideally you could generate plugin templates from the UI so that the process of creating and using plugins for the first time is intuitive and self-documenting.
* Make work on other operating systems. Currently only tested on Linux.
* Build in the ability to chain multiple plugins together. A crude version of this can be implemented via delay configuration, but it's not a robust solution.

## Contributing 

Contributing is encouraged and a PR is always welcome. Please create issues for bugs and enhancement requests. 