import { Template } from './Template'

const meta: Template = {
    commandLineName: `meta`,
    description: `Meta file template`,
    body: `{
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // The meta file for a user plugin contains the information needed for ganchos to execute a plugin and display 
    // it in the UI (UI will be in future enhancement).
    // https://github.com/Isopolito/Ganchos/blob/master/README.md

    // By default the extension for these types of files ends in '.meta', but this can be configured in general config.

    // NOTE: When the application (execFilePath) is executed the 3 parameters passed in are:
    //  1. The configuration for the plugin. JSON string in the shape of 'defaultConfig'
    //  2. The event type that triggered execution (if run on a schedule, this is 'none')
    //  3. The event data that is part of the triggered execution (if run on a schedule, this is null)
    // The 'putDataInEnvironment' flag will put the above in the environment of the execFile's process.

    // NOTE: Output to stderr from the program will be logged to the plugin log file as an error.
    // Output to stdout gets logged as information. If |*| is in the message it will be split on that and 
    // part 1 of the split string will be where in the file the message is coming from, the second part of
    // the split string will be the message itself
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    //  *** Mandatory fields ***

    // The name of the execution file to run
    "execFilePath": "",

    // Name of the plugin
    "name": "",

    // Plugin description
    "description": "",

    // What category. Options can be found in 'PluginCategory' type in the code.
    // Currently the options are: 'Media' | 'Net' | 'FileSystem' | 'System'
    "category": "",

    // The type of events the plugin will listen for. These can be used even when a plugin runs on a schedule.
    // NOTE: This field must be defined, but can be an empty array
    // type EventType = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir' | 'ready' | 'raw' | 'error' | 
    //                  'none' | 'inetChange' | 'inetUp' | 'inetDown'.
    "eventTypes": [ ],

    // The configuration the plugin will start off with the first time it's run. The first time it executes this will be written
    // to the plugin configuration file and can be modified to control the plugin. Whatever configuration the plugin requires goes here.
    // Check documentation for a list of all the optional Ganchos specific plugin configuration settings
    "defaultConfig": { },

    // *** Optional fields ***

    // When false the plugin will not be run. Defaults to true
    "enabled": true,

    // Valid options can be found here: https://nodejs.org/api/process.html#process_process_platform
    // If list is empty, plugin will run on all operation systems. Defaults to empty
    //"osRunOnly": [ 'aix', 'darwin', 'freebsd', 'linux', 'openbsd', 'sunos', 'win32' ],
    "osRunOnly": [],

    // Will allow the plugin to be run on a schedule if 'runEveryXMinutes' is a positive number. Defaults to false
    "isEligibleForSchedule": false,

    // When true will put the input data to the plugin into the environment instead of passing it in as parameters to the exec file.
    // Useful for shell scripts. Ganchos Event Type and Event Data will be preceded by ganchos_. For instance: ganchos_eventType. 
    // EventData will have all the non-null properties provided in the same format, ex: ganchos_filePath. All the plugin configuration 
    // settings will be saved into the environment like ganchosConfig_SETTINGNAME.
    "putDataInEnvironment": false
}`,
}

export default meta;