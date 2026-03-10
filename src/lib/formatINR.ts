/**
 * Format a number in Indian Rupee style (e.g., ₹1,25,000)
 */
export const formatINR = (amount: number, showSymbol = true): string => {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const intPart = Math.floor(abs);
  const decPart = abs % 1;

  const str = intPart.toString();
  let formatted: string;

  if (str.length <= 3) {
    formatted = str;
  } else {
    const lastThree = str.slice(-3);
    const rest = str.slice(0, -3);
    // Add commas every 2 digits for the rest
    const withCommas = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    formatted = withCommas + "," + lastThree;
  }

  if (decPart > 0) {
    formatted += decPart.toFixed(2).slice(1);
  }

  const sign = isNegative ? "-" : "";
  return `${sign}${showSymbol ? "₹" : ""}${formatted}`;
};

/**
 * Compact format for large numbers (e.g., ₹1.25L, ₹12.5Cr)
 */
export const formatINRCompact = (amount: number): string => {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(1)}Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  }
  if (abs >= 1000) {
    return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  }
  return `${sign}₹${abs.toFixed(0)}`;
};
