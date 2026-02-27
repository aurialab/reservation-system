import prisma from "../prisma/client";

export type LocationRecord = {
  id: number;
  name: string;
  city: string;
  postalCode: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  businessId: number;
};

export type CreateLocationInput = {
  name: string;
  city: string;
  postalCode: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean;
  businessId: number;
};

export type UpdateLocationInput = {
  name?: string;
  city?: string;
  postalCode?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean;
  businessId?: number;
};

export async function listLocations(businessId?: number): Promise<LocationRecord[]> {
  return prisma.location.findMany({
    where: businessId ? { businessId } : undefined,
    orderBy: { id: "asc" }
  });
}

export async function findLocationById(id: number): Promise<LocationRecord | null> {
  return prisma.location.findUnique({ where: { id } });
}

export async function createLocation(input: CreateLocationInput): Promise<LocationRecord> {
  return prisma.location.create({
    data: {
      name: input.name,
      city: input.city,
      postalCode: input.postalCode,
      address: input.address,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      isActive: input.isActive ?? true,
      businessId: input.businessId
    }
  });
}

export async function updateLocationById(
  id: number,
  input: UpdateLocationInput
): Promise<LocationRecord | null> {
  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  return prisma.location.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
      ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.businessId !== undefined ? { businessId: input.businessId } : {})
    }
  });
}

export async function deleteLocationById(id: number): Promise<boolean> {
  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) {
    return false;
  }

  await prisma.location.delete({ where: { id } });
  return true;
}
