import prisma from '@/lib/db';

/**
 * Generate unique and sequential document number.
 * Format: [NUMBER]/RW-[RW_NOMOR]/[MONTH_ROMAN]/[YEAR]
 * Example: 001/RW-05/IX/2026
 */
export async function generateDocumentNumber(rwId: string, rwNomor: string): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const monthRoman = romanMonths[month - 1];

  // We use Prisma transaction to safely increment the sequence
  const sequence = await prisma.$transaction(async (tx) => {
    let seq = await tx.documentSequence.findUnique({
      where: { rwId_year_month: { rwId, year, month } }
    });

    if (!seq) {
      seq = await tx.documentSequence.create({
        data: {
          rwId,
          year,
          month,
          lastNumber: 1
        }
      });
    } else {
      seq = await tx.documentSequence.update({
        where: { id: seq.id },
        data: { lastNumber: { increment: 1 } }
      });
    }
    
    return seq;
  });

  const formattedNumber = String(sequence.lastNumber).padStart(3, '0');
  return `${formattedNumber}/RW-${rwNomor}/${monthRoman}/${year}`;
}
