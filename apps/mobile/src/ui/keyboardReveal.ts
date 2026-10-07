// The scroll offset that shows a whole field (and a gap around it) inside the visible part of a scroll view, or
// null when it already is. A field taller than the visible part shows its top. Pure, so it holds for any phone
// size: the inputs are measured on the device (CHQ-175).
export function offsetToReveal(
  field: { y: number; height: number },
  view: { offset: number; height: number },
  gap: number,
): number | null {
  const top = field.y - gap;
  const bottom = field.y + field.height + gap;
  if (bottom > view.offset + view.height) return Math.max(0, Math.min(top, bottom - view.height));
  if (top < view.offset) return Math.max(0, top);
  return null;
}
