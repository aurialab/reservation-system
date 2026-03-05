import {
  createReservation as createReservationRecord,
  deleteReservationById,
  findReservationById,
  listReservations,
  updateReservationById,
  type CreateReservationInput,
  type UpdateReservationInput,
  type ReservationFilters,
  type ReservationRecord
} from "../repositories/reservations";
import { logger } from "./logger";

export type ReservationSession = {
  id: number;
  startTime: string;
  endTime: string;
  activity?: { id: number; name: string; description: string | null };
  instructor?: { id: number; name: string; email: string; phone: string };
};

export type Reservation = {
  id: number;
  userId: number;
  sessionId: number;
  occurrenceDate?: string;
  session?: ReservationSession;
  user?: { name: string; surname: string };
  observations?: string;
  state: { status: ReservationRecord["state"] };
};

export type CreateReservationPayload = {
  userId: number;
  sessionId: number;
  occurrenceDate?: string;
  observations?: string;
};

function toReservation(record: ReservationRecord): Reservation {
  const session = record.session
    ? {
        id: record.session.id,
        startTime: record.session.startTime,
        endTime: record.session.endTime,
        activity: record.session.activity,
        instructor: record.session.instructor
      }
    : undefined;

  return {
    id: record.id,
    userId: record.userId,
    sessionId: record.sessionId,
    occurrenceDate: record.occurrenceDate ? record.occurrenceDate.toISOString().slice(0, 10) : undefined,
    session,
    user: record.user ? { name: record.user.name, surname: record.user.surname } : undefined,
    observations: record.observations ?? undefined,
    state: { status: record.state }
  };
}

export async function listAllReservations(
  filters: ReservationFilters = {}
): Promise<Reservation[]> {
  const reservations = await listReservations(filters);
  return reservations.map(toReservation);
}

export async function getReservationById(
  reservationId: number
): Promise<Reservation | null> {
  const reservation = await findReservationById(reservationId);
  return reservation ? toReservation(reservation) : null;
}

export async function createReservation(
  payload: CreateReservationPayload
): Promise<Reservation | null> {
  let parsedOccurrenceDate: Date | null = null;
  if (payload.occurrenceDate) {
    const match = payload.occurrenceDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return null;
    }
    parsedOccurrenceDate = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    if (Number.isNaN(parsedOccurrenceDate.getTime())) {
      return null;
    }
  }

  const input: CreateReservationInput = {
    userId: payload.userId,
    sessionId: payload.sessionId,
    occurrenceDate: parsedOccurrenceDate,
    observations: payload.observations
  };

  const reservation = await createReservationRecord(input);
  return toReservation(reservation);
}

export async function removeReservation(
  reservationId: number
): Promise<boolean> {
  return deleteReservationById(reservationId);
}

export type UpdateReservationPayload = {
  observations?: string;
  status?: string;
};

export async function updateReservation(
  reservationId: number,
  payload: UpdateReservationPayload
): Promise<Reservation | null> {
  const updateData: UpdateReservationInput = {};
  
  if (payload.observations !== undefined) {
    updateData.observations = payload.observations || null;
  }
  
  if (payload.status) {
    const validStatuses = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];
    if (validStatuses.includes(payload.status)) {
      updateData.state = payload.status as any;
    }
  }
  
  const updated = await updateReservationById(reservationId, updateData);
  return updated ? toReservation(updated) : null;
}