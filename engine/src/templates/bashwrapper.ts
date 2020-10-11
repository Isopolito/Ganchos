import { Template } from './Template'

const bashWrapper: Template = {
    commandLineName: `bashwrapper`,
    description: `A stubbed out bash script that will provide a wrapper to make another program work as a Ganchos plugin`,
    body: `{
        #!/usr/bin/bash

        # Check if file to execute exists
        # if not, add comment to compile or download
        
        # comment that this plugin's meta file has 'putDataInEnvironment' set to true
        # parse out data provided by ganchos, e.g. $ganchos_eventType, $ganchos_filePath, etc

        # Call the imaginary program with above plus a few made up $ganchosConfig_ params
    }`
};

export default bashWrapper;