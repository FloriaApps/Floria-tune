import { describe, it, expect } from "vitest";
import { formatDuration } from "./format";

describe("formatDuration", () => {
  it("formata segundos como m:ss", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(189)).toBe("3:09");
    expect(formatDuration(3661)).toBe("61:01");
  });

  it("arredonda para baixo segundos fracionários", () => {
    expect(formatDuration(65.9)).toBe("1:05");
  });

  it("mostra placeholder para valores ausentes ou inválidos", () => {
    expect(formatDuration(undefined)).toBe("--:--");
    expect(formatDuration(null)).toBe("--:--");
    expect(formatDuration(0)).toBe("--:--");
    expect(formatDuration(NaN)).toBe("--:--");
  });

  it("preenche segundos com zero à esquerda", () => {
    expect(formatDuration(61)).toBe("1:01");
    expect(formatDuration(60)).toBe("1:00");
  });
});
