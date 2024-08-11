import {test, expect} from "bun:test";
import { conformsToType, findConformingMIMEType, optionalType, typeUnionOR, validateSimpleType } from "./typeChecker";
import { Type, type TypeDeclaration } from "../ts/metaTypes";


//Tests of validateType
test("validateType should return true on valid string input", async () => {
    expect(validateSimpleType(Type.STRING, "string")).toBe(true);
});
test("validateType should return false on invalid string input", async () => {
    expect(validateSimpleType(Type.STRING, 1)).toBe(false);
});
test("validateType should return true on valid float input", async () => {
    expect(validateSimpleType(Type.FLOAT, 1.0)).toBe(true);
});
test("validateType should return false on invalid float input", async () => {
    expect(validateSimpleType(Type.FLOAT, "string")).toBe(false);
});
test("validateType should return true on valid integer input", async () => {
    expect(validateSimpleType(Type.INTEGER, 1)).toBe(true);
});
test("validateType should return false on invalid integer input", async () => {
    expect(validateSimpleType(Type.INTEGER, 1.1)).toBe(false);
});
test("validateType should return true on valid boolean input", async () => {
    expect(validateSimpleType(Type.BOOLEAN, true)).toBe(true);
});
test("validateType should return false on invalid boolean input", async () => {
    expect(validateSimpleType(Type.BOOLEAN, 1)).toBe(false);
});
test("validateType should return true on valid object input", async () => {
    expect(validateSimpleType(Type.OBJECT, {})).toBe(true);
});
test("validateType should return false on invalid object input", async () => {
    expect(validateSimpleType(Type.OBJECT, 1)).toBe(false);
});
test("validateType should return true on valid array input", async () => {
    expect(validateSimpleType(Type.ARRAY, [])).toBe(true);
});
test("validateType should return false on invalid array input", async () => {
    expect(validateSimpleType(Type.ARRAY, {})).toBe(false);
});

//Tests of optionalType
test("optionalType should generate a validator function that returns true on undefined and correct type", async () => {
    const validator = optionalType(Type.STRING);
    expect(validator).toBeInstanceOf(Function);
    expect(validator(undefined)).toBe(true);

    expect(validator(null)).toBe(false);

    expect(validator("string")).toBe(true);
    expect(validator("")).toBe(true);
});
test("optionalType should generate a validator function that returns false on incorrect type", async () => {
    const validator = optionalType(Type.STRING);
    expect(validator(1)).toBe(false);
    expect(validator(true)).toBe(false);
    expect(validator({})).toBe(false);
    expect(validator([])).toBe(false);
});

//Tests of typeUnionOR
test("typeUnionOR should generate a validator function that returns true on any of the provided validators, string", async () => {
    const validator = typeUnionOR(Type.STRING);
    expect(validator).toBeInstanceOf(Function);
    expect(validator(undefined)).toBe(false);
    expect(validator(null)).toBe(false);
    expect(validator({})).toBe(false);
    expect(validator([])).toBe(false);
    expect(validator(true)).toBe(false);

    expect(validator("string")).toBe(true);
    expect(validator("")).toBe(true);
});
test("typeUnionOR should generate a validator function that returns true on any of the provided validators, string or integer", async () => {
    const validator = typeUnionOR(Type.STRING, Type.INTEGER);
    expect(validator).toBeInstanceOf(Function);
    expect(validator(undefined)).toBe(false);
    expect(validator(null)).toBe(false);
    expect(validator(0.1)).toBe(false);
    expect(validator({})).toBe(false);
    expect(validator([])).toBe(false);
    expect(validator(true)).toBe(false);

    expect(validator("string")).toBe(true);
    expect(validator("")).toBe(true);
    expect(validator(1)).toBe(true);
    expect(validator(0)).toBe(true);
});
test("typeUnionOR should work with optionalType, when written sensibly", async () => {
    const validator = optionalType(typeUnionOR(Type.STRING, Type.INTEGER));
    expect(validator).toBeInstanceOf(Function);
    expect(validator(0.1)).toBe(false);
    expect(validator({})).toBe(false);
    expect(validator([])).toBe(false);
    expect(validator(true)).toBe(false);
    
    expect(validator(undefined)).toBe(true);

    expect(validator(null)).toBe(false);
    expect(validator("string")).toBe(true);
    expect(validator("")).toBe(true);
    expect(validator(1)).toBe(true);
    expect(validator(0)).toBe(true);
});

