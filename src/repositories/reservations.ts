import { type ReservationStatus } from "@prisma/client";

import prisma from "../prisma/client";

const includeRelations = {
  user: { select: { name: true, surname: true } },
  session: {
    select: {
      id: true,
      startTime: true,
      endTime: true,
      activity: { select: { id: true, name: true, description: true } },
      instructor: { select: { id: true, name: true, email: true, phone: true } }
    }
  }
};

export type ReservationRecord = {
  id: number;
  userId: number;
  sessionId: number;
  occurrenceDate: Date | null;
  session?: {
    id: number;
    startTime: string;
    endTime: string;
    activity?: { id: number; name: string; description: string | null };
    instructor?: { id: number; name: string; email: string; phone: string };
  };
  user?: { name: string; surname: string };
  observations: string | null;
  state: ReservationStatus;
};

export type CreateReservationInput = {
  userId: number;
  sessionId: number;
  occurrenceDate?: Date | null;
  observations?: string | null;
};

export type UpdateReservationInput = {
  observations?: string | null;
  state?: ReservationStatus;
};

export type ReservationFilters = {
  userId?: number;
  sessionId?: number;
  status?: ReservationStatus;
};

export async function listReservations(
  filters: ReservationFilters = {}
): Promise<ReservationRecord[]> {
  const { userId, sessionId, status } = filters;

  return prisma.reservation.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(sessionId ? { sessionId } : {}),
      ...(status ? { state: status } : {})
    },
    include: includeRelations,
    orderBy: { id: "desc" }
  });
}

export async function createReservation(
  input: CreateReservationInput
): Promise<ReservationRecord> {
  return prisma.reservation.create({
    data: {
      userId: input.userId,
      sessionId: input.sessionId,
      occurrenceDate: input.occurrenceDate ?? null,
      observations: input.observations ?? null
    },
    include: includeRelations
  });
}

export async function findReservationById(
  id: number
): Promise<ReservationRecord | null> {
  return prisma.reservation.findUnique({
    where: { id },
    include: includeRelations
  });
}

export async function deleteReservationById(id: number): Promise<boolean> {
  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) {
    return false;
  }

  await prisma.reservation.delete({ where: { id } });
  return true;
}

export async function updateReservationById(
  id: number,
  input: UpdateReservationInput
): Promise<ReservationRecord | null> {
  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  return prisma.reservation.update({
    where: { id },
    data: {
      ...(input.observations !== undefined ? { observations: input.observations } : {}),
      ...(input.state !== undefined ? { state: input.state } : {})
    },
    include: includeRelations
  });
}
