import prisma from "../prisma/client";

export type UserRecord = {
  id: number;
  email: string;
  name: string;
  surname: string;
  phone: string;
  passwordHash: string;
  isVerified: boolean;
  isBO: boolean;
};

export type CreateUserInput = Omit<UserRecord, "id">;
export type UpdateUserInput = Omit<UserRecord, "id" | "passwordHash">;

export async function findUserByEmail(
  email: string
): Promise<UserRecord | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(
  input: CreateUserInput
): Promise<UserRecord> {
  return prisma.user.create({ data: input });
}

export async function listUsers(): Promise<UserRecord[]> {
  return prisma.user.findMany();
}

export async function findUserById(
  id: number
): Promise<UserRecord | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function updateUserById(
  id: number,
  input: UpdateUserInput
): Promise<UserRecord | null> {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  return prisma.user.update({ where: { id }, data: input });
}

export async function deleteUserById(id: number): Promise<boolean> {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return false;
  }

  await prisma.user.delete({ where: { id } });
  return true;
}

export async function updateUserPassword(
  id: number,
  passwordHash: string
): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: { passwordHash }
  });
}

export async function updateUserBoStatus(
  id: number,
  isBO: boolean
): Promise<UserRecord | null> {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  return prisma.user.update({
    where: { id },
    data: { isBO }
  });
}
