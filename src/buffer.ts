import { renderText } from "./render";

export class TextBuffer {
  private text = "";
  private status: string | null = null;

  append(chunk: string) {
    if (!chunk) return;
    this.text += chunk;
  }

  set(value: string) {
    this.text = value ?? "";
  }

  setStatus(status: string | null) {
    this.status = status;
  }

  clearStatus() {
    this.status = null;
  }

  getText() {
    return this.text;
  }

  getStatus() {
    return this.status;
  }

  render() {
    return renderText(this.text, { status: this.status });
  }

  getSize() {
    return this.text.length;
  }
}
