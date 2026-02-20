import bcrypt from "bcrypt";

import { signToken } from "../auth/jwt";
import {
  type CreateUserInput,
  createUser,
  findUserByEmail,
  updateUserPassword,
  type UserRecord
} from "../repositories/user";
import {
  createPasswordResetToken,
  invalidateUserTokens,
  markTokenAsUsed,
  validatePasswordResetToken
} from "../repositories/password-reset";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email";
import { logger } from "./logger";
import {
  createEmailVerificationToken,
  hasValidVerificationToken,
  invalidateUserEmailTokens,
  markEmailTokenAsUsed,
  validateEmailVerificationToken,
  verifyUserEmail
} from "../repositories/email-verification";

export type PublicUser = Omit<UserRecord, "passwordHash">;

export type RegisterSuccessResult = {
  user: PublicUser;
  verificationEmailSent: boolean;
};

export type RegisterPayload = {
  email: string;
  name: string;
  surname: string;
  phone: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type PasswordResetPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  token: string;
  newPassword: string;
};

type ServiceError = {
  status: number;
  body: { error: string; message: string };
};

export type RegisterResult =
  | { ok: true; result: RegisterSuccessResult }
  | { ok: false; error: ServiceError };

export type LoginResult =
  | { ok: true; user: PublicUser; token: string }
  | { ok: false; error: ServiceError };

export type PasswordResetResult =
  | { ok: true; message: string }
  | { ok: false; error: ServiceError };

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; error: ServiceError };

export type VerifyEmailPayload = {
  token: string;
};

export type VerifyEmailResult =
  | { ok: true }
  | { ok: false; error: ServiceError };

export type ResendVerificationPayload = {
  email: string;
};

const invalidCredentialsError: ServiceError = {
  status: 401,
  body: { error: "AUTH_FAILED", message: "Credencials invàlides." }
};

const emailNotVerifiedError: ServiceError = {
  status: 403,
  body: {
    error: "EMAIL_NOT_VERIFIED",
    message: "El correu electrònic no ha estat verificat. Revisa la teva bústia."
  }
};

const emailExistsError: ServiceError = {
  status: 400,
  body: { error: "INVALID_INPUT", message: "Email already exists." }
};

function toPublicUser(user: UserRecord): PublicUser {
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function registerUser(
  payload: RegisterPayload
): Promise<RegisterResult> {
  const existing = await findUserByEmail(payload.email);
  if (existing) {
    return { ok: false, error: emailExistsError };
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const input: CreateUserInput = {
    email: payload.email,
    name: payload.name,
    surname: payload.surname,
    phone: payload.phone,
    passwordHash,
    isVerified: false,
    isBO: false
  };
  const user = await createUser(input);

  // Create verification token and send email
  const verificationToken = await createEmailVerificationToken(user.id);
  const emailResult = await sendVerificationEmail(user.email, verificationToken);

  if (!emailResult.ok) {
    logger.error("Failed to send verification email", { error: emailResult.error });
  }

  return {
    ok: true,
    result: {
      user: toPublicUser(user),
      verificationEmailSent: emailResult.ok
    }
  };
}

export async function loginUser(payload: LoginPayload): Promise<LoginResult> {
  const user = await findUserByEmail(payload.email);
  if (!user) {
    return { ok: false, error: invalidCredentialsError };
  }

  const isValid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isValid) {
    return { ok: false, error: invalidCredentialsError };
  }

  const token = signToken({ userId: String(user.id), email: user.email });
  return { ok: true, user: toPublicUser(user), token };
}

export async function requestPasswordReset(
  payload: PasswordResetPayload
): Promise<PasswordResetResult> {
  const user = await findUserByEmail(payload.email);

  // Always return success to prevent email enumeration attacks
  if (!user) {
    return {
      ok: true,
      message: "Si l'email existeix, rebràs un enllaç per restablir la teva contrasenya."
    };
  }

  const token = await createPasswordResetToken(user.id);
  const emailResult = await sendPasswordResetEmail(user.email, token);

  if (!emailResult.ok) {
    logger.error("Failed to send password reset email", { error: emailResult.error });
    // Still return generic message to not leak info
    return {
      ok: true,
      message: "Si l'email existeix, rebràs un enllaç per restablir la teva contrasenya."
    };
  }

  return {
    ok: true,
    message: "Si l'email existeix, rebràs un enllaç per restablir la teva contrasenya."
  };
}

export async function resetPassword(
  payload: ResetPasswordPayload
): Promise<ResetPasswordResult> {
  const validation = await validatePasswordResetToken(payload.token);

  if (!validation.valid) {
    return {
      ok: false,
      error: {
        status: 400,
        body: { error: "INVALID_TOKEN", message: "Token invàlid o expirat." }
      }
    };
  }

  if (payload.newPassword.length < 6) {
    return {
      ok: false,
      error: {
        status: 400,
        body: {
          error: "INVALID_INPUT",
          message: "La contrasenya ha de tenir almenys 6 caràcters."
        }
      }
    };
  }

  const passwordHash = await bcrypt.hash(payload.newPassword, 10);
  await updateUserPassword(validation.userId, passwordHash);
  await markTokenAsUsed(payload.token);
  await invalidateUserTokens(validation.userId);
  
  // Mark user as verified since they proved access to their email
  await verifyUserEmail(validation.userId);
  logger.info("User verified via password reset", { userId: validation.userId });

  return { ok: true };
}

export async function verifyEmail(
  payload: VerifyEmailPayload
): Promise<VerifyEmailResult> {
  const validation = await validateEmailVerificationToken(payload.token);

  if (!validation.valid) {
    return {
      ok: false,
      error: {
        status: 400,
        body: { error: "INVALID_TOKEN", message: "Token invàlid o expirat." }
      }
    };
  }

  await verifyUserEmail(validation.userId);
  await markEmailTokenAsUsed(payload.token);

  return { ok: true };
}

export async function resendVerificationEmail(
  payload: ResendVerificationPayload
): Promise<PasswordResetResult> {
  const user = await findUserByEmail(payload.email);

  // Always return success to prevent email enumeration attacks
  if (!user) {
    return {
      ok: true,
      message: "Si l'email existeix i no està verificat, rebràs un correu de verificació."
    };
  }

  // If already verified, still return generic message
  if (user.isVerified) {
    return {
      ok: true,
      message: "Si l'email existeix i no està verificat, rebràs un correu de verificació."
    };
  }

  // Check if there's already a valid token
  const hasValid = await hasValidVerificationToken(user.id);
  if (hasValid) {
    return {
      ok: true,
      message: "Si l'email existeix i no està verificat, rebràs un correu de verificació."
    };
  }

  const token = await createEmailVerificationToken(user.id);
  const emailResult = await sendVerificationEmail(user.email, token);

  if (!emailResult.ok) {
    logger.error("Failed to resend verification email", { error: emailResult.error });
  }

  return {
    ok: true,
    message: "Si l'email existeix i no està verificat, rebràs un correu de verificació."
  };
}
