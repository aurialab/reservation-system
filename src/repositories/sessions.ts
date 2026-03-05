import { type WeekDay } from "@prisma/client";
import prisma from "../prisma/client";

export type SessionRecord = {
  id: number;
  activityId: number;
  instructorId: number;
  locationId: number;
  startDate: Date;
  endDate: Date;
  weekDays: WeekDay[];
  startTime: string;
  endTime: string;
  activity?: { id: number; name: string; description: string | null };
  instructor?: { id: number; name: string; email: string; phone: string };
};

export type CreateSessionInput = {
  activityId: number;
  instructorId: number;
  locationId: number;
  startDate: Date;
  endDate: Date;
  weekDays: WeekDay[];
  startTime: string;
  endTime: string;
};

export type UpdateSessionInput = {
  activityId?: number;
  instructorId?: number;
  locationId?: number;
  startDate?: Date;
  endDate?: Date;
  weekDays?: WeekDay[];
  startTime?: string;
  endTime?: string;
};

export type SessionFilters = {
  activityId?: number;
  instructorId?: number;
  fromDate?: Date;
  toDate?: Date;
};

const includeRelations = {
  activity: { select: { id: true, name: true, description: true } },
  instructor: { select: { id: true, name: true, email: true, phone: true } }
};

export async function listSessions(filters: SessionFilters = {}): Promise<SessionRecord[]> {
  const { activityId, instructorId, fromDate, toDate } = filters;

  return prisma.session.findMany({
    where: {
      ...(activityId ? { activityId } : {}),
      ...(instructorId ? { instructorId } : {}),
      ...(fromDate ? { endDate: { gte: fromDate } } : {}),
      ...(toDate ? { startDate: { lte: toDate } } : {})
    },
    include: includeRelations,
    orderBy: [{ startDate: "asc" }, { startTime: "asc" }]
  });
}

export async function findSessionById(id: number): Promise<SessionRecord | null> {
  return prisma.session.findUnique({
    where: { id },
    include: includeRelations
  });
}

export async function createSession(input: CreateSessionInput): Promise<SessionRecord> {
  return prisma.session.create({
    data: {
      activityId: input.activityId,
      instructorId: input.instructorId,
      locationId: input.locationId,
      startDate: input.startDate,
      endDate: input.endDate,
      weekDays: input.weekDays,
      startTime: input.startTime,
      endTime: input.endTime
    },
    include: includeRelations
  });
}

export async function updateSessionById(
  id: number,
  input: UpdateSessionInput
): Promise<SessionRecord | null> {
  const existing = await prisma.session.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  return prisma.session.update({
    where: { id },
    data: {
      ...(input.activityId !== undefined ? { activityId: input.activityId } : {}),
      ...(input.instructorId !== undefined ? { instructorId: input.instructorId } : {}),
      ...(input.locationId !== undefined ? { locationId: input.locationId } : {}),
      ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
      ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
      ...(input.weekDays !== undefined ? { weekDays: input.weekDays } : {}),
      ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
      ...(input.endTime !== undefined ? { endTime: input.endTime } : {})
    },
    include: includeRelations
  });
}

export async function deleteSessionById(id: number): Promise<boolean> {
  const existing = await prisma.session.findUnique({ where: { id } });
  if (!existing) {
    return false;
  }

  await prisma.session.delete({ where: { id } });
  return true;
}
