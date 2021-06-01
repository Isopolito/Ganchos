import { CommandLineOptions } from 'command-line-args'
import { fileUtil }  from './shared/index';
import { default as templateFinder } from './templates/finder'

const availableCommandLineOptions = [
  { name: `template`, alias: `t`, type: String },
  { name: `version`, alias: `v`, type: Boolean },
  { name: `help`, alias: `h`, type: Boolean },
  { name: `paths`, alias: `p`, type: Boolean }
]

const handleVersion = (): void => {
    console.log("Ganchos version 0.1.3\nhttps://github.com/Isopolito/Ganchos");
    process.exit(0);
}

const handleTemplate = (templateType: string): void => {
    if (!templateType) {
        console.log("Must provide template type");
    } else {
        const template = templateFinder(templateType);
        if (template && template.body) {
            console.log(template.body);
        } else {
            console.log(`Template of type '${templateType}' not found.`);
        }
    }

    process.exit(0);
} 

const handlePaths = () => {
    console.log(`
Ganchos Paths

    * Main directory path: ${fileUtil.getAppBaseDir()} 
    * Plugin path: ${fileUtil.getPluginConfigBasePath()}
    * General Configuration path: ${fileUtil.getGeneralConfigPath()}
    * Log files path: ${fileUtil.getLogBasePath()}
    `);

    process.exit(0);
}

const handleHelp = () => {
    console.log(`
Ganchos command line options:

    --template, -t TEMPLATE_TYPE; ['bashwrapper', 'meta']
    --version, -v; version of ganchos
    --paths, -p; show the various paths ganchos uses
    --help, -h; this
    `);

    process.exit(0);
}

const executeCommandLineArgumentHandlers = (selectedOptions: CommandLineOptions) => {
    if (selectedOptions.template) handleTemplate(selectedOptions.template);
    if (selectedOptions.version) handleVersion();
    if (selectedOptions.help) handleHelp();
    if (selectedOptions.paths) handlePaths();
}

export {
    availableCommandLineOptions,
    executeCommandLineArgumentHandlers,
}