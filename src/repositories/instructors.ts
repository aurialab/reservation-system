import { Prisma } from "@prisma/client";
import prisma from "../prisma/client";

export type InstructorSchedule = {
  day: number;
  hours: [string, string][];
};

export type InstructorHoliday = {
  startDay: string;
  endDay: string;
  startHour: string;
  endHour: string;
};

export type InstructorRecord = {
  id: number;
  name: string;
  surname: string;
  email: string;
  phone: string;
  schedule: InstructorSchedule[] | null;
  holidays: InstructorHoliday[];
};

export type CreateInstructorInput = {
  name: string;
  surname: string;
  email: string;
  phone: string;
  schedule?: InstructorSchedule[] | null;
  holidays?: InstructorHoliday[];
};

export type UpdateInstructorInput = {
  name?: string;
  surname?: string;
  email?: string;
  phone?: string;
  schedule?: InstructorSchedule[] | null;
  holidays?: InstructorHoliday[];
};

function toInstructorRecord(record: {
  id: number;
  name: string;
  surname: string;
  email: string;
  phone: string;
  schedule: unknown;
  holidays: unknown;
}): InstructorRecord {
  return {
    id: record.id,
    name: record.name,
    surname: record.surname,
    email: record.email,
    phone: record.phone,
    schedule: (record.schedule ?? null) as InstructorSchedule[] | null,
    holidays: (record.holidays ?? []) as InstructorHoliday[]
  };
}

export async function listInstructors(): Promise<InstructorRecord[]> {
  const records = await prisma.instructor.findMany({ orderBy: { id: "asc" } });
  return records.map(toInstructorRecord);
}

export async function findInstructorById(id: number): Promise<InstructorRecord | null> {
  const record = await prisma.instructor.findUnique({ where: { id } });
  return record ? toInstructorRecord(record) : null;
}

export async function findInstructorByEmail(email: string): Promise<InstructorRecord | null> {
  const record = await prisma.instructor.findUnique({ where: { email } });
  return record ? toInstructorRecord(record) : null;
}

export async function createInstructor(input: CreateInstructorInput): Promise<InstructorRecord> {
  const record = await prisma.instructor.create({
    data: {
      name: input.name,
      surname: input.surname,
      email: input.email,
      phone: input.phone,
      schedule: input.schedule ?? Prisma.JsonNull,
      holidays: input.holidays ?? []
    }
  });

  return toInstructorRecord(record);
}

export async function updateInstructorById(
  id: number,
  input: UpdateInstructorInput
): Promise<InstructorRecord | null> {
  const existing = await prisma.instructor.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  const record = await prisma.instructor.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.surname !== undefined ? { surname: input.surname } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.schedule !== undefined
        ? { schedule: input.schedule ?? Prisma.JsonNull }
        : {}),
      ...(input.holidays !== undefined ? { holidays: input.holidays } : {})
    }
  });

  return toInstructorRecord(record);
}

export async function deleteInstructorById(id: number): Promise<boolean> {
  const existing = await prisma.instructor.findUnique({ where: { id } });
  if (!existing) {
    return false;
  }

  await prisma.instructor.delete({ where: { id } });
  return true;
}
