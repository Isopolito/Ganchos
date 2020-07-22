const stripJsonComments = (json: string): string => json.split('\n')
    // strip out comments, ignoring leading white space
    .filter(line => !line.match(/^\s*?\/\//))
    .join('\n');

const validateJson = (jsonString: string, stripComments?: boolean): any => {
    try {
        if (stripComments) jsonString = stripJsonComments(jsonString);
        const parsedJson = JSON.parse(jsonString);
        if (parsedJson && typeof parsedJson === "object") return parsedJson;
    } catch (e) { }

    return false;
};

export {
    validateJson
}