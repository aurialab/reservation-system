import prisma from "../prisma/client";

export type ActivityRecord = {
  id: number;
  name: string;
  description: string | null;
};

export type CreateActivityInput = {
  name: string;
  description?: string | null;
};

export type UpdateActivityInput = {
  name?: string;
  description?: string | null;
};

export async function listActivities(): Promise<ActivityRecord[]> {
  return prisma.activity.findMany({ orderBy: { id: "asc" } });
}

export async function findActivityById(id: number): Promise<ActivityRecord | null> {
  return prisma.activity.findUnique({ where: { id } });
}

export async function createActivity(input: CreateActivityInput): Promise<ActivityRecord> {
  return prisma.activity.create({
    data: {
      name: input.name,
      description: input.description ?? null
    }
  });
}

export async function updateActivityById(
  id: number,
  input: UpdateActivityInput
): Promise<ActivityRecord | null> {
  const existing = await prisma.activity.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  return prisma.activity.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {})
    }
  });
}

export async function deleteActivityById(id: number): Promise<boolean> {
  const existing = await prisma.activity.findUnique({ where: { id } });
  if (!existing) {
    return false;
  }

  await prisma.activity.delete({ where: { id } });
  return true;
}
