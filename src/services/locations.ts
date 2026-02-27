import {
  type LocationRecord,
  type CreateLocationInput,
  type UpdateLocationInput,
  createLocation as createLocationRecord,
  deleteLocationById,
  findLocationById,
  listLocations as listLocationRecords,
  updateLocationById
} from "../repositories/locations";

export type Location = {
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

function toLocation(record: LocationRecord): Location {
  return {
    id: record.id,
    name: record.name,
    city: record.city,
    postalCode: record.postalCode,
    address: record.address,
    latitude: record.latitude,
    longitude: record.longitude,
    phone: record.phone,
    email: record.email,
    isActive: record.isActive,
    businessId: record.businessId
  };
}

export async function listAllLocations(businessId?: number): Promise<Location[]> {
  const records = await listLocationRecords(businessId);
  return records.map(toLocation);
}

export async function getLocationById(id: number): Promise<Location | null> {
  const record = await findLocationById(id);
  return record ? toLocation(record) : null;
}

export async function createLocation(input: CreateLocationInput): Promise<Location> {
  const record = await createLocationRecord(input);
  return toLocation(record);
}

export async function updateLocation(
  id: number,
  input: UpdateLocationInput
): Promise<Location | null> {
  const record = await updateLocationById(id, input);
  return record ? toLocation(record) : null;
}

export async function removeLocation(id: number): Promise<boolean> {
  return deleteLocationById(id);
}
