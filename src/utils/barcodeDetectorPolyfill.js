const QUAGGA_VERSION = "1.12.1";
const QUAGGA_URL = `https://cdn.jsdelivr.net/npm/@ericblade/quagga2@${QUAGGA_VERSION}/dist/quagga.min.js`;

const SUPPORTED_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];
const FORMAT_READERS = {
  ean_13: "ean_reader",
  ean_8: "ean_8_reader",
  upc_a: "upc_reader",
  upc_e: "upc_e_reader",
};

const CONFIRMATIONS_REQUIRED = 3;
const CONFIRMATION_WINDOW_MS = 1500;
const ATTEMPT_INTERVAL_MS = 240;

let quaggaPromise = null;
let captureCanvas = null;
let captureContext = null;
let warnedLoadFailure = false;

const loadQuagga = () => {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.Quagga) return Promise.resolve(window.Quagga);
  if (quaggaPromise) return quaggaPromise;

  quaggaPromise = new Promise((resolve) => {
    const finish = () => resolve(window.Quagga || null);
    const existing = document.querySelector("script[data-treino-quagga]");

    if (existing) {
      if (window.Quagga) finish();
      else {
        existing.addEventListener("load", finish, { once: true });
        existing.addEventListener("error", () => resolve(null), { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = QUAGGA_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.treinoQuagga = QUAGGA_VERSION;
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => resolve(null), { once: true });
    document.head.appendChild(script);
  });

  return quaggaPromise;
};

const getCaptureCanvas = () => {
  if (!captureCanvas) {
    captureCanvas = document.createElement("canvas");
    captureContext = captureCanvas.getContext("2d", { willReadFrequently: true });
  }
  return { canvas: captureCanvas, context: captureContext };
};

const captureBarcodeRegion = (video) => {
  const sourceWidth = Number(video?.videoWidth) || 0;
  const sourceHeight = Number(video?.videoHeight) || 0;
  if (!sourceWidth || !sourceHeight) return null;

  // La mayoría de los usuarios centra el código. Recortar la franja central
  // reduce trabajo en iPhone y mejora la tasa de lectura de EAN/UPC.
  const cropX = Math.round(sourceWidth * 0.05);
  const cropY = Math.round(sourceHeight * 0.22);
  const cropWidth = Math.round(sourceWidth * 0.9);
  const cropHeight = Math.round(sourceHeight * 0.56);
  const maxWidth = 960;
  const scale = Math.min(1, maxWidth / cropWidth);
  const outputWidth = Math.max(320, Math.round(cropWidth * scale));
  const outputHeight = Math.max(180, Math.round(cropHeight * scale));

  const { canvas, context } = getCaptureCanvas();
  if (!context) return null;
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  context.drawImage(
    video,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return canvas.toDataURL("image/jpeg", 0.9);
};

const normalizeBarcode = (value) => String(value || "").replace(/\D/g, "");

const hasValidMod10Checksum = (value) => {
  const code = normalizeBarcode(value);
  if (code.length < 2) return false;

  const digits = [...code].map(Number);
  const expectedCheckDigit = digits.pop();
  let sum = 0;

  // GS1 Mod-10: desde la derecha del cuerpo, multiplicadores 3,1,3,1…
  for (let index = digits.length - 1, position = 0; index >= 0; index -= 1, position += 1) {
    sum += digits[index] * (position % 2 === 0 ? 3 : 1);
  }

  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  return calculatedCheckDigit === expectedCheckDigit;
};

const expandUpcE = (value) => {
  const code = normalizeBarcode(value);
  if (code.length !== 8) return null;

  const numberSystem = code[0];
  if (numberSystem !== "0" && numberSystem !== "1") return null;

  const payload = code.slice(1, 7);
  const checkDigit = code[7];
  const [d1, d2, d3, d4, d5, d6] = payload;
  let manufacturer;
  let product;

  if (["0", "1", "2"].includes(d6)) {
    manufacturer = `${d1}${d2}${d6}00`;
    product = `00${d3}${d4}${d5}`;
  } else if (d6 === "3") {
    manufacturer = `${d1}${d2}${d3}00`;
    product = `000${d4}${d5}`;
  } else if (d6 === "4") {
    manufacturer = `${d1}${d2}${d3}${d4}0`;
    product = `0000${d5}`;
  } else {
    manufacturer = `${d1}${d2}${d3}${d4}${d5}`;
    product = `0000${d6}`;
  }

  return `${numberSystem}${manufacturer}${product}${checkDigit}`;
};

const isValidDetectedBarcode = (rawValue, format) => {
  const code = normalizeBarcode(rawValue);
  if (![8, 12, 13].includes(code.length)) return false;

  if (format === "upc_e") {
    const expanded = expandUpcE(code);
    return Boolean(expanded && hasValidMod10Checksum(expanded));
  }

  if (format === "ean_13" && code.length !== 13) return false;
  if (format === "ean_8" && code.length !== 8) return false;
  if (format === "upc_a" && code.length !== 12) return false;

  if (code.length === 8 && !format) {
    const expanded = expandUpcE(code);
    return hasValidMod10Checksum(code) || Boolean(expanded && hasValidMod10Checksum(expanded));
  }

  return hasValidMod10Checksum(code);
};

const decodeWithQuagga = async (video, formats) => {
  const Quagga = await loadQuagga();
  if (!Quagga?.decodeSingle) {
    if (!warnedLoadFailure) {
      warnedLoadFailure = true;
      console.warn("[Treino] No se pudo cargar el fallback de escaneo para Safari/iOS.");
    }
    return [];
  }

  const src = captureBarcodeRegion(video);
  if (!src) return [];

  const readers = formats
    .map((format) => FORMAT_READERS[format])
    .filter(Boolean);

  const result = await new Promise((resolve) => {
    Quagga.decodeSingle(
      {
        src,
        numOfWorkers: 0,
        locate: true,
        inputStream: {
          size: 800,
          singleChannel: false,
        },
        locator: {
          halfSample: true,
          patchSize: "medium",
        },
        decoder: {
          readers: readers.length ? readers : Object.values(FORMAT_READERS),
          multiple: false,
        },
      },
      (decoded) => resolve(decoded || null)
    );
  });

  const rawValue = normalizeBarcode(result?.codeResult?.code);
  if (!rawValue) return [];

  const readerName = result?.codeResult?.format || "";
  const detectedFormat = Object.entries(FORMAT_READERS)
    .find(([, reader]) => reader.replace("_reader", "") === readerName)?.[0]
    || null;

  return [{ rawValue, format: detectedFormat }];
};

class TreinoBarcodeDetector {
  constructor(options = {}) {
    const requested = Array.isArray(options?.formats) ? options.formats : SUPPORTED_FORMATS;
    this.formats = requested.filter((format) => SUPPORTED_FORMATS.includes(format));
    if (!this.formats.length) this.formats = [...SUPPORTED_FORMATS];
    this.lastAttempt = 0;
    this.busy = false;
    this.confirmations = [];
  }

  static async getSupportedFormats() {
    return [...SUPPORTED_FORMATS];
  }

  rememberCandidate(candidate, now) {
    this.confirmations = this.confirmations
      .filter((item) => now - item.detectedAt <= CONFIRMATION_WINDOW_MS);

    this.confirmations.push({
      rawValue: candidate.rawValue,
      format: candidate.format || null,
      detectedAt: now,
    });

    const matching = this.confirmations.filter((item) => item.rawValue === candidate.rawValue);
    window.__TREINO_BARCODE_SCAN_PROGRESS__ = {
      code: candidate.rawValue,
      confirmations: Math.min(CONFIRMATIONS_REQUIRED, matching.length),
      required: CONFIRMATIONS_REQUIRED,
    };

    if (matching.length < CONFIRMATIONS_REQUIRED) return false;

    this.confirmations = [];
    window.__TREINO_BARCODE_SCAN_PROGRESS__ = {
      code: candidate.rawValue,
      confirmations: CONFIRMATIONS_REQUIRED,
      required: CONFIRMATIONS_REQUIRED,
      confirmed: true,
    };
    return true;
  }

  async detect(source) {
    if (!source || this.busy) return [];
    if (typeof HTMLVideoElement !== "undefined" && source instanceof HTMLVideoElement && source.readyState < 2) {
      return [];
    }

    // Quagga procesa una imagen completa. Limitar a ~4 intentos por segundo
    // mantiene el escaneo fluido sin castigar CPU/batería del iPhone.
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - this.lastAttempt < ATTEMPT_INTERVAL_MS) return [];
    this.lastAttempt = now;
    this.busy = true;

    try {
      const results = await decodeWithQuagga(source, this.formats);
      const candidate = results?.[0];
      if (!candidate) return [];

      // No confiamos en una lectura parcial/accidental: primero debe tener una
      // longitud EAN/UPC posible y pasar el dígito verificador GS1.
      if (!isValidDetectedBarcode(candidate.rawValue, candidate.format)) {
        return [];
      }

      // Un frame correcto todavía puede ser casual. Treino exige 3 lecturas
      // iguales dentro de 1,5 s antes de devolver el código al MealLogger.
      const confirmed = this.rememberCandidate(candidate, now);
      return confirmed ? [candidate] : [];
    } catch (error) {
      console.warn("[Treino] fallback de código de barras:", error?.message || error);
      return [];
    } finally {
      this.busy = false;
    }
  }
}

export const installBarcodeDetectorFallback = () => {
  if (typeof window === "undefined") return false;
  if ("BarcodeDetector" in window) return false;

  window.BarcodeDetector = TreinoBarcodeDetector;
  window.__TREINO_BARCODE_FALLBACK__ = "quagga2";
  return true;
};

installBarcodeDetectorFallback();
