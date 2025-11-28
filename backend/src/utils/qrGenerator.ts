import QRCode from 'qrcode';
import { logger } from './logger';

/**
 * QR Code Generation Options
 */
interface QRCodeOptions {
  size?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  format?: 'png' | 'svg' | 'utf8' | 'dataURL';
}

/**
 * Generate QR code for a URL
 * @param url - The URL to encode in the QR code
 * @param options - QR code generation options
 * @returns Base64 encoded QR code image (data URL)
 */
export const generateQRCode = async (
  url: string,
  options: QRCodeOptions = {}
): Promise<string> => {
  try {
    const {
      size = parseInt(process.env.QR_CODE_SIZE || '300', 10),
      margin = parseInt(process.env.QR_CODE_MARGIN || '4', 10),
      errorCorrectionLevel = (process.env.QR_CODE_ERROR_CORRECTION || 'M') as 'L' | 'M' | 'Q' | 'H',
    } = options;

    // Validate URL
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided for QR code generation');
    }

    // Generate QR code as data URL (base64 PNG)
    const qrCodeDataURL = await QRCode.toDataURL(url, {
      width: size,
      margin,
      errorCorrectionLevel,
      type: 'image/png',
    });

    logger.debug(`QR code generated for URL: ${url} (${qrCodeDataURL.length} bytes)`);

    return qrCodeDataURL;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('QR code generation error:', error);
    throw new Error(`Failed to generate QR code: ${errorMessage}`);
  }
};

/**
 * Generate QR code as SVG string
 * @param url - The URL to encode
 * @returns SVG string
 */
export const generateQRCodeSVG = async (url: string): Promise<string> => {
  try {
    const size = parseInt(process.env.QR_CODE_SIZE || '300', 10);
    const margin = parseInt(process.env.QR_CODE_MARGIN || '4', 10);
    const errorCorrectionLevel = (process.env.QR_CODE_ERROR_CORRECTION || 'M') as 'L' | 'M' | 'Q' | 'H';

    const svg = await QRCode.toString(url, {
      type: 'svg',
      width: size,
      margin,
      errorCorrectionLevel,
    });

    return svg;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('QR code SVG generation error:', error);
    throw new Error(`Failed to generate QR code SVG: ${errorMessage}`);
  }
};

/**
 * Generate QR code as PNG Buffer (for file saving)
 * @param url - The URL to encode
 * @returns PNG Buffer
 */
export const generateQRCodeBuffer = async (url: string): Promise<Buffer> => {
  try {
    const size = parseInt(process.env.QR_CODE_SIZE || '300', 10);
    const margin = parseInt(process.env.QR_CODE_MARGIN || '4', 10);
    const errorCorrectionLevel = (process.env.QR_CODE_ERROR_CORRECTION || 'M') as 'L' | 'M' | 'Q' | 'H';

    const buffer = await QRCode.toBuffer(url, {
      width: size,
      margin,
      errorCorrectionLevel,
      type: 'png',
    });

    return buffer;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('QR code buffer generation error:', error);
    throw new Error(`Failed to generate QR code buffer: ${errorMessage}`);
  }
};

/**
 * Check if QR code generation is enabled
 */
export const isQRCodeEnabled = (): boolean => {
  return (
    process.env.QR_CODE_ENABLED === 'true' ||
    process.env.ENABLE_QR_CODES === 'true'
  );
};
