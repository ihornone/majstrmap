
export function minServicePrice(services: Array<{ price: string }> | null | undefined): number | null {
  if (!services || services.length === 0) return null;
  let min: number | null = null;
  for (const s of services) {
    const match = (s.price || '').match(/\d[\d\s.,]*/);
    if (!match) continue;
    const value = parseInt(match[0].replace(/[\s.,]/g, ''), 10);
    if (Number.isFinite(value) && value > 0 && (min === null || value < min)) min = value;
  }
  return min;
}
