// Amounts and numbers in Canadian French, whatever the language of the browser: "-1 114,80 $", "12,50 %"
const LOCALE = "fr-CA";

const formatters = new Map<string, Intl.NumberFormat>();

/** An amount, to the cent by default; maxDigits up to 4 for a unit price. Other currencies: "12,34 $ US". */
export function money(value: number, currency = "CAD", maxDigits = 2): string {
  const key = `${currency}|${maxDigits}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: maxDigits });
    } catch {
      // Not an ISO currency code
      return `${decimal(value, 2, maxDigits)} ${currency}`;
    }
    formatters.set(key, formatter);
  }
  return formatter.format(value);
}

/** A plain number with between minDigits and maxDigits decimals. */
export const decimal = (value: number, minDigits = 0, maxDigits = minDigits) =>
  value.toLocaleString(LOCALE, { minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits });

/** A value already in percent: 12.5 gives "12,50 %". */
export const percent = (value: number, digits = 2) => `${decimal(value, digits)}\u00a0%`;
