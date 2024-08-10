import type { DBConnection } from "../networking/dbConn";
import { validateType } from "../processing/typeChecker";

/**
 * @author GustavBW
 * @since 0.0.1
 */
export type Error = string;
export type ResErr<T> = | { result: T; error: null } | { result: null; error: Error };

/**
 * @author GustavBW
 * @since 0.0.1
 */
export type CLIFunc<T> = {
    func: (args: string[], context: ApplicationContext) => Promise<ResErr<T>>;
    whatToDoWithResult: (result: T) => void;
    identifier: string;
    abstractExample: string;
    documentation: string;
}

export type ApplicationContext = {
}


export enum Type {
    STRING = "string",
    FLOAT = "float",
    INTEGER = "integer",
    BOOLEAN = "boolean",
    OBJECT = "object",
    ARRAY = "array"
}

export type FieldValidatorFunction = (valueOfField: any) => boolean;

export type TypeDeclaration = {
    [key: string]: Type | FieldValidatorFunction
}

export const optionalType = (validator: Type | FieldValidatorFunction): FieldValidatorFunction => {
    const wrappedValidator = (value: any) => {
        if (value === undefined || value === null) {
            return true; // Accept undefined or null as valid for optional fields
        }
        if (typeof validator === "function") {
            return validator(value);
        }
        return validateType(validator, value);
    };

    if (typeof validator !== "function") {
        wrappedValidator.typeString = validator + " | undefined | null";
    }

    return wrappedValidator;
};
