export type ToastVariant = "info" | "success" | "error";

function getToastStack(): HTMLElement {
  let stack = document.getElementById("toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toast-stack";
    stack.className = "toast-stack";
    stack.setAttribute("aria-live", "polite");
    document.body.appendChild(stack);
  }
  return stack;
}

export function showToast(
  message: string,
  variant: ToastVariant = "info",
): void {
  const stack = getToastStack();
  const item = document.createElement("div");
  item.className = `toast-item${variant === "error" ? " toast-error" : variant === "success" ? " toast-success" : ""}`;
  item.setAttribute("role", "status");
  item.textContent = message;
  stack.appendChild(item);

  window.setTimeout(() => {
    item.remove();
  }, 3800);
}
