import prisma from "../prisma/client";

export type ServiceInstructorRecord = {
  id: number;
  name: string;
  surname: string;
  email: string;
  phone: string;
  schedule: unknown;
  holidays: unknown;
};

export type ServiceRecord = {
  id: number;
  name: string;
  instructors: ServiceInstructorRecord[];
};

export type CreateServiceInput = {
  name: string;
  instructorIds: number[];
};

export type UpdateServiceInput = {
  name?: string;
  instructorIds?: number[];
};

function serviceInclude() {
  return {
    instructors: {
      orderBy: { id: "asc" as const }
    }
  };
}

export async function listServices(): Promise<ServiceRecord[]> {
  return prisma.service.findMany({
    orderBy: { id: "asc" },
    include: serviceInclude()
  });
}

export async function findServiceById(id: number): Promise<ServiceRecord | null> {
  return prisma.service.findUnique({
    where: { id },
    include: serviceInclude()
  });
}

export async function createService(input: CreateServiceInput): Promise<ServiceRecord> {
  return prisma.service.create({
    data: {
      name: input.name,
      instructors: {
        connect: input.instructorIds.map((instructorId) => ({ id: instructorId }))
      }
    },
    include: serviceInclude()
  });
}

export async function updateServiceById(
  id: number,
  input: UpdateServiceInput
): Promise<ServiceRecord | null> {
  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  return prisma.service.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.instructorIds !== undefined
        ? {
            instructors: {
              set: input.instructorIds.map((instructorId) => ({ id: instructorId }))
            }
          }
        : {})
    },
    include: serviceInclude()
  });
}

export async function deleteServiceById(id: number): Promise<boolean> {
  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) {
    return false;
  }

  await prisma.service.delete({ where: { id } });
  return true;
}
