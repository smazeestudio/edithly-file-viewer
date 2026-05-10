import { describe, expect, it } from "vitest";
import { detectFileType } from "@smazeeapps/file-viewer";

describe("detectFileType", () => {
  it("detects the supported core file types", () => {
    expect(detectFileType("report.pdf")).toBe("pdf");
    expect(detectFileType("notes.txt")).toBe("txt");
    expect(detectFileType("app.tsx")).toBe("code");
    expect(detectFileType("page.html")).toBe("html");
    expect(detectFileType("README.md")).toBe("md");
    expect(detectFileType("data.csv")).toBe("csv");
    expect(detectFileType("sheet.xlsx")).toBe("excel");
    expect(detectFileType("config.json")).toBe("json");
    expect(detectFileType("logo.svg")).toBe("image");
  });

  it("returns unknown for unsupported or extensionless names", () => {
    expect(detectFileType("archive.zip")).toBe("unknown");
    expect(detectFileType("LICENSE")).toBe("unknown");
  });
});
