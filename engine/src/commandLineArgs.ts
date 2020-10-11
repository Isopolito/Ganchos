import { CommandLineOptions } from 'command-line-args'
import { default as templateFinder } from './templates/finder'

const availableCommandLineOptions = [
  { name: `template`, alias: `t`, type: String }
]

const handleTemplate = (templateType: string): void => {
    if (!templateType) return;
    let shouldExit = false;

    const template = templateFinder(templateType);
    if (template) {
        console.log(template.body);
        shouldExit = true;
    }

    if (shouldExit) process.exit(0);
} 

const executeCommandLineArgumentHandlers = (selectedOptions: CommandLineOptions) => {
    if (selectedOptions.template) handleTemplate(selectedOptions.template);
}

export {
    availableCommandLineOptions,
    executeCommandLineArgumentHandlers,
}