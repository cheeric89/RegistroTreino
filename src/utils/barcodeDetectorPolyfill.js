const QUAGGA_VERSION = "1.12.1";
const QUAGGA_URL = `https://cdn.jsdelivr.net/npm/@ericblade/quagga2@${QUAGGA_VERSION}/dist/quagga.min.js`;

const SUPPORTED_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];
const FORMAT_READERS = {
  ean_13: "ean_reader",
  ean_8: "ean_8_reader",
  upc_a: "upc_reader",
  upc_e: "upc_e_reader",
};

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

  return canvas.toDataURL("image/jpeg", 0.86);
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

  const rawValue = result?.codeResult?.code;
  if (!rawValue) return [];

  const readerName = result?.codeResult?.format || "";
  const detectedFormat = Object.entries(FORMAT_READERS)
    .find(([, reader]) => reader.replace("_reader", "") === readerName)?.[0]
    || null;

  return [{ rawValue: String(rawValue), format: detectedFormat }];
};

class TreinoBarcodeDetector {
  constructor(options = {}) {
    const requested = Array.isArray(options?.formats) ? options.formats : SUPPORTED_FORMATS;
    this.formats = requested.filter((format) => SUPPORTED_FORMATS.includes(format));
    if (!this.formats.length) this.formats = [...SUPPORTED_FORMATS];
    this.lastAttempt = 0;
    this.busy = false;
  }

  static async getSupportedFormats() {
    return [...SUPPORTED_FORMATS];
  }

  async detect(source) {
    if (!source || this.busy) return [];
    if (typeof HTMLVideoElement !== "undefined" && source instanceof HTMLVideoElement && source.readyState < 2) {
      return [];
    }

    // Quagga procesa una imagen completa. Limitar a ~4 intentos por segundo
    // mantiene el escaneo fluido sin castigar CPU/batería del iPhone.
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - this.lastAttempt < 240) return [];
    this.lastAttempt = now;
    this.busy = true;

    try {
      return await decodeWithQuagga(source, this.formats);
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
