import { Template } from './Template';
import { default as templates } from './index'

const find = (name: string): Template => {
    const template = templates.find(t => t.commandLineName === name);
    return template
        ? template
        : {} as Template;
}

export default find