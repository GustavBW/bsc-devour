import type { Logger } from "../logging/simpleLogger";

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
    logger: Logger,
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
