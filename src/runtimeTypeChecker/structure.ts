import type { Error } from '../ts/metaTypes';
import { joinOmitSeperatorOnLast } from './arrayUtil';
import type { AbstractValidator, FieldValidatorFunction, StructuralConstraint, StructureEntryPoint, Type, TypeDeclaration } from './superMetaTypes';
import { executeValidatorForValue } from './type';

export const validateExactlyOneOf = <T>(target: T, typeDeclaration: TypeDeclaration): Error | undefined => {
    const keysOfDeclaration = Object.keys(typeDeclaration);
    let keysFound = Object.keys(target as any).filter((key) => keysOfDeclaration.includes(key));
    if (keysFound.length > 1) {
        return (
            'Expected but 1 of "' +
            joinOmitSeperatorOnLast(keysOfDeclaration) +
            '" present, but found: ' +
            joinOmitSeperatorOnLast(keysFound, ' and ')
        );
    } else if (keysFound.length === 0) {
        return 'Expected but 1 of "' + joinOmitSeperatorOnLast(keysOfDeclaration) + '" present, but found none';
    } else {
        //Execute validator
        const key = keysFound[0];
        return executeValidatorForValue(target[key as keyof T], key, typeDeclaration[key]);
    }
};

export const validateAtLeastOneOf = <T>(target: T, typeDeclaration: TypeDeclaration): Error | undefined => {
    const keysOfDeclaration = Object.keys(typeDeclaration);
    let keysFound = Object.keys(target as any).filter((key) => keysOfDeclaration.includes(key));
    if (keysFound.length <= 0) {
        return 'Expected at least 1 of "' + joinOmitSeperatorOnLast(keysOfDeclaration) + '" present, but found none';
    }

    //Execute validator
    for (const key of keysFound) {
        const error = executeValidatorForValue(target[key as keyof T], key, typeDeclaration[key]);
        if (error) {
            return error;
        }
    }
};

export const validateAtMostOneOf = <T>(target: T, typeDeclaration: TypeDeclaration): Error | undefined => {
    const keysOfDeclaration = Object.keys(typeDeclaration);
    let keysFound = Object.keys(target as any).filter((key) => keysOfDeclaration.includes(key));
    if (keysFound.length > 1) {
        return (
            'Expected at most 1 of "' +
            joinOmitSeperatorOnLast(keysOfDeclaration) +
            '" present, but found: ' +
            joinOmitSeperatorOnLast(keysFound, ' and ')
        );
    }

    //Execute validator
    if (keysFound.length === 1) {
        const key = keysFound[0];
        return executeValidatorForValue(target[key as keyof T], key, typeDeclaration[key]);
    }
};

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
export const Structure: StructureEntryPoint = Object.assign(
    (constraints: StructuralConstraint[]) => {
        return (baseDeclaration: TypeDeclaration): TypeDeclaration => {
            baseDeclaration.____$rtcNoTouch = {
                structuralConstraints: constraints,
            };
            return baseDeclaration;
        };
    },
    {
        /**
         * Require exactly one of the fields in the declaration to be present in the target object.
         */
        exactlyOneOf:
            (declaration: TypeDeclaration): StructuralConstraint =>
            (target, baseDeclaration) =>
                validateExactlyOneOf(target, declaration),
        /**
         * Require at least one of the fields in the declaration to be present in the target object.
         */
        atLeastOneOf:
            (declaration: TypeDeclaration): StructuralConstraint =>
            (target, baseDeclaration) =>
                validateAtLeastOneOf(target, declaration),
        /**
         * Require at most one of the fields in the declaration to be present in the target object.
         */
        atMostOneOf:
            (declaration: TypeDeclaration): StructuralConstraint =>
            (target, baseDeclaration) =>
                validateAtMostOneOf(target, declaration),
        /**
         * Require the presence of a field by some name, given as the value in some other field (keyOfFieldNameSource).
         */
        fieldNameByValue: (keyOfFieldNameSource: string, validator: AbstractValidator) => {
            throw new ErrorEvent('Not implemented');
        },
        /**
         * Requre the target to only ever contain the fields described in the base type declaration.
         */
        strictFields: (): StructuralConstraint => (target, baseDeclaration) => {
            throw new ErrorEvent('Not implemented');
        },
    },
);
export default Structure;
