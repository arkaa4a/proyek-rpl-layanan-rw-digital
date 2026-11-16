import prisma from './db';

export async function getActiveServices() {
  return await prisma.serviceType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  });
}

export async function getServiceDetails(id: string) {
  return await prisma.serviceType.findUnique({
    where: { id, isActive: true }
  });
}

export async function getRequestDetails(id: string) {
  return await prisma.request.findUnique({
    where: { id },
    include: {
      serviceType: true,
      applicant: {
        include: { 
          rt: { include: { rw: true } },
          keluarga: true
        }
      },
      histories: {
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { username: true, role: { select: { name: true } } } } }
      }
    }
  });
}
