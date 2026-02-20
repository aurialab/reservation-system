import {
  type ActivityRecord,
  type CreateActivityInput,
  type UpdateActivityInput,
  createActivity as createActivityRecord,
  deleteActivityById,
  findActivityById,
  listActivities as listActivityRecords,
  updateActivityById
} from "../repositories/activities";

export type Activity = {
  id: number;
  name: string;
  description: string | null;
};

function toActivity(record: ActivityRecord): Activity {
  return {
    id: record.id,
    name: record.name,
    description: record.description
  };
}

export async function listActivities(): Promise<Activity[]> {
  const records = await listActivityRecords();
  return records.map(toActivity);
}

export async function getActivityById(id: number): Promise<Activity | null> {
  const record = await findActivityById(id);
  return record ? toActivity(record) : null;
}

export async function createActivity(input: CreateActivityInput): Promise<Activity> {
  const record = await createActivityRecord(input);
  return toActivity(record);
}

export async function updateActivity(
  id: number,
  input: UpdateActivityInput
): Promise<Activity | null> {
  const record = await updateActivityById(id, input);
  return record ? toActivity(record) : null;
}

export async function removeActivity(id: number): Promise<boolean> {
  return deleteActivityById(id);
}
