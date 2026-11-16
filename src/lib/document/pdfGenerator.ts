import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export async function generatePdf(
  request: any,
  documentNumber: string,
  qrCodeDataUrl: string
): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Parse form data
  const formData = request.formData ? JSON.parse(request.formData) : {};

  let currentY = height - 50;

  // 1. KOP SURAT
  // Load Logo if exists
  let logoPath = path.join(process.cwd(), 'public', 'logo.png');
  if (!fs.existsSync(logoPath)) {
    logoPath = path.join(process.cwd(), 'public', 'logo.jpg');
  }
  
  let logoImage = null;
  let logoDims = { width: 0, height: 0 };
  
  if (fs.existsSync(logoPath)) {
    const logoBytes = fs.readFileSync(logoPath);
    try {
      logoImage = await pdfDoc.embedPng(logoBytes);
      logoDims = logoImage.scaleToFit(75, 75);
    } catch (e) {
      try {
        logoImage = await pdfDoc.embedJpg(logoBytes);
        logoDims = logoImage.scaleToFit(75, 75);
      } catch (err) {}
    }
  }

  // Draw Logo on the left
  if (logoImage) {
    page.drawImage(logoImage, {
      x: 60,
      y: currentY - 55, // Adjust Y to align vertically with text
      width: logoDims.width,
      height: logoDims.height,
    });
  }

  const kop1 = 'PEMERINTAH KOTA CIREBON';
  const kop1Width = boldFont.widthOfTextAtSize(kop1, 14);
  page.drawText(kop1, {
    x: (width - kop1Width) / 2,
    y: currentY,
    size: 14,
    font: boldFont,
  });
  currentY -= 16;
  
  const kop2 = 'KECAMATAN HARJAMUKTI';
  const kop2Width = boldFont.widthOfTextAtSize(kop2, 14);
  page.drawText(kop2, {
    x: (width - kop2Width) / 2,
    y: currentY,
    size: 14,
    font: boldFont,
  });
  currentY -= 18;

  const kop3 = 'KELURAHAN HARJAMUKTI';
  const kop3Width = boldFont.widthOfTextAtSize(kop3, 16);
  page.drawText(kop3, {
    x: (width - kop3Width) / 2,
    y: currentY,
    size: 16,
    font: boldFont,
  });
  currentY -= 16;
  
  const kop4 = `RUKUN WARGA ${request.applicant.rt?.rw?.nomor || '-'} - RUKUN TETANGGA ${request.applicant.rt?.nomor || '-'}`;
  const kop4Width = font.widthOfTextAtSize(kop4, 11);
  page.drawText(kop4, {
    x: (width - kop4Width) / 2,
    y: currentY,
    size: 11,
    font,
  });
  currentY -= 20;
  
  // Garis pemisah kop (Double Line)
  page.drawLine({
    start: { x: 50, y: currentY },
    end: { x: width - 50, y: currentY },
    thickness: 2,
    color: rgb(0, 0, 0),
  });
  currentY -= 3;
  page.drawLine({
    start: { x: 50, y: currentY },
    end: { x: width - 50, y: currentY },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  currentY -= 40;

  // 2. JUDUL & NOMOR SURAT
  const title = request.serviceType.name.toUpperCase();
  const titleWidth = boldFont.widthOfTextAtSize(title, 14);
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: currentY,
    size: 14,
    font: boldFont,
  });
  currentY -= 20;

  const noSuratText = `Nomor: ${documentNumber}`;
  const noSuratWidth = font.widthOfTextAtSize(noSuratText, 12);
  page.drawText(noSuratText, {
    x: (width - noSuratWidth) / 2,
    y: currentY,
    size: 12,
    font,
  });
  currentY -= 40;

  // 3. ISI SURAT (Data Pemohon)
  page.drawText('Yang bertanda tangan di bawah ini menerangkan bahwa:', {
    x: 50,
    y: currentY,
    size: 12,
    font,
  });
  currentY -= 30;

  const leftMargin = 70;
  const colMargin = 220;

  const drawRow = (label: string, value: string) => {
    page.drawText(label, { x: leftMargin, y: currentY, size: 12, font });
    page.drawText(':', { x: colMargin - 15, y: currentY, size: 12, font });
    page.drawText(value, { x: colMargin, y: currentY, size: 12, font });
    currentY -= 22;
  };

  drawRow('Nama Lengkap', request.applicant.namaLengkap || '-');
  drawRow('NIK', request.applicant.nik || '-');
  drawRow('No. KK', request.applicant.keluarga?.nomorKk || '-');
  
  // Data dari form dinamis
  Object.keys(formData).forEach((key) => {
    const label = key.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, (c) => c.toUpperCase());
    drawRow(label, String(formData[key] || '-'));
  });

  currentY -= 20;

  // Penutup surat
  const penutup = `Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.`;
  page.drawText(penutup, {
    x: 50,
    y: currentY,
    size: 12,
    font,
    maxWidth: width - 100,
    lineHeight: 18
  });
  currentY -= 60;

  // 4. TANDA TANGAN
  const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const rightAlign = width - 250;
  
  page.drawText(`Dikeluarkan tanggal: ${dateStr}`, {
    x: rightAlign - 20,
    y: currentY,
    size: 12,
    font,
  });
  currentY -= 20;

  const signatureTopY = currentY; // Simpan koordinat Y untuk sejajar dengan Pemohon
  page.drawText('Ketua RW', {
    x: rightAlign,
    y: signatureTopY,
    size: 12,
    font,
  });
  currentY -= 65; // Space for signature

  const signerName = request.histories.find((h:any) => h.status === 'APPROVED')?.createdBy?.username || 'Sistem';
  page.drawText(signerName, {
    x: rightAlign,
    y: currentY - 15,
    size: 12,
    font: boldFont,
  });
  
  const signerNameWidth = boldFont.widthOfTextAtSize(signerName, 12);
  page.drawLine({
    start: { x: rightAlign, y: currentY - 17 },
    end: { x: rightAlign + signerNameWidth, y: currentY - 17 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Tanda Tangan Warga
  page.drawText('Pemohon', {
    x: leftMargin + 20,
    y: signatureTopY,
    size: 12,
    font,
  });

  const applicantName = request.applicant.namaLengkap || '-';
  page.drawText(applicantName, {
    x: leftMargin + 20,
    y: currentY - 15,
    size: 12,
    font: boldFont,
  });
  
  const applicantNameWidth = boldFont.widthOfTextAtSize(applicantName, 12);
  page.drawLine({
    start: { x: leftMargin + 20, y: currentY - 17 },
    end: { x: leftMargin + 20 + applicantNameWidth, y: currentY - 17 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // 5. QR CODE VERIFICATION FOOTER
  const qrImageBytes = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
  const qrImage = await pdfDoc.embedPng(qrImageBytes);
  const qrSize = 55;
  
  // Posisi di pojok kiri bawah
  const footerY = 50; 
  page.drawImage(qrImage, {
    x: 50,
    y: footerY,
    width: qrSize,
    height: qrSize,
  });
  
  page.drawText('Dokumen ini sah dan diterbitkan secara elektronik.', {
    x: 50 + qrSize + 15,
    y: footerY + 30,
    size: 10,
    font: boldFont,
  });
  page.drawText('Pindai QR Code di samping untuk verifikasi keaslian dokumen.', {
    x: 50 + qrSize + 15,
    y: footerY + 15,
    size: 9,
    font,
  });

  // Simpan PDF
  const pdfBytes = await pdfDoc.save();
  const fileName = `doc-${request.id}.pdf`;
  const storageDir = path.join(process.cwd(), 'storage', 'documents');
  
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const filePath = path.join(storageDir, fileName);
  fs.writeFileSync(filePath, pdfBytes);

  return fileName;
}
