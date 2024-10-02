import { test, expect, describe } from "bun:test";
import { Structure, validateExactlyOneOf, validateAtLeastOneOf, validateAtMostOneOf } from './structure';
import { Type } from './superMetaTypes';

describe('Structure functions', () => {
  describe('validateExactlyOneOf', () => {
    const typeDeclaration = {
      fieldA: Type.STRING,
      fieldB: Type.INTEGER,
      fieldC: Type.BOOLEAN,
    };

    test('should return undefined when exactly one field is present', () => {
      const target = { fieldA: 'test' };
      expect(validateExactlyOneOf(target, typeDeclaration)).toBeUndefined();
    });

    test('should return an error when no fields are present', () => {
      const target = {};
      expect(validateExactlyOneOf(target, typeDeclaration)).toContain('Expected but 1 of');
    });

    test('should return an error when more than one field is present', () => {
      const target = { fieldA: 'test', fieldB: 42 };
      expect(validateExactlyOneOf(target, typeDeclaration)).toContain('Expected but 1 of');
    });

    test('should return an error when the present field has an invalid type', () => {
      const target = { fieldA: 42 };
      expect(validateExactlyOneOf(target, typeDeclaration)).toContain('is expected to exist and be of type \"string\"');
    });
  });

  describe('validateAtLeastOneOf', () => {
    const typeDeclaration = {
      fieldA: Type.STRING,
      fieldB: Type.INTEGER,
      fieldC: Type.BOOLEAN,
    };

    test('should return undefined when at least one field is present', () => {
      const target = { fieldA: 'test' };
      expect(validateAtLeastOneOf(target, typeDeclaration)).toBeUndefined();
    });

    test('should return undefined when multiple fields are present', () => {
      const target = { fieldA: 'test', fieldB: 42 };
      expect(validateAtLeastOneOf(target, typeDeclaration)).toBeUndefined();
    });

    test('should return an error when no fields are present', () => {
      const target = {};
      expect(validateAtLeastOneOf(target, typeDeclaration)).toContain('Expected at least 1 of');
    });

    test('should return an error when a present field has an invalid type', () => {
      const target = { fieldA: 42 };
      expect(validateAtLeastOneOf(target, typeDeclaration)).toContain('is expected to exist and be of type \"string\"');
    });
  });

  describe('validateAtMostOneOf', () => {
    const typeDeclaration = {
      fieldA: Type.STRING,
      fieldB: Type.INTEGER,
      fieldC: Type.BOOLEAN,
    };

    test('should return undefined when no fields are present', () => {
      const target = {};
      expect(validateAtMostOneOf(target, typeDeclaration)).toBeUndefined();
    });

    test('should return undefined when exactly one field is present', () => {
      const target = { fieldA: 'test' };
      expect(validateAtMostOneOf(target, typeDeclaration)).toBeUndefined();
    });

    test('should return an error when more than one field is present', () => {
      const target = { fieldA: 'test', fieldB: 42 };
      expect(validateAtMostOneOf(target, typeDeclaration)).toContain('Expected at most 1 of');
    });

    test('should return an error when the present field has an invalid type', () => {
      const target = { fieldA: 42 };
      expect(validateAtMostOneOf(target, typeDeclaration)).toContain('is expected to exist and be of type \"string\"');
    });
  });

  describe('Structure function', () => {
    test('should create a valid type declaration with structural constraints', () => {
      const baseDeclaration = {
        fieldC: Type.STRING,
      };

      const structuredType = Structure([
        Structure.exactlyOneOf({ fieldA: Type.STRING, fieldB: Type.INTEGER }),
      ])(baseDeclaration);

      expect(structuredType).toHaveProperty('fieldC', Type.STRING);
      expect(structuredType).toHaveProperty('____$rtcNoTouch');
      expect(structuredType.____$rtcNoTouch).toHaveProperty('structuralConstraints');
      expect(structuredType.____$rtcNoTouch?.structuralConstraints).toHaveLength(1);
    });

    test('should allow multiple structural constraints', () => {
      const baseDeclaration = {
        fieldC: Type.STRING,
      };

      const structuredType = Structure([
        Structure.exactlyOneOf({ fieldA: Type.STRING, fieldB: Type.INTEGER }),
        Structure.atMostOneOf({ fieldD: Type.BOOLEAN, fieldE: Type.FLOAT }),
      ])(baseDeclaration);

      expect(structuredType).toHaveProperty('fieldC', Type.STRING);
      expect(structuredType).toHaveProperty('____$rtcNoTouch');
      expect(structuredType.____$rtcNoTouch).toHaveProperty('structuralConstraints');
      expect(structuredType.____$rtcNoTouch?.structuralConstraints).toHaveLength(2);
    });
  });
});
