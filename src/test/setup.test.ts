import { describe, it, expect } from "vitest";

describe("Test Setup", () => {
  it("should run tests successfully", () => {
    expect(true).toBe(true);
  });

  it("should have access to DOM APIs", () => {
    const div = document.createElement("div");
    div.textContent = "Hello";
    expect(div.textContent).toBe("Hello");
  });

  it("should have matchMedia mock available", () => {
    expect(window.matchMedia).toBeDefined();
    const result = window.matchMedia("(min-width: 768px)");
    expect(result.matches).toBe(false);
  });
});
