export const stringifyAllButKeys = (obj: any, keys: string[]) => {
    return JSON.stringify(obj, (key, value) => {
        if (keys.includes(key)) {
            return undefined;
        }
        return value;
    });
}