import { test, expect, describe } from "bun:test";
import { anyOfConstants, conformsToType, findConformingMIMEType, optionalType, typedArray, typedTuple, typeUnionOR, validateSimpleType } from "./checker";
import { ImageMIMEType } from "../ts/metaTypes";
import { Type, type TypeDeclaration } from "./checkerTypes";

describe("validateType Tests", () => {
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
})

describe("optionalType Tests", () => {
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
    test("optionalType should generate a validator function that returns true on undefined and correct type, object", async () => {
        const validator = optionalType(Type.OBJECT);
        expect(validator).toBeInstanceOf(Function);
        expect(validator(undefined)).toBe(true);
    
        expect(validator(null)).toBe(false);
    
        expect(validator({})).toBe(true);
        expect(validator([])).toBe(false);
    });
    test("optionalType should generate a validator function that returns true on undefined and correct type, array", async () => {
        const validator = optionalType(Type.ARRAY);
        expect(validator).toBeInstanceOf(Function);
        expect(validator(undefined)).toBe(true);
    
        expect(validator(null)).toBe(false);
    
        expect(validator([])).toBe(true);
        expect(validator({})).toBe(false);
    });

    test("optionalType should work with constant ranges", async () => {
        const validator = optionalType(anyOfConstants(["a", "b"]));
        expect(validator).toBeInstanceOf(Function);
        // Must fail
        expect(validator(null)).toBe(false);
        expect(validator(1)).toBe(false);
        expect(validator(1.1)).toBe(false);
        expect(validator(true)).toBe(false);
        expect(validator({})).toBe(false);
        expect(validator([])).toBe(false);
        // Should succeed
        expect(validator(undefined)).toBe(true);
        expect(validator("a")).toBe(true);
        expect(validator("b")).toBe(true);
    });
})

describe("typeUnionOR Tests", () => {
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
})

describe("conformsToType Tests", () => {
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
})

describe("findConformingMIMEType Tests", () => {
    test("findConformingMIMEType should return the correct MIME type if any", async () => {
        const jpegTypeNames = ["jpeg", "jpg", "image/jpeg", "image/jpg"];
        for (const name of jpegTypeNames) {
            const {result, error} = findConformingMIMEType(name);
            expect(error).toBeNull();
            expect(result).toBe(ImageMIMEType.JPEG);
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
})

describe("typedTuple Tests", () => {
    test("typedTuple should correctly accept valid input", async () => {
        const testData = [10, 10];
        const testDECL = typedTuple([Type.INTEGER, Type.INTEGER]);
    
        const error = conformsToType(testData, testDECL);
        expect(error).toBeNull();
    })
    
    test("typedTuple should correctly reject invalid input", async () => {
        const testData = [[10, "10"], [10, undefined], [10, null], [10, true], [0, false]];
        const testDECL = typedArray(typedTuple([Type.INTEGER, Type.INTEGER]));
    
        const error = conformsToType(testData, testDECL);
        expect(error).not.toBeNull();
    })
})

describe("typedArray Tests", () => {
    test("typedArray should correctly accept valid input", async () => {
        const testData = [10, 10, 1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, 0];
        const testDECL = typedArray(Type.INTEGER);
    
        const error = conformsToType(testData, testDECL);
        expect(error).toBeNull();
    })
    test("typedArray should correctly reject invalid input", async () => {
        const testData = ["10", undefined, null, true, false];
        const testDECL = typedArray(Type.INTEGER);
    
        const error = conformsToType(testData, testDECL);
        expect(error).not.toBeNull();
    })
    test("typedArray compound test, successfull", async () => {
        const testData = [[10, 10], [10, 10], [10, 10], [10, 10], [10, 10]];
        const testDECL = typedArray(typedTuple([Type.INTEGER, Type.INTEGER]));
    
        const error = conformsToType(testData, testDECL);
        expect(error).toBeNull();
    })
    test("typedArray compound test, unsuccessfull", async () => {
        const testData = [[10, 10], [10, "10"], [10, undefined], [10, null], [10, true], [0, false]];
        const testDECL = typedArray(typedTuple([Type.INTEGER, Type.INTEGER]));
    
        const error = conformsToType(testData, testDECL);
        expect(error).not.toBeNull();
    })
})

describe("compound Tests", () => {
    test("compound typedArray, typedTuple test, successfull", async () => {
        const testData = [[[10, 10], [10, 10], [10, 10], [10, 10], [10, 10]]];
        const testDECL = typedArray(typedTuple([Type.INTEGER, Type.INTEGER]));
    
        const error = conformsToType(testData, typedArray(testDECL));
        expect(error).toBeNull();   
    })
    test("compound typedArray, typedTuple test, unsuccessfull", async () => {
        const testData = [[[10, 10], [10, "10"], [10, undefined], [10, null], [10, true], [0, false]]];
        const testDECL = typedArray(typedTuple([Type.INTEGER, Type.INTEGER]));
    
        const error = conformsToType(testData, typedArray(testDECL));
        expect(error).not.toBeNull();   
    })
    test("compound optionalType, typedArray, typedTuple test, successfull", async () => {
        const testData = [[10, 10], [10, 10], [10, 10], [10, 10], [10, 10]];
        const testDECL = optionalType(typedArray(typedTuple([Type.INTEGER, Type.INTEGER])));
    
        const error = conformsToType(testData, testDECL);
        expect(error).toBeNull();  
        
        const error2 = conformsToType(undefined, testDECL);
        expect(error2).toBeNull();
    })
    test("compound optionalType, typedArray, typedTuple test, unsuccessfull", async () => {
        const testData = [[[10, 10], [10, "10"], [10, undefined], [10, null], [10, true], [0, false]]];
        const testDECL = optionalType(typedArray(typedTuple([Type.INTEGER, Type.INTEGER])));
    
        const error = conformsToType(testData, testDECL);
        expect(error).not.toBeNull();  
        
        const error2 = conformsToType(null, testDECL);
        expect(error2).not.toBeNull();
    })
    test("compound optionalType, typedArray, typedTuple test, successfull 2", async () => {
        const testData = [[10, 10], undefined, [0,0]];
        const testDECL = typedArray(optionalType(typedTuple([Type.INTEGER, Type.INTEGER])));
    
        const error = conformsToType(testData, testDECL);
        expect(error).toBeNull();
    })
})