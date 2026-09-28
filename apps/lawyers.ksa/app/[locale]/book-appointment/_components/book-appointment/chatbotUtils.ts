export function openYourGptChatbot(retry = 0, afterOpen?: () => void) {
  const root = document.getElementById("yourgpt_root");
  const frame = root?.querySelector<HTMLElement>('[role="region"]');
  const button = root?.querySelector<HTMLButtonElement>(".ygpts-widgetBtn");

  const isOpen = frame && !frame.classList.contains("hide") && !frame.hasAttribute("inert");

  if (isOpen) {
    window.setTimeout(() => afterOpen?.(), 400);
    return;
  }

  if (button) {
    button.click();
    window.setTimeout(() => afterOpen?.(), 700);
    return;
  }

  if (retry < 10) {
    setTimeout(() => openYourGptChatbot(retry + 1, afterOpen), 300);
  }
}

export function sendMessageToYourGpt(message: string, retry = 0) {
  const root = document.getElementById("yourgpt_root");
  const input =
    root?.querySelector<HTMLTextAreaElement>("textarea") ||
    root?.querySelector<HTMLInputElement>('input[type="text"]') ||
    root?.querySelector<HTMLElement>('[contenteditable="true"]');

  if (!root || !input) {
    if (retry < 10) setTimeout(() => sendMessageToYourGpt(message, retry + 1), 300);
    return;
  }

  input.focus();

  if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
    const valueSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set;
    valueSetter?.call(input, message);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  } else {
    input.textContent = message;
    input.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: message,
      }),
    );
  }

  window.setTimeout(() => {
    const sendButton =
      root.querySelector<HTMLButtonElement>('button[type="submit"]') ||
      root.querySelector<HTMLButtonElement>('button[aria-label*="Send"]') ||
      root.querySelector<HTMLButtonElement>('button[aria-label*="send"]') ||
      root.querySelector<HTMLButtonElement>('button[class*="send"]') ||
      root.querySelector<HTMLButtonElement>('button[class*="Send"]');

    if (sendButton) {
      sendButton.click();
      return;
    }

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
  }, 250);
}
