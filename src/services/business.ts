import {
  type BusinessRecord,
  type CreateBusinessInput,
  type UpdateBusinessInput,
  createBusiness as createBusinessRecord,
  deleteBusinessById,
  findBusinessById,
  listBusinesses as listBusinessRecords,
  updateBusinessById
} from "../repositories/business";

export type BusinessStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type Business = {
  id: number;
  name: string;
  createdAt: string;
  status: BusinessStatus;
};

function toBusiness(record: BusinessRecord): Business {
  return {
    id: record.id,
    name: record.name,
    createdAt: record.createdAt.toISOString(),
    status: record.status
  };
}

export async function listAllBusinesses(): Promise<Business[]> {
  const records = await listBusinessRecords();
  return records.map(toBusiness);
}

export async function getBusinessById(id: number): Promise<Business | null> {
  const record = await findBusinessById(id);
  return record ? toBusiness(record) : null;
}

export async function createBusiness(input: CreateBusinessInput): Promise<Business> {
  const record = await createBusinessRecord(input);
  return toBusiness(record);
}

export async function updateBusiness(
  id: number,
  input: UpdateBusinessInput
): Promise<Business | null> {
  const record = await updateBusinessById(id, input);
  return record ? toBusiness(record) : null;
}

export async function removeBusiness(id: number): Promise<boolean> {
  return deleteBusinessById(id);
}
