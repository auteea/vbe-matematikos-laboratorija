import { describe, expect, it } from "vitest";
import { pointsLabel } from "./points";

describe("pointsLabel", () => {
  it("1 and 21 use taškas", () => {
    expect(pointsLabel(1)).toBe("1 taškas");
    expect(pointsLabel(21)).toBe("21 taškas");
  });
  it("2–9 use taškai", () => {
    expect(pointsLabel(2)).toBe("2 taškai");
    expect(pointsLabel(9)).toBe("9 taškai");
  });
  it("10–20 use taškų", () => {
    expect(pointsLabel(10)).toBe("10 taškų");
    expect(pointsLabel(11)).toBe("11 taškų");
    expect(pointsLabel(20)).toBe("20 taškų");
  });
});
