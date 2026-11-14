export function openModal(modalId: string): void {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("hidden");
  const firstInput = modal.querySelector<HTMLElement>(
    "input, select, textarea, button",
  );
  if (firstInput) {
    firstInput.focus();
  }
}

export function closeModal(modalId: string): void {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add("hidden");
}

export function wireModalDismiss(modalId: string): void {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal(modalId);
    }
  });
  const closeBtns = modal.querySelectorAll<HTMLElement>("[data-close-modal]");
  for (const btn of closeBtns) {
    btn.addEventListener("click", () => closeModal(modalId));
  }
}
