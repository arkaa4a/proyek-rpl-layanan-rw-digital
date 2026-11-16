import QRCode from 'qrcode';

/**
 * Generate QR Code as Base64 Data URI
 */
export async function generateQrCode(text: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      margin: 1,
      width: 150,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return dataUrl;
  } catch (error) {
    console.error('Failed to generate QR Code:', error);
    throw new Error('Gagal membuat QR Code.');
  }
}
