import type { ReservationStatus } from "@prisma/client";
import type { Request, Response } from "express";
import type { Context } from "openapi-backend";

import {
  AUTH_ERROR_RESPONSE,
  getAuthPayload
} from "../middleware/auth";
import {
  createReservation,
  getReservationById,
  listAllReservations,
  removeReservation,
  updateReservation
} from "../services/reservations";
import { getUserById } from "../services/users";
import { sendReservationCreatedEmail, sendReservationCancelledEmail } from "../services/email";
import { sendNotifications } from "../services/notifications";
import { logger } from "../services/logger";

const invalidFilterError = {
  error: "INVALID_FILTER",
  message: "Invalid filters"
};

const notFoundError = {
  error: "NOT_FOUND",
  message: "Reservation not found"
};

const capacityExceededError = {
  error: "CAPACITY_EXCEEDED",
  message: "No es possible registrar la reserva. No hi ha disponibilitat per a aquest dia i hora."
};

const forbiddenBoError = {
  error: "FORBIDDEN",
  message: "No tens permisos de Back-Office"
};

const emailNotVerifiedError = {
  error: "EMAIL_NOT_VERIFIED",
  message: "El correu electrònic no ha estat verificat. Revisa la teva bústia."
};

const validStatuses = new Set<ReservationStatus>([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED"
]);

function requireAuth(req: Request, res: Response) {
  const payload = getAuthPayload(req.headers.token);
  if (!payload) {
    res.status(401).json(AUTH_ERROR_RESPONSE);
    return null;
  }

  return payload;
}

function parseReservationId(context: Context): number | null {
  const raw = context.request.params?.reservation_id;
  if (typeof raw === "number") {
    return Number.isInteger(raw) && raw > 0 ? raw : null;
  }

  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function parseNumberFilter(value: unknown): number | null {
  if (value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  if (typeof value === "string") {
    if (!value.trim()) {
      return null;
    }
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function parseStatusFilter(value: unknown): ReservationStatus | null {
  if (value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  return validStatuses.has(value as ReservationStatus) ? (value as ReservationStatus) : null;
}

function parseCreateReservationPayload(
  payload: unknown
): { userId: number; sessionId: number; observations?: string } | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const userId = data.userId;
  const sessionId = data.sessionId;
  if (typeof userId !== "number" || !Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  if (
    typeof sessionId !== "number" ||
    !Number.isInteger(sessionId) ||
    sessionId <= 0
  ) {
    return null;
  }

  if (data.observations !== undefined && typeof data.observations !== "string") {
    return null;
  }

  return {
    userId,
    sessionId,
    observations: data.observations
  };
}

function parseMeReservationPayload(
  payload: unknown
): { sessionId: number; observations?: string } | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const sessionId = data.sessionId;
  if (
    typeof sessionId !== "number" ||
    !Number.isInteger(sessionId) ||
    sessionId <= 0
  ) {
    return null;
  }

  if (data.observations !== undefined && typeof data.observations !== "string") {
    return null;
  }

  return {
    sessionId,
    observations: data.observations
  };
}

function parseUpdateReservationPayload(
  payload: unknown
): { observations?: string; status?: string } | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const result: { observations?: string; status?: string } = {};

  if (data.observations !== undefined) {
    if (typeof data.observations !== "string") {
      return null;
    }
    result.observations = data.observations;
  }

  if (data.status !== undefined) {
    if (typeof data.status !== "string") {
      return null;
    }
    result.status = data.status;
  }

  // At least one field must be provided
  if (Object.keys(result).length === 0) {
    return null;
  }

  return result;
}

function buildReservationCreatedMessage(sessionDate: string, activityName: string): string {
  return `La teva reserva per a ${activityName} el ${sessionDate} s'ha creat correctament.`;
}

function buildReservationCancelledMessage(
  sessionDate: string,
  activityName: string,
  reason: "CAPACITY_REDUCTION" | "MANUAL_CANCELLATION" | "OTHER"
): string {
  if (reason === "CAPACITY_REDUCTION") {
    return `La teva reserva per a ${activityName} el ${sessionDate} ha estat cancel.lada per reduccio de capacitat.`;
  }

  if (reason === "MANUAL_CANCELLATION") {
    return `La teva reserva per a ${activityName} el ${sessionDate} ha estat cancel.lada pel Back Office.`;
  }

  return `La teva reserva per a ${activityName} el ${sessionDate} ha estat cancel.lada.`;
}

async function notifyReservationCreated(
  userId: number,
  sessionDate: string,
  activityName: string,
  observations?: string
): Promise<void> {
  const notificationText = buildReservationCreatedMessage(sessionDate, activityName);

  try {
    await sendNotifications({
      text: notificationText,
      users: [userId]
    });
  } catch (error) {
    logger.error("Failed to create reservation created notification", {
      error,
      userId,
      sessionDate,
      activityName
    });
  }

  try {
    const user = await getUserById(userId);
    if (!user?.email) {
      logger.warn("Reservation created email skipped: user has no email", {
        userId,
        sessionDate,
        activityName
      });
      return;
    }

    const emailResult = await sendReservationCreatedEmail(
      user.email,
      sessionDate,
      activityName,
      observations
    );

    if (!emailResult.ok) {
      logger.error("Failed to send reservation created email", {
        userId,
        sessionDate,
        activityName,
        error: emailResult.error
      });
    }
  } catch (error) {
    logger.error("Unexpected error sending reservation created email", {
      error,
      userId,
      sessionDate,
      activityName
    });
  }
}

async function notifyReservationCancelled(
  userId: number,
  sessionDate: string,
  activityName: string,
  reason: "CAPACITY_REDUCTION" | "MANUAL_CANCELLATION" | "OTHER"
): Promise<void> {
  const notificationText = buildReservationCancelledMessage(sessionDate, activityName, reason);

  try {
    await sendNotifications({
      text: notificationText,
      users: [userId]
    });
  } catch (error) {
    logger.error("Failed to create reservation cancelled notification", {
      error,
      userId,
      sessionDate,
      activityName,
      reason
    });
  }

  try {
    const user = await getUserById(userId);
    if (!user?.email) {
      logger.warn("Reservation cancelled email skipped: user has no email", {
        userId,
        sessionDate,
        activityName,
        reason
      });
      return;
    }

    const emailResult = await sendReservationCancelledEmail(
      user.email,
      sessionDate,
      activityName,
      reason
    );

    if (!emailResult.ok) {
      logger.error("Failed to send reservation cancelled email", {
        userId,
        sessionDate,
        activityName,
        reason,
        error: emailResult.error
      });
    }
  } catch (error) {
    logger.error("Unexpected error sending reservation cancelled email", {
      error,
      userId,
      sessionDate,
      activityName,
      reason
    });
  }
}

export async function getReservations(
  context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const rawUserId = context.request.query?.user_id;
  const rawStatus = context.request.query?.status;
  const userId = parseNumberFilter(rawUserId);
  const status = parseStatusFilter(rawStatus);

  if ((rawUserId !== undefined && userId === null) ||
      (rawStatus !== undefined && status === null)) {
    return res.status(400).json(invalidFilterError);
  }

  let reservations;
  try {
    reservations = await listAllReservations({
      ...(userId ? { userId } : {}),
      ...(status ? { status } : {})
    });
  } catch (error) {
    logger.error("Failed to list reservations", { error, userId, status });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  return res.status(200).json(reservations);
}

export async function postReservations(
  _context: Context,
  req: Request,
  res: Response
) {
  const authPayload = requireAuth(req, res);
  if (!authPayload) {
    return;
  }

  const requestingUserId = Number(authPayload.userId);
  if (!Number.isFinite(requestingUserId)) {
    return res.status(401).json(AUTH_ERROR_RESPONSE);
  }

  const payload = parseCreateReservationPayload(req.body);
  if (!payload) {
    return res.status(400).json(invalidFilterError);
  }

  if (payload.userId !== requestingUserId) {
    let requestingUser;
    try {
      requestingUser = await getUserById(requestingUserId);
    } catch (error) {
      logger.error("Failed to fetch requesting user", { error, requestingUserId });
      return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
    }
    if (!requestingUser?.isBO) {
      return res.status(403).json(forbiddenBoError);
    }
  }

  // Validate payload and create reservation
  let reservation;
  try {
    reservation = await createReservation(payload);
  } catch (error) {
    logger.error("Failed to create reservation", { error, payload });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }
  if (!reservation) {
    return res.status(400).json(invalidFilterError);
  }

  // Send notifications (fail-safe: don't block creation if notifications fail)
  try {
    const sessionDate = reservation.session?.date ?? "";
    const activityName = reservation.session?.activity?.name ?? "";
    await notifyReservationCreated(
      payload.userId,
      sessionDate,
      activityName,
      reservation.observations
    );
  } catch (error) {
    logger.error("Failed to send creation notifications", {
      error,
      userId: payload.userId,
      sessionId: payload.sessionId
    });
  }

  return res.status(200).json(reservation);
}

export async function getMeReservations(
  _context: Context,
  req: Request,
  res: Response
) {
  const payload = requireAuth(req, res);
  if (!payload) {
    return;
  }

  const userId = Number(payload.userId);
  if (!Number.isFinite(userId)) {
    return res.status(401).json(AUTH_ERROR_RESPONSE);
  }

  let reservations;
  try {
    reservations = await listAllReservations({ userId });
  } catch (error) {
    logger.error("Failed to list me reservations", { error, userId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }
  return res.status(200).json(reservations);
}

export async function postMeReservations(
  _context: Context,
  req: Request,
  res: Response
) {
  const payload = requireAuth(req, res);
  if (!payload) {
    return;
  }

  const userId = Number(payload.userId);
  if (!Number.isFinite(userId)) {
    return res.status(401).json(AUTH_ERROR_RESPONSE);
  }

  // Check if user is verified
  let user;
  try {
    user = await getUserById(userId);
  } catch (error) {
    logger.error("Failed to fetch user for me reservations", { error, userId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }
  if (!user || !user.isVerified) {
    return res.status(403).json(emailNotVerifiedError);
  }

  const body = parseMeReservationPayload(req.body);
  if (!body) {
    return res.status(400).json(invalidFilterError);
  }

  let reservation;
  try {
    reservation = await createReservation({
      userId,
      sessionId: body.sessionId,
      observations: body.observations
    });
  } catch (error) {
    logger.error("Failed to create me reservation", { error, userId, sessionId: body.sessionId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }
  if (!reservation) {
    return res.status(400).json(invalidFilterError);
  }

  // Send notifications (fail-safe: don't block creation if notifications fail)
  try {
    const sessionDate = reservation.session?.date ?? "";
    const activityName = reservation.session?.activity?.name ?? "";
    await notifyReservationCreated(
      userId,
      sessionDate,
      activityName,
      reservation.observations
    );
  } catch (error) {
    logger.error("Failed to send creation notifications", {
      error,
      userId,
      sessionId: reservation.sessionId
    });
  }

  return res.status(200).json(reservation);
}

export async function getReservationsReservationId(
  context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const reservationId = parseReservationId(context);
  if (reservationId === null) {
    return res.status(400).json(invalidFilterError);
  }

  let reservation;
  try {
    reservation = await getReservationById(reservationId);
  } catch (error) {
    logger.error("Failed to fetch reservation by id", { error, reservationId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }
  if (!reservation) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).json(reservation);
}

export async function putReservationsReservationId(
  context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const reservationId = parseReservationId(context);
  if (reservationId === null) {
    return res.status(400).json(invalidFilterError);
  }

  const payload = parseUpdateReservationPayload(req.body);
  if (!payload) {
    return res.status(400).json(invalidFilterError);
  }

  let existingReservation;
  try {
    existingReservation = await getReservationById(reservationId);
  } catch (error) {
    logger.error("Failed to fetch reservation for update", { error, reservationId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }
  if (!existingReservation) {
    return res.status(404).json(notFoundError);
  }

  let updatedReservation;
  try {
    updatedReservation = await updateReservation(reservationId, payload);
  } catch (error) {
    logger.error("Failed to update reservation", { error, reservationId, payload });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }
  if (!updatedReservation) {
    return res.status(400).json(invalidFilterError);
  }

  // If status changed to CANCELLED, send notifications (fail-safe)
  if (payload.status === "CANCELLED" && existingReservation.state.status !== "CANCELLED") {
    try {
      const sessionDate = existingReservation.session?.date ?? "";
      const activityName = existingReservation.session?.activity?.name ?? "";
      await notifyReservationCancelled(
        existingReservation.userId,
        sessionDate,
        activityName,
        "MANUAL_CANCELLATION"
      );
    } catch (error) {
      logger.error("Failed to send cancellation notifications", {
        error,
        reservationId,
        userId: existingReservation.userId
      });
    }
  }

  return res.status(200).json(updatedReservation);
}

export async function deleteReservationsReservationId(
  context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const reservationId = parseReservationId(context);
  if (reservationId === null) {
    return res.status(400).json(invalidFilterError);
  }

  let existingReservation;
  try {
    existingReservation = await getReservationById(reservationId);
  } catch (error) {
    logger.error("Failed to fetch reservation for deletion", { error, reservationId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!existingReservation) {
    return res.status(404).json(notFoundError);
  }

  let deleted;
  try {
    deleted = await removeReservation(reservationId);
  } catch (error) {
    logger.error("Failed to delete reservation", { error, reservationId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!deleted) {
    return res.status(404).json(notFoundError);
  }

  // Send notifications (fail-safe: don't block deletion if notifications fail)
  try {
    const sessionDate = existingReservation.session?.date ?? "";
    const activityName = existingReservation.session?.activity?.name ?? "";
    await notifyReservationCancelled(
      existingReservation.userId,
      sessionDate,
      activityName,
      "MANUAL_CANCELLATION"
    );
  } catch (error) {
    logger.error("Failed to send deletion notifications", {
      error,
      reservationId,
      userId: existingReservation.userId
    });
  }

  return res.status(200).send();
}
