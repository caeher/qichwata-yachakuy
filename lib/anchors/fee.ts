export function stroopsToFeeXlm(stroops: string | null): string | null {
  if (stroops === null) {
    return null;
  }
  const value = BigInt(stroops);
  const divisor = BigInt(10_000_000);
  const whole = value / divisor;
  const frac = value % divisor;
  const fracStr = frac.toString().padStart(7, "0");
  return `${whole}.${fracStr}`;
}
