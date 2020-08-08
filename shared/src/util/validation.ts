import os from 'os';

const stripJsonComments = (json: string): string => json.split(os.EOL)
    // strip out comments, ignoring leading white space
    .filter(line => !line.match(/^\s*?\/\//))
    .join(os.EOL);

const parseAndValidatedJson = (jsonString: string|null, stripComments?: boolean): any => {
    try {
        if (!jsonString) return false;

        if (stripComments) jsonString = stripJsonComments(jsonString);
        const parsedJson = JSON.parse(jsonString);
        if (parsedJson && typeof parsedJson === "object") return parsedJson;
    } catch (e) { }

    return false;
};

export {
    parseAndValidatedJson
}