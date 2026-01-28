import { describe, expect, it } from "vitest";
import { TextBuffer } from "../src/buffer";

describe("TextBuffer", () => {
  it("appends text chunks", () => {
    const buffer = new TextBuffer();
    buffer.append("Hello");
    buffer.append(" ");
    buffer.append("world");
    expect(buffer.getText()).toBe("Hello world");
  });

  it("ignores empty appends", () => {
    const buffer = new TextBuffer();
    buffer.append("Hello");
    buffer.append("");
    buffer.append(null as any);
    buffer.append(undefined as any);
    expect(buffer.getText()).toBe("Hello");
  });

  it("sets text replacing previous content", () => {
    const buffer = new TextBuffer();
    buffer.append("Hello");
    buffer.set("Goodbye");
    expect(buffer.getText()).toBe("Goodbye");
  });

  it("handles null/undefined in set", () => {
    const buffer = new TextBuffer();
    buffer.append("Hello");
    buffer.set(null as any);
    expect(buffer.getText()).toBe("");
  });

  it("manages status separately from text", () => {
    const buffer = new TextBuffer();
    buffer.append("Content");
    buffer.setStatus("Loading...");

    expect(buffer.getText()).toBe("Content");
    expect(buffer.getStatus()).toBe("Loading...");
  });

  it("clears status", () => {
    const buffer = new TextBuffer();
    buffer.setStatus("Loading...");
    buffer.clearStatus();
    expect(buffer.getStatus()).toBeNull();
  });

  it("renders with status prefix", () => {
    const buffer = new TextBuffer();
    buffer.append("Content");
    buffer.setStatus("Thinking...");
    expect(buffer.render()).toBe("_Thinking..._\nContent");
  });

  it("renders without status when none set", () => {
    const buffer = new TextBuffer();
    buffer.append("Content");
    expect(buffer.render()).toBe("Content");
  });

  it("reports correct size", () => {
    const buffer = new TextBuffer();
    buffer.append("12345");
    expect(buffer.getSize()).toBe(5);
    buffer.append("67890");
    expect(buffer.getSize()).toBe(10);
  });
});