//Tests of conformsToType
test("conformsToType should return null on valid input", async () => {
    const typeDeclaration = {
        source: Type.STRING,
        width: optionalType(Type.INTEGER),
        height: optionalType(Type.INTEGER),
    };
    const object = {
        source: "https://http.cat/images/100.jpg",
        width: 100,
        height: 100,
    };
    expect(conformsToType(object, typeDeclaration)).toBeNull();
});
test("conformsToType should return error on invalid input", async () => {
    const typeDeclaration = {
        source: Type.STRING,
        width: optionalType(Type.INTEGER),
        height: optionalType(Type.INTEGER),
    };
    const object = {
        source: "https://http.cat/images/100.jpg",
        width: 100,
        height: "100",
    };
    const typeErr = conformsToType(object, typeDeclaration);
    expect(typeErr).not.toBeNull();
    expect(typeErr).not.toBeUndefined();
});
test("conformsToType should return error on missing required field", async () => {
    const typeDeclaration = {
        source: Type.STRING,
        width: optionalType(Type.INTEGER),
        height: optionalType(Type.INTEGER),
    };
    const object = {
        width: 100,
        height: 100,
    };
    const typeErr = conformsToType(object, typeDeclaration);
    expect(typeErr).not.toBeNull();
    expect(typeErr).not.toBeUndefined();
});
test("conformsToType should work with type unions", async () => {
    const typeDeclaration = {
        field: Type.STRING,
        field2: typeUnionOR(Type.INTEGER, Type.STRING),
    };
    const objectA = {
        field: "some",
        field2: "string",
    };
    const objectB = {
        field: "some",
        field2: 1,
    };
    const typeErrA = conformsToType(objectA, typeDeclaration);
    expect(typeErrA).toBeNull();
    const typeErrB = conformsToType(objectB, typeDeclaration);
    expect(typeErrB).toBeNull();
});
test("conformsToType should work with an optional type union", async () => {
    const typeDeclaration = {
        field: Type.STRING,
        field2: optionalType(typeUnionOR(Type.INTEGER, Type.STRING)),
    };
    const objectA = {
        field: "some",
        field2: "string",
    };
    const objectB = {
        field: "some",
        field2: 1,
    };
    const objectC = {
        field: "some",
    };
    const typeErrA = conformsToType(objectA, typeDeclaration);
    expect(typeErrA).toBeNull();
    const typeErrB = conformsToType(objectB, typeDeclaration);
    expect(typeErrB).toBeNull();
    const typeErrC = conformsToType(objectC, typeDeclaration);
    expect(typeErrC).toBeNull();
});

//Tests of nested TypeDeclarations on nested objects
test("conformsToType should work with nested TypeDeclarations", async () => {
    const typeDeclaration: TypeDeclaration = {
        field: Type.STRING,
        nested: {
            field: Type.INTEGER,
            field2: Type.STRING,
        }
    };
    const validObject = {
        field: "some",
        nested: {
            field: 1,
            field2: "string",
        }
    };
    const invalidObject = {
        field: "some",
        nested: {
            field: "string",
            field2: "string",
        }
    };
    const typeErr = conformsToType(validObject, typeDeclaration);
    expect(typeErr).toBeNull();
    const typeErr2 = conformsToType(invalidObject, typeDeclaration);
    expect(typeErr2).not.toBeNull();
    expect(typeErr2).not.toBeUndefined();
});

test("conformsToType should work with nested TypeDeclarations and optional fields", async () => {
    const typeDeclaration: TypeDeclaration = {
        field: Type.STRING,
        nested: {
            field: Type.INTEGER,
            field2: optionalType(Type.STRING),
        }
    };
    const objectA = {
        field: "some",
        nested: {
            field: 1,
        }
    };
    const objectB = {
        field: "some",
        nested: {
            field: 1,
            field2: "string",
        }
    };
    const typeErr = conformsToType(objectA, typeDeclaration);
    expect(typeErr).toBeNull();
    const typeErrB = conformsToType(objectB, typeDeclaration);
    expect(typeErrB).toBeNull();
});

test("conformsToType should work with nested optional TypeDeclarations", async () => {
    const typeDeclaration: TypeDeclaration = {
        field: Type.STRING,
        nested: optionalType({
            field: Type.INTEGER,
            field2: Type.STRING,
        })
    };
    const objectA = {
        field: "some",
    };
    const objectB = {
        field: "some",
        nested: {
            field: 1,
            field2: "string",
        }
    };
    const typeErr = conformsToType(objectA, typeDeclaration);
    expect(typeErr).toBeNull();
    const typeErrB = conformsToType(objectB, typeDeclaration);
    expect(typeErrB).toBeNull();
});
test("conformsToType should work with nested TypeDeclaration unions", async () => {
    const typeDeclaration: TypeDeclaration = {
        field: Type.STRING,
        nested: typeUnionOR({
            field: Type.INTEGER,
            field2: Type.STRING,
        }, {
            field: Type.STRING,
            field2: Type.INTEGER,
        })
    };
    const objectA = {
        field: "some",
        nested: {
            field: 1,
            field2: "string",
        }
    };
    const objectB = {
        field: "some",
        nested: {
            field: "string",
            field2: 1,
        }
    };
    const someInvalidObject = {
        field: "some",
        nested: {
            field: "string",
            field2: "string",
        }
    };
    const typeErr = conformsToType(objectA, typeDeclaration);
    expect(typeErr).toBeNull();
    const typeErrB = conformsToType(objectB, typeDeclaration);
    expect(typeErrB).toBeNull();
    const typeErrC = conformsToType(someInvalidObject, typeDeclaration);
    expect(typeErrC).not.toBeNull();
    expect(typeErrC).not.toBeUndefined();
});

//Tests of findConformingMIMEType
test("findConformingMIMEType should return the correct MIME type if any", async () => {
    const jpegTypeNames = ["jpeg", "jpg", "image/jpeg", "image/jpg"];
    for (const name of jpegTypeNames) {
        const {result, error} = findConformingMIMEType(name);
        expect(error).toBeNull();
        expect(result).toBe("image/jpeg");
    }
});

test("findConformingMIMEType should return an error if no MIME type is found", async () => {
    const invalidCases = ["image/invalid", "invalid", "image/invalidType", null, undefined, ""];
    for (const name of invalidCases) {
        const {result, error} = findConformingMIMEType(name as string);
        expect(error).not.toBeNull();
        expect(result).toBeNull();
    }
});