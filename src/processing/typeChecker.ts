import type { TypeDeclaration } from "../ts/metaTypes";
import { Type } from "../ts/metaTypes";

export const isValidFloat = (arg: any): boolean => {
    return isValidNumber(Number.parseFloat(arg));
}

export const isValidInteger = (arg: any): boolean => {
    return isValidNumber(Number.parseInt(arg));
}

export const isValidNumber = (arg: number): boolean => {
    return !Number.isNaN(arg) && Number.isFinite(arg);
}

export const isValidUrl = (url: string): boolean => {
    return url.length > 1;
}

/**
 * Top level check for fields and type of value of field of a given object.
 * Top level = does not check nested fields.
 * @since 0.0.1
 * @author GustavBW
 */
export const conformsToType = <T>(object: T, typeDecl: TypeDeclaration): string | null => {
    for (const key of Object.keys(typeDecl)) {
        if (typeDecl.hasOwnProperty(key)) {
            const expectedType = typeDecl[key];
            const value = object[key as keyof T];

            if (typeof expectedType === "function") {
                // If the type declaration is a function, use it to validate the field.
                if (!expectedType(value)) {
                    let stringedType = "type";
                    if ((expectedType as any).typeString) {
                        stringedType = (expectedType as any).typeString;
                    }

                    return `Field ${key} does not conform to the expected "${stringedType}", observed value: ${value}`;
                }
            } else if (typeof expectedType === "string") {
                // If the type declaration is a Type enum, check the value's type.
                if (!validateType(expectedType, value)) {
                    return `Field ${key} is expected to exist and be of type "${expectedType}" but had value: ${value}`;
                }
            }
        }
    }
    return null; // All fields conform to the expected types.
};

export const validateType = (expectedType: Type, value: any): boolean => {
    switch (expectedType) {
        case Type.STRING:
            return typeof value === "string";
        case Type.FLOAT:
            return typeof value === "number" && isValidFloat(value);
        case Type.INTEGER:
            return typeof value === "number" && isValidInteger(value);
        case Type.BOOLEAN:
            return typeof value === "boolean";
        case Type.OBJECT:
            return typeof value === "object" && !Array.isArray(value) && value !== null;
        case Type.ARRAY:
            return Array.isArray(value);
        default:
            return false;
    }
};