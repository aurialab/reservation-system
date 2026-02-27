import prisma from "../prisma/client";

export type InstructorRecord = {
  id: number;
  name: string;
  surname: string;
  email: string;
  phone: string;
};

export type CreateInstructorInput = {
  name: string;
  surname: string;
  email: string;
  phone: string;
};

export type UpdateInstructorInput = {
  name?: string;
  surname?: string;
  email?: string;
  phone?: string;
};

export async function listInstructors(): Promise<InstructorRecord[]> {
  return prisma.instructor.findMany({ orderBy: { id: "asc" } });
}

export async function findInstructorById(id: number): Promise<InstructorRecord | null> {
  return prisma.instructor.findUnique({ where: { id } });
}

export async function findInstructorByEmail(email: string): Promise<InstructorRecord | null> {
  return prisma.instructor.findUnique({ where: { email } });
}

export async function createInstructor(input: CreateInstructorInput): Promise<InstructorRecord> {
  return prisma.instructor.create({
    data: {
      name: input.name,
      surname: input.surname,
      email: input.email,
      phone: input.phone
    }
  });
}

export async function updateInstructorById(
  id: number,
  input: UpdateInstructorInput
): Promise<InstructorRecord | null> {
  const existing = await prisma.instructor.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  return prisma.instructor.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.surname !== undefined ? { surname: input.surname } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {})
    }
  });
}

export async function deleteInstructorById(id: number): Promise<boolean> {
  const existing = await prisma.instructor.findUnique({ where: { id } });
  if (!existing) {
    return false;
  }

  await prisma.instructor.delete({ where: { id } });
  return true;
}
