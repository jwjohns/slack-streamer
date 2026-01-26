export interface RenderOptions {
  status?: string | null;
}

export function renderText(text: string, options: RenderOptions = {}): string {
  const status = options.status?.trim();
  if (!status) return text;
  return `_${status}_\n${text}`;
}
