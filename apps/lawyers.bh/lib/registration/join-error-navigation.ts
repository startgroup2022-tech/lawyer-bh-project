function escapeAttributeValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\"/g, '\\"');
}

function escapeCssIdentifier(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }

  return Array.from(value, (character, index) => {
    const safeCharacter = /[a-zA-Z0-9_-]/.test(character);
    const startsWithDigit = index === 0 && /[0-9]/.test(character);

    return safeCharacter && !startsWithDigit
      ? character
      : `\\${character.codePointAt(0)?.toString(16)} `;
  }).join("");
}

export function focusJoinField(field: string, root: HTMLElement): boolean {
  const selector = `[data-join-field="${escapeAttributeValue(field)}"]`;
  const element = (root.querySelector(selector) ??
    root.querySelector(`#${escapeCssIdentifier(field)}`)) as HTMLElement | null;

  if (!element) return false;

  if (typeof element.scrollIntoView === "function") {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (typeof element.focus === "function") {
    element.focus();
  }

  return true;
}
