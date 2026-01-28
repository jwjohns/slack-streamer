import { describe, expect, it } from "vitest";
import { renderText } from "../src/render";

describe("renderText", () => {
    it("returns text as-is when no status", () => {
        expect(renderText("Hello world")).toBe("Hello world");
        expect(renderText("Hello world", {})).toBe("Hello world");
        expect(renderText("Hello world", { status: null })).toBe("Hello world");
        expect(renderText("Hello world", { status: undefined })).toBe("Hello world");
    });

    it("prepends italicized status", () => {
        expect(renderText("Content", { status: "Thinking..." }))
            .toBe("_Thinking..._\nContent");
    });

    it("trims whitespace from status", () => {
        expect(renderText("Content", { status: "  Loading...  " }))
            .toBe("_Loading..._\nContent");
    });

    it("handles empty status as no status", () => {
        expect(renderText("Content", { status: "" })).toBe("Content");
        expect(renderText("Content", { status: "   " })).toBe("Content");
    });

    it("works with empty content", () => {
        expect(renderText("", { status: "Thinking..." }))
            .toBe("_Thinking..._\n");
    });

    it("preserves multiline content", () => {
        expect(renderText("Line 1\nLine 2", { status: "Status" }))
            .toBe("_Status_\nLine 1\nLine 2");
    });
});
