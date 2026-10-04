let activeCardId: string | null = null;

export function setActiveCard(
  id: string,
) {
  activeCardId = id;
}

export function getActiveCard() {
  return activeCardId;
}
