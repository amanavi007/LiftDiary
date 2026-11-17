import { describe, expect, it } from "vitest";
import { buildCsv } from "@/lib/csv";

describe("buildCsv", () => {
  it("writes a header and one line per row", () => {
    const csv = buildCsv(["a", "b"], [["1", 2], ["3", 4]]);
    expect(csv).toBe("a,b\r\n1,2\r\n3,4\r\n");
  });
  it("quotes fields containing commas, quotes and newlines", () => {
    const csv = buildCsv(["name"], [["Curl, EZ"], ['He said "go"'], ["two\nlines"]]);
    expect(csv).toBe('name\r\n"Curl, EZ"\r\n"He said ""go"""\r\n"two\nlines"\r\n');
  });
  it("neutralises spreadsheet formula injection", () => {
    const csv = buildCsv(["name"], [["=HYPERLINK(\"x\")"], ["+1"], ["-2"], ["@a"]]);
    expect(csv.split("\r\n").slice(1, 5)).toEqual(['"\'=HYPERLINK(""x"")"', "'+1", "'-2", "'@a"]);
  });
  it("renders booleans and empty values", () => {
    expect(buildCsv(["x", "y"], [[true, ""]])).toBe("x,y\r\ntrue,\r\n");
  });
});
