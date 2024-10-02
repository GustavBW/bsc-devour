import type { Error } from '../ts/metaTypes';
/**
 * Types that are possible to check using JS "typeof" itself.
 *
 * @since 0.0.1
 * @author GustavBW
 */
export enum Type {
    STRING = 'string',
    FLOAT = 'float',
    INTEGER = 'integer',
    BOOLEAN = 'boolean',
    OBJECT = 'object',
    ARRAY = 'array',
    FUNCTION = 'function',
}
/**
 * Some function, that, when given a value, will return true if the value is of the expected type, and false otherwise.
 *
 * Also has some appended information about the nature of the check and the expected type for better error messages.
 *
 * @since 0.0.1
 * @author GustavBW
 */
export type FieldValidatorFunction = ((valueOfField: any) => boolean) & {
    typeString: string;
    metaType: MetaType;
};
/**
 * The base type for a type declaration. I.e. any some object that describes a type.
 *
 * @since 0.0.1
 * @author GustavBW
 */
export type TypeDeclaration = {
    [key: string]: Type | FieldValidatorFunction | TypeDeclaration;
} & {
    /**
     * Storage of other assorted data. Fx. Structural Constraints.
     * 
     * Sometimes exist, but does not count towards the type check, as usually done on the entire TypeDeclaration object.
     * @since 0.1.0
     */
    [__rtcInternalSupportiveField]?: {
        structuralConstraints: StructuralConstraint[];
    };
};

export const __rtcInternalSupportiveField = '____$rtcNoTouch';

export type AbstractValidator = TypeDeclaration | FieldValidatorFunction | Type;

/**
 * Some function that can be used to check the structure of an object.
 *
 * @since 0.1.0
 * @author GustavBW
 */
export type StructuralConstraint = <T>(target: T, baseDeclaration: TypeDeclaration) => Error | undefined;
/**
 * A function that takes in any amount of structural constraints and returns a function that takes in a base typedeclaration,
 * providing the final type declaration as the result.
 *
 * @example
 * ```typescript
 * const SOME_TYPE_TYPEDECL = Structure([
 *   // Structural Constraints
 *   Structure.exactlyOneOf({ fieldA: Type.String, fieldB: Type.Integer }),
 * ])({
 *  // Base Type Declaration
 *  fieldC: Type.String,
 * })
 *
 * ```
 *
 * @since 0.1.0
 * @author GustavBW
 */
export type StructureEntryPoint = ((constaints: StructuralConstraint[]) => (typeDeclaration: TypeDeclaration) => TypeDeclaration) & {
    /**
     * In the target object, there must be exactly one of the fields described in the type declaration present.
     */
    exactlyOneOf: (declaration: TypeDeclaration) => StructuralConstraint;
    /**
     * In the target object, there must be at least one of the fields described in the type declaration present.
     */
    atLeastOneOf: (declaration: TypeDeclaration) => StructuralConstraint;
    /**
     * In the target object, there must be at most one of the fields described in the type declaration present.
     */
    atMostOneOf: (declaration: TypeDeclaration) => StructuralConstraint;
    /**
     * Require the presence of a field by some name, given as the value in some other field (keyOfFieldNameSource).
     */
    fieldNameByValue: (keyOfFieldNameSource: string, validator: AbstractValidator) => StructuralConstraint;
    /**
     * Requre the target to only ever contain the fields described in the base type declaration.
     *
     * Will cause conflict with the workings of other structural constraints.
     */
    strictFields: () => StructuralConstraint;
};
export enum MetaType {
    OPTIONAL = 'optional',
    EXCLUSIVE_UNION = 'exclusive_union',
    ADDITIVE_UNION = 'additive_union',
    TUPLE = 'tuple',
    LIST = 'list',
}
