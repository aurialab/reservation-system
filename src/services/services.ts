import {
  type InstructorHoliday,
  type InstructorSchedule
} from "../repositories/instructors";
import {
  type ServiceRecord,
  type CreateServiceInput,
  type UpdateServiceInput,
  createService as createServiceRecord,
  deleteServiceById,
  findServiceById,
  listServices as listServiceRecords,
  updateServiceById
} from "../repositories/services";

export type ServiceInstructor = {
  id: number;
  name: string;
  surname: string;
  email: string;
  phone: string;
  schedule: InstructorSchedule[] | null;
  holidays: InstructorHoliday[];
};

export type Service = {
  id: number;
  name: string;
  instructors: ServiceInstructor[];
};

function toService(record: ServiceRecord): Service {
  return {
    id: record.id,
    name: record.name,
    instructors: record.instructors.map((instructor) => ({
      id: instructor.id,
      name: instructor.name,
      surname: instructor.surname,
      email: instructor.email,
      phone: instructor.phone,
      schedule: (instructor.schedule ?? null) as InstructorSchedule[] | null,
      holidays: (instructor.holidays ?? []) as InstructorHoliday[]
    }))
  };
}

export async function listServices(): Promise<Service[]> {
  const records = await listServiceRecords();
  return records.map(toService);
}

export async function getServiceById(id: number): Promise<Service | null> {
  const record = await findServiceById(id);
  return record ? toService(record) : null;
}

export async function createService(input: CreateServiceInput): Promise<Service> {
  const record = await createServiceRecord(input);
  return toService(record);
}

export async function updateService(
  id: number,
  input: UpdateServiceInput
): Promise<Service | null> {
  const record = await updateServiceById(id, input);
  return record ? toService(record) : null;
}

export async function removeService(id: number): Promise<boolean> {
  return deleteServiceById(id);
}
