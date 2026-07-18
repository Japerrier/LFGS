/**
 * The seamless CSS marquee trick (duplicate a list, animate translateX(0) -> -50%)
 * only loops without a gap if one full set of items is already wider than the
 * viewport. With a short list that's not true on wide monitors, so pad the base
 * set up to a safe minimum item count before duplicating it for the animation.
 */
export function forMarquee<T>(items: T[], minSetSize = 20): T[] {
  if (items.length === 0) return [];
  const repeatCount = Math.max(1, Math.ceil(minSetSize / items.length));
  const baseSet = Array.from({ length: repeatCount }, () => items).flat();
  return [...baseSet, ...baseSet];
}
