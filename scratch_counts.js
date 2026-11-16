const { PrismaClient } = require('@prisma/client');
async function run() {
  const prisma = new PrismaClient();
  console.log('--- Counts ---');
  console.log('Rw:', await prisma.rw.count());
  console.log('Rt:', await prisma.rt.count());
  console.log('User:', await prisma.user.count());
  console.log('Warga:', await prisma.warga.count());
  console.log('Request:', await prisma.request.count());
  console.log('RequestHistory:', await prisma.requestHistory.count());
  console.log('LingkunganInfo:', await prisma.lingkunganInfo.count());
  await prisma.$disconnect();
}
run().catch(console.error);
