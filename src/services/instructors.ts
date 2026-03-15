import {
  type InstructorRecord,
  type InstructorSchedule,
  type InstructorHoliday,
  type CreateInstructorInput,
  type UpdateInstructorInput,
  createInstructor as createInstructorRecord,
  deleteInstructorById,
  findInstructorById,
  findInstructorByEmail,
  listInstructors as listInstructorRecords,
  updateInstructorById
} from "../repositories/instructors";

export type Instructor = {
  id: number;
  name: string;
  surname: string;
  email: string;
  phone: string;
  schedule: InstructorSchedule[] | null;
  holidays: InstructorHoliday[];
};

function toInstructor(record: InstructorRecord): Instructor {
  return {
    id: record.id,
    name: record.name,
    surname: record.surname,
    email: record.email,
    phone: record.phone,
    schedule: record.schedule,
    holidays: record.holidays
  };
}

export async function listInstructors(): Promise<Instructor[]> {
  const records = await listInstructorRecords();
  return records.map(toInstructor);
}

export async function getInstructorById(id: number): Promise<Instructor | null> {
  const record = await findInstructorById(id);
  return record ? toInstructor(record) : null;
}

export async function getInstructorByEmail(email: string): Promise<Instructor | null> {
  const record = await findInstructorByEmail(email);
  return record ? toInstructor(record) : null;
}

export async function createInstructor(input: CreateInstructorInput): Promise<Instructor> {
  const record = await createInstructorRecord(input);
  return toInstructor(record);
}

export async function updateInstructor(
  id: number,
  input: UpdateInstructorInput
): Promise<Instructor | null> {
  const record = await updateInstructorById(id, input);
  return record ? toInstructor(record) : null;
}

export async function removeInstructor(id: number): Promise<boolean> {
  return deleteInstructorById(id);
}
