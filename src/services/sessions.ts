import {
  type SessionRecord,
  type CreateSessionInput,
  type UpdateSessionInput,
  type SessionFilters,
  createSession as createSessionRecord,
  deleteSessionById,
  findSessionById,
  listSessions as listSessionRecords,
  updateSessionById
} from "../repositories/sessions";

export type SessionActivity = {
  id: number;
  name: string;
  description: string | null;
};

export type SessionInstructor = {
  id: number;
  name: string;
  email: string;
  phone: string;
};

export type Session = {
  id: number;
  activityId: number;
  instructorId: number;
  date: string;
  startTime: string;
  endTime: string;
  activity?: SessionActivity;
  instructor?: SessionInstructor;
};

export type CreateSessionPayload = {
  activityId: number;
  instructorId: number;
  date: string;
  startTime: string;
  endTime: string;
};

export type UpdateSessionPayload = {
  activityId?: number;
  instructorId?: number;
  date?: string;
  startTime?: string;
  endTime?: string;
};

function toSession(record: SessionRecord): Session {
  return {
    id: record.id,
    activityId: record.activityId,
    instructorId: record.instructorId,
    date: record.date.toISOString().slice(0, 10),
    startTime: record.startTime,
    endTime: record.endTime,
    activity: record.activity,
    instructor: record.instructor
  };
}

function parseDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export async function listAllSessions(filters: SessionFilters = {}): Promise<Session[]> {
  const records = await listSessionRecords(filters);
  return records.map(toSession);
}

export async function getSessionById(id: number): Promise<Session | null> {
  const record = await findSessionById(id);
  return record ? toSession(record) : null;
}

export async function createSession(payload: CreateSessionPayload): Promise<Session | null> {
  const parsedDate = parseDate(payload.date);
  if (!parsedDate) {
    return null;
  }

  const input: CreateSessionInput = {
    activityId: payload.activityId,
    instructorId: payload.instructorId,
    date: parsedDate,
    startTime: payload.startTime,
    endTime: payload.endTime
  };

  const record = await createSessionRecord(input);
  return toSession(record);
}

export async function updateSession(
  id: number,
  payload: UpdateSessionPayload
): Promise<Session | null> {
  const updateInput: UpdateSessionInput = {};

  if (payload.activityId !== undefined) {
    updateInput.activityId = payload.activityId;
  }
  if (payload.instructorId !== undefined) {
    updateInput.instructorId = payload.instructorId;
  }
  if (payload.date !== undefined) {
    const parsedDate = parseDate(payload.date);
    if (!parsedDate) {
      return null;
    }
    updateInput.date = parsedDate;
  }
  if (payload.startTime !== undefined) {
    updateInput.startTime = payload.startTime;
  }
  if (payload.endTime !== undefined) {
    updateInput.endTime = payload.endTime;
  }

  const record = await updateSessionById(id, updateInput);
  return record ? toSession(record) : null;
}

export async function removeSession(id: number): Promise<boolean> {
  return deleteSessionById(id);
}
