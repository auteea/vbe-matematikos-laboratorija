import { describe, expect, it } from "vitest";
import { loginMode, loginSearch } from "./loginMode";

describe("Login mode links", () => {
  it("opens registration for ?mode=up", () => {
    expect(loginMode(loginSearch({ mode: "up" }).mode)).toBe("up");
  });
  it("opens sign-in for ?mode=in", () => {
    expect(loginMode(loginSearch({ mode: "in" }).mode)).toBe("in");
  });
  it("defaults missing or unknown modes to sign-in", () => {
    expect(loginMode(loginSearch({}).mode)).toBe("in");
    expect(loginMode(loginSearch({ mode: "unknown" }).mode)).toBe("in");
  });
});