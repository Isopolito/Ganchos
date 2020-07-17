const validateJson = (jsonString: string): any => {
    try {
        const parsedJson = JSON.parse(jsonString);
        if (parsedJson && typeof parsedJson === "object") return parsedJson;
    } catch (e) { }

    return false;
};

export {
    validateJson
}