import type { FieldValidatorFunction, ImageFileType, ImageMIMEType, ResErr, TypeDeclaration } from "../ts/metaTypes";
import { IMAGE_TYPES, Type } from "../ts/metaTypes";

export const isValidFloat = (arg: any): boolean => {
    return isValidNumber(Number.parseFloat(arg));
}

export const isValidInteger = (arg: any): boolean => {
    const num = Number(arg);
    return isValidNumber(num) && Number.isInteger(num);
}

export const isValidNumber = (arg: number): boolean => {
    return !Number.isNaN(arg) && Number.isFinite(arg);
}

export const isValidUrl = (url: string): boolean => {
    return url.length > 1;
}

/**
 * @since 0.0.1
 * @author GustavBW
 * @param type type observed
 * @param expectedMIMEType type expected
 * @returns the corresponding ImageMIMEType if the type conforms to the expectedMIMEType, else an error
 */
export const findConformingMIMEType = (type: string): ResErr<ImageMIMEType> => {
    let correspondingMIMEType: ImageMIMEType | null = null;
    for (const key of Object.keys(IMAGE_TYPES)) {
        if (IMAGE_TYPES[key].includes(type as (ImageMIMEType | ImageFileType))) {
            correspondingMIMEType = IMAGE_TYPES[key][0];
            break;
        }
    }
    if (correspondingMIMEType === null) {
        return { result: null, error: `No corresponding MIME type found for type: ${type}` };
    }
    return { result: correspondingMIMEType, error: null };
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
                if (!validateSimpleType(expectedType, value)) {
                    return `Field ${key} is expected to exist and be of type "${expectedType}" but had value: ${value}`;
                }
            }
        }
    }
    return null; // All fields conform to the expected types.
};

export const validateSimpleType = (expectedType: Type, value: any): boolean => {
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
        case null:
            return value === null;
        case undefined:
            return value === undefined;
        default:
            return false;
    }
};

export const optionalType = (validator: Type | FieldValidatorFunction): FieldValidatorFunction => {
    const wrappedValidator = (value: any) => {
        if (value === undefined || value === null) {
            return true; // Accept undefined or null as valid for optional fields
        }
        if (typeof validator === "function") {
            return validator(value);
        }
        return validateSimpleType(validator, value);
    };

    if (typeof validator !== "function") {
        wrappedValidator.typeString = validator + "?";
    }

    return wrappedValidator;
};

export const typeUnionOR = (...validators: (Type | FieldValidatorFunction)[]): FieldValidatorFunction => {
    const wrappedValidator = (value: any) => {
        for (const validator of validators) {
            if (typeof validator === "function") {
                if (validator(value)) {
                    return true;
                }
            } else if (validateSimpleType(validator, value)) {
                return true;
            }
        }
        return false;
    };

    wrappedValidator.typeString = validators.map(v => typeof v === "function" ? "function" : v).join(" | ");

    return wrappedValidator;
}