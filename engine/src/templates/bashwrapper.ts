import { Template } from './Template'

const bashWrapper: Template = {
    commandLineName: `bashwrapper`,
    description: `A stubbed out bash script that will provide a wrapper to make another program work as a Ganchos plugin`,
    body: `#!/usr/bin/bash

# Set the path of the program to execute
programToExec='ls'

# Set whatever args it needs
programArgs=('-l' '--color=auto')

if ! command -v "$programToExec"; then
    # write code to download program or compile source code

    # now that it should exist, confirm it's there
    if ! command -v "$programToExec"; then
        echo "Unable to create $programToExecute, exiting..."
        exit 1
    fi
fi

# NOTE: Ganchos supplies data to the plugin when executing it. If the 'putDataInEnvironment' meta setting is true,
# these variables would be set in the environment before executing this script bash scripts this feature makes it 
# easier since there's no JSON to parse. The default is to pass in the data in JSON serialized objects.
# https://github.com/Isopolito/Ganchos/blob/master/README.md#what-is-a-plugin-in-ganchos

# Call the program passing in whatever arguments the program needs. See above for page details on what Ganchos provides
# the plugin on execution
cmd=("$programToExec" "$\{programArgs[@]\}")
"$\{cmd[@]\}"
`
};

export default bashWrapper;