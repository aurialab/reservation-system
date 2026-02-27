import type { Request, Response } from "express";
import type { Context, HandlerMap } from "openapi-backend";

import {
  postAuthLogin,
  postAuthPasswordReset,
  postAuthRegister,
  postAuthResetPassword,
  getAuthVerifyEmail,
  postAuthResendVerification,
  getAuthResetPasswordForm,
  postAuthResetPasswordForm
} from "./auth";
import {
  getMeNotifications,
  getNotifications,
  postMeNotificationsToken,
  postNotifications
} from "./notifications";
import {
  deleteMe,
  deleteUsersUserId,
  getMe,
  getUsers,
  getUsersUserId,
  postSetUserBo,
  putUsersUserId
} from "./users";
import {
  deleteReservationsReservationId,
  getMeReservations,
  getReservations,
  getReservationsReservationId,
  postMeReservations,
  postReservations,
  putReservationsReservationId
} from "./reservations";
import {
  getActivities,
  getActivitiesActivityId,
  postActivities,
  putActivitiesActivityId,
  deleteActivitiesActivityId
} from "./activities";
import {
  getInstructors,
  getInstructorsInstructorId,
  postInstructors,
  putInstructorsInstructorId,
  deleteInstructorsInstructorId
} from "./instructors";
import {
  getSessions,
  getSessionsSessionId,
  postSessions,
  putSessionsSessionId,
  deleteSessionsSessionId
} from "./sessions";
import { getLayers } from "./layers";
import {
  getBusinesses,
  getBusinessesBusinessId,
  postBusinesses,
  putBusinessesBusinessId,
  deleteBusinessesBusinessId
} from "./business";
import {
  getLocations,
  getLocationsLocationId,
  getBusinessesBusinessIdLocations,
  postLocations,
  putLocationsLocationId,
  deleteLocationsLocationId
} from "./locations";

export const notFound = (_context: Context, _req: Request, res: Response) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: "Route not found"
  });
};

export const notImplemented = (_context: Context, _req: Request, res: Response) => {
  res.status(501).json({
    error: "NOT_IMPLEMENTED",
    message: "Operation not implemented"
  });
};

export const handlers: HandlerMap = {
  getUsers,
  getUsersUserId,
  putUsersUserId,
  deleteUsersUserId,
  postSetUserBo,
  getMe,
  deleteMe,
  getNotifications,
  postNotifications,
  getMeNotifications,
  postMeNotificationsToken,
  postAuthLogin,
  postAuthPasswordReset,
  postAuthRegister,
  postAuthResetPassword,
  getAuthVerifyEmail,
  postAuthResendVerification,
  getAuthResetPasswordForm,
  postAuthResetPasswordForm,
  getReservations,
  postReservations,
  getMeReservations,
  postMeReservations,
  getReservationsReservationId,
  putReservationsReservationId,
  deleteReservationsReservationId,
  getActivities,
  getActivitiesActivityId,
  postActivities,
  putActivitiesActivityId,
  deleteActivitiesActivityId,
  getInstructors,
  getInstructorsInstructorId,
  postInstructors,
  putInstructorsInstructorId,
  deleteInstructorsInstructorId,
  getSessions,
  getSessionsSessionId,
  postSessions,
  putSessionsSessionId,
  deleteSessionsSessionId,
  getLayers,
  getBusinesses,
  getBusinessesBusinessId,
  postBusinesses,
  putBusinessesBusinessId,
  deleteBusinessesBusinessId,
  getLocations,
  getLocationsLocationId,
  getBusinessesBusinessIdLocations,
  postLocations,
  putLocationsLocationId,
  deleteLocationsLocationId,
  notFound,
  notImplemented
};
