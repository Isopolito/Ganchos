import meta from './meta'
import { Template } from './Template'
import bashWrapper from './bashwrapper'

const templates: Template[] = [
    bashWrapper,
    meta
];

export default templates;