export enum Type {
    STRING = "string",
    FLOAT = "float",
    INTEGER = "integer",
    BOOLEAN = "boolean",
    OBJECT = "object",
    ARRAY = "array"
}
export type FieldValidatorFunction = ((valueOfField: any) => boolean) & { 
    typeString: string;
    metaType: MetaType;
};
export type TypeDeclaration = {
    [key: string]: Type | FieldValidatorFunction | TypeDeclaration
}
export enum MetaType {
    OPTIONAL = "optional",
    EXCLUSIVE_UNION = "exclusive_union",
    ADDITIVE_UNION = "additive_union",
    TUPLE = "tuple",
    LIST = "list",
}