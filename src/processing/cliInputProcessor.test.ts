import { test, expect } from "bun:test";
import { readUrlArg, readUseCaseArg, readThresholdArg, readCompactTransformNotation } from "./cliInputProcessor";

test("readUrlArg valid URL", () => {
  const result = readUrlArg('url="https://example.com"');
  expect(result).toEqual({ result: "https://example.com", error: null });
});

test("readUrlArg invalid URL", () => {
  const result = readUrlArg('url=""');
  expect(result).toEqual({ result: null, error: "Invalid source url" });
});

test("readUseCaseArg valid useCase icon", () => {
  const result = readUseCaseArg('useCase="icon"');
  expect(result).toEqual({ result: "icon", error: null });
});

test("readUseCaseArg invalid useCase", () => {
  const result = readUseCaseArg('useCase="invalid"');
  expect(result).toEqual({ result: null, error: "Invalid useCase argument" });
});

test("readThresholdArg valid threshold", () => {
  const result = readThresholdArg('threshold="10"');
  expect(result).toEqual({ result: 10, error: null });
});

test("readThresholdArg invalid threshold", () => {
  const result = readThresholdArg('threshold="invalid"');
  expect(result).toEqual({ result: null, error: "Invalid threshold argument" });
});

test("readCompactTransformNotation valid notation", () => {
  const result = readCompactTransformNotation('transform="0 0 0, 0 0"');
  expect(result).toEqual({
    result: {
      xOffset: 0,
      yOffset: 0,
      zIndex: 0,
      xScale: 0,
      yScale: 0,
    },
    error: null,
  });
});

test("readCompactTransformNotation invalid notation length", () => {
  const result = readCompactTransformNotation('transform="0 0 0, 0"');
  expect(result).toEqual({ result: null, error: "Invalid transform data" });
});

test("readCompactTransformNotation invalid xyz component", () => {
  const result = readCompactTransformNotation('transform="0 0, 0 0"');
  expect(result).toEqual({ result: null, error: "Invalid transform data" });
});

test("readCompactTransformNotation invalid scale component", () => {
  const result = readCompactTransformNotation('transform="0 0 0, 0"');
  expect(result).toEqual({ result: null, error: "Invalid transform data" });
});
