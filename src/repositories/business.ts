import prisma from "../prisma/client";

export type BusinessRecord = {
  id: number;
  name: string;
  createdAt: Date;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
};

export type CreateBusinessInput = {
  name: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
};

export type UpdateBusinessInput = {
  name?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
};

export async function listBusinesses(): Promise<BusinessRecord[]> {
  return prisma.business.findMany({ orderBy: { id: "asc" } });
}

export async function findBusinessById(id: number): Promise<BusinessRecord | null> {
  return prisma.business.findUnique({ where: { id } });
}

export async function createBusiness(input: CreateBusinessInput): Promise<BusinessRecord> {
  return prisma.business.create({
    data: {
      name: input.name,
      ...(input.status ? { status: input.status } : {})
    }
  });
}

export async function updateBusinessById(
  id: number,
  input: UpdateBusinessInput
): Promise<BusinessRecord | null> {
  const existing = await prisma.business.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  return prisma.business.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.status !== undefined ? { status: input.status } : {})
    }
  });
}

export async function deleteBusinessById(id: number): Promise<boolean> {
  const existing = await prisma.business.findUnique({ where: { id } });
  if (!existing) {
    return false;
  }

  await prisma.business.delete({ where: { id } });
  return true;
}
