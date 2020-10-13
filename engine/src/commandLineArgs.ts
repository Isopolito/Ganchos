import { CommandLineOptions } from 'command-line-args'
import { default as templateFinder } from './templates/finder'

const availableCommandLineOptions = [
  { name: `template`, alias: `t`, type: String },
  { name: `version`, alias: `v`, type: Boolean }
]

const handleVersion = (): void => {
    console.log("Ganchos version 0.1.2\nhttps://github.com/Isopolito/Ganchos");
    process.exit(0);
}

const handleTemplate = (templateType: string): void => {
    if (!templateType) {
        console.log("Must provide template type");
    } else {
        const template = templateFinder(templateType);
        if (template) {
            console.log(template.body);
        }
    }

    process.exit(0);
} 

const executeCommandLineArgumentHandlers = (selectedOptions: CommandLineOptions) => {
    if (selectedOptions.template) handleTemplate(selectedOptions.template);
    if (selectedOptions.version) handleVersion();
}

export {
    availableCommandLineOptions,
    executeCommandLineArgumentHandlers,
}