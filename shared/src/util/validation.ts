const isJsonStringValid = (jsonString: string): boolean => {
    try {
        const parsedJson = JSON.parse(jsonString);
        if (parsedJson && typeof parsedJson === "object") return true;
    } catch (e) { }

    return false;
};

export {
    isJsonStringValid
}