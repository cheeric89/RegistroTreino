export const SCAN_INTERVAL_MS = 240;
export const CONFIRMATION_WINDOW_MS = 1500;
export const CONFIRMATIONS_REQUIRED = 3;

const validChecksum = (code) => {
  let sum = 0;
  for (let i = code.length - 2, position = 0; i >= 0; i -= 1, position += 1) {
    sum += Number(code[i]) * (position % 2 === 0 ? 3 : 1);
  }
  return (10 - sum % 10) % 10 === Number(code.at(-1));
};

export const expandUpcE = (code) => {
  if (!/^[01]\d{7}$/.test(code)) return null;
  const [system, a, b, c, d, e, f, check] = code;
  if ("012".includes(f)) return `${system}${a}${b}${f}0000${c}${d}${e}${check}`;
  if (f === "3") return `${system}${a}${b}${c}00000${d}${e}${check}`;
  if (f === "4") return `${system}${a}${b}${c}${d}00000${e}${check}`;
  return `${system}${a}${b}${c}${d}${e}0000${f}${check}`;
};

export const isValidDetectedBarcode = (rawValue, format) => {
  const code = String(rawValue ?? "").trim();
  if (!/^\d+$/.test(code)) return false;
  if (format === "upc_e") {
    const expanded = expandUpcE(code);
    return Boolean(expanded && validChecksum(expanded));
  }
  const lengths = { ean_13: 13, ean_8: 8, upc_a: 12 };
  if (format && (!lengths[format] || code.length !== lengths[format])) return false;
  if (![8, 12, 13].includes(code.length)) return false;
  if (code.length === 8 && !format) {
    const expanded = expandUpcE(code);
    return validChecksum(code) || Boolean(expanded && validChecksum(expanded));
  }
  return validChecksum(code);
};

// Shared by native BarcodeDetector and Quagga. A frame contributes at most one
// reading, even when a detector returns duplicate results for the same barcode.
export class BarcodeConsensus {
  readings = [];
  lastFrame = -Infinity;

  accept(results, now = performance.now()) {
    if (!Number.isFinite(now)) return null;
    if (now < this.lastFrame) this.readings = [];
    if (now === this.lastFrame) return null;
    this.lastFrame = now;
    this.readings = this.readings.filter((item) => now - item.at <= CONFIRMATION_WINDOW_MS);
    const candidate = (results || []).find((item) => isValidDetectedBarcode(item?.rawValue, item?.format));
    if (!candidate) return null;
    const code = String(candidate.rawValue).trim();
    this.readings.push({ code, at: now });
    if (this.readings.filter((item) => item.code === code).length < CONFIRMATIONS_REQUIRED) return null;
    this.readings = [];
    return code;
  }
}
