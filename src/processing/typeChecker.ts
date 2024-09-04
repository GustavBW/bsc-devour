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
 * Complete runtime type checking for objects.
 * @since 0.0.1
 * @author GustavBW
 */
export const conformsToType = <T>(object: T, typeDecl: TypeDeclaration): string | null => {
    for (const key of Object.keys(typeDecl)) {
        const validator = typeDecl[key];
        const value = object[key as keyof T];

        if (typeof validator === "object") {
            // TypeDeclaration contains a TypeDeclaration
            const nestedError = conformsToType(value, validator as TypeDeclaration);
            if (nestedError !== null) {
                return `Field ${key} failed nested type check: ${nestedError}`;
            }
        } else if (typeof validator === "function") {
            // If the type declaration is a function, use it to validate the field.
            if (!validator(value)) {
                let stringedType = "type";
                if ((validator as any).typeString) {
                    stringedType = (validator as any).typeString;
                }

                return `Field ${key} does not conform to the expected "${stringedType}", observed value: ${value}`;
            }
        } else if (typeof validator === "string") {
            // If the type declaration is a Type enum, check the value's type.
            if (!validateSimpleType(validator, value)) {
                return `Field ${key} is expected to exist and be of type "${validator}" but had value: ${value}`;
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
/**
 * Same as T | undefined
 * @since 0.0.1
 * @author GustavBW
 */
export const optionalType = (validator: Type | FieldValidatorFunction | TypeDeclaration): FieldValidatorFunction => {
    const wrappedValidator = (value: any) => {
        if (value === undefined) {
            return true; // Accept undefined 
        }
        if (typeof validator === "function") {
            return validator(value);
        } else if (typeof validator === "object") {
            return conformsToType(value, validator as TypeDeclaration) === null;
        }
        return validateSimpleType(validator, value);
    };

    if (typeof validator === "string") {
        wrappedValidator.typeString = validator + "?";
    } else if (typeof validator === "object") {
        wrappedValidator.typeString = JSON.stringify(validator) + "?";
    } else if (typeof validator === "function") {
        wrappedValidator.typeString = (validator as any).typeString + "?";
    }

    return wrappedValidator;
};

export const typeUnionOR = (...validators: (Type | FieldValidatorFunction | TypeDeclaration)[]): FieldValidatorFunction => {
    const wrappedValidator = (value: any) => {
        for (const validator of validators) {
            if (typeof validator === "function") {
                if (validator(value)) {
                    return true;
                }
            } else if (typeof validator === "object") {
                if (conformsToType(value, validator as TypeDeclaration) === null) {
                    return true;
                }
            } else if (validateSimpleType(validator, value)) {
                return true;
            }
        }
        return false;
    };

    wrappedValidator.typeString = validators.map(validator => {
        if (typeof validator === "string") {
            return validator;
        } else if (typeof validator === "object") {
            return JSON.stringify(validator);
        } else {
            return (validator as any).typeString;
        }
    }).join(" | ");

    return wrappedValidator;
}

export const typedArray = (validator: Type | FieldValidatorFunction | TypeDeclaration): FieldValidatorFunction => {
    let howToInvokeValidator: (v: any) => boolean;

    if (typeof validator === "function") {
        howToInvokeValidator = (v: any) => validator(v);
    } else if (typeof validator === "object") {
        howToInvokeValidator = (v: any) => conformsToType(v, validator as TypeDeclaration) === null;
    } else {
        howToInvokeValidator = (v: any) => validateSimpleType(validator, v);
    }

    const wrappedValidator = (value: any) => {
        if (!Array.isArray(value)) {
            return false;
        }
        for (const element of value) {
            if (!howToInvokeValidator(element)) {
                return false;
            }
        }
        return true;
    };

    if (typeof validator === "string") {
        wrappedValidator.typeString = validator + "[]";
    } else if (typeof validator === "object") {
        wrappedValidator.typeString = JSON.stringify(validator) + "[]";
    } else if (typeof validator === "function") {
        wrappedValidator.typeString = (validator as any).typeString + "[]";
    }

    return wrappedValidator;
}

export const rangeOfConstants = (constants: (string | number)[]): FieldValidatorFunction => {
    const wrappedValidator = (value: any) => {
        return constants.includes(value);
    };

    wrappedValidator.typeString = constants.map(c => c.toString()).join(" | ");

    return wrappedValidator;
}