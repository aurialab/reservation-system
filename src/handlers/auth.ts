import type { Request, Response } from "express";
import type { Context } from "openapi-backend";

import {
  type LoginPayload,
  loginUser,
  type PasswordResetPayload,
  requestPasswordReset,
  type RegisterPayload,
  registerUser,
  type ResetPasswordPayload,
  resetPassword,
  type ResendVerificationPayload,
  resendVerificationEmail,
  type VerifyEmailPayload,
  verifyEmail
} from "../services/auth";
import { validatePasswordResetToken } from "../repositories/password-reset";
import { renderTemplate } from "../services/html-templates";

export async function postAuthRegister(
  _context: Context,
  req: Request,
  res: Response
) {
  const result = await registerUser(req.body as RegisterPayload);
  if (!result.ok) {
    return res.status(result.error.status).json(result.error.body);
  }

  return res.status(200).json(result.result);
}

export async function postAuthLogin(
  _context: Context,
  req: Request,
  res: Response
) {
  const result = await loginUser(req.body as LoginPayload);
  if (!result.ok) {
    return res.status(result.error.status).json(result.error.body);
  }

  return res.status(200).json({ Authorization: result.token, user: result.user });
}

export async function postAuthPasswordReset(
  _context: Context,
  req: Request,
  res: Response
) {
  const result = await requestPasswordReset(req.body as PasswordResetPayload);
  if (!result.ok) {
    return res.status(result.error.status).json(result.error.body);
  }
  return res.status(200).json({ message: result.message });
}

export async function postAuthResetPassword(
  _context: Context,
  req: Request,
  res: Response
) {
  const result = await resetPassword(req.body as ResetPasswordPayload);
  if (!result.ok) {
    return res.status(result.error.status).json(result.error.body);
  }
  return res.status(200).json({ message: "Contrasenya actualitzada correctament." });
}

function renderVerificationHtml(message: string, isError: boolean): string {
  const bgColor = isError ? "#fee2e2" : "#d1fae5";
  const textColor = isError ? "#991b1b" : "#065f46";
  const icon = isError ? "❌" : "✅";
  const title = isError ? "Error de verificació" : "Compte verificat";

  return renderTemplate("verify-result", {
    title,
    message,
    icon,
    bgColor,
    textColor,
    buttonText: "Anar a l'aplicació",
    buttonHref: "/"
  });
}

export async function getAuthVerifyEmail(
  _context: Context,
  req: Request,
  res: Response
) {
  const token = req.query.token as string;
  if (!token) {
    const html = renderVerificationHtml(
      "No s'ha proporcionat cap token de verificació.",
      true
    );
    return res.status(400).type('html').send(html);
  }

  const result = await verifyEmail({ token });
  if (!result.ok) {
    const html = renderVerificationHtml(
      result.error.body.message || "El token és invàlid o ha expirat.",
      true
    );
    return res.status(result.error.status).type('html').send(html);
  }

  const html = renderVerificationHtml(
    "El teu compte ha estat verificat correctament. Ja pots iniciar sessió a l'aplicació.",
    false
  );
  return res.status(200).type('html').send(html);
}

export async function postAuthResendVerification(
  _context: Context,
  req: Request,
  res: Response
) {
  const result = await resendVerificationEmail(req.body as ResendVerificationPayload);
  if (!result.ok) {
    return res.status(result.error.status).json(result.error.body);
  }
  return res.status(200).json({ message: result.message });
}

function renderResetPasswordFormHtml(token: string, error?: string): string {
  const bgColor = error ? "#fee2e2" : "#eff6ff";
  const textColor = error ? "#991b1b" : "#1e40af";
  const errorBlock = error ? `<div class="error">${error}</div>` : "";

  return renderTemplate("reset-form", {
    bgColor,
    textColor,
    errorBlock,
    token,
    actionUrl: "/auth/reset-password-form"
  });
}

function renderResetSuccessHtml(): string {
  return renderTemplate("reset-success", {});
}

export async function getAuthResetPasswordForm(
  _context: Context,
  req: Request,
  res: Response
) {
  const token = req.query.token as string;
  
  if (!token) {
    const html = renderResetPasswordFormHtml("", "Token no proporcionat.");
    return res.status(400).type("html").send(html);
  }

  // Validar que el token existe y no ha expirado
  const validation = await validatePasswordResetToken(token);
  if (!validation.valid) {
    const html = renderResetPasswordFormHtml(token, "El token és invàlid o ha expirat. Sol·licita un nou enllaç de restabliment.");
    return res.status(400).type("html").send(html);
  }

  // Mostrar formulario
  const html = renderResetPasswordFormHtml(token);
  return res.status(200).type("html").send(html);
}

export async function postAuthResetPasswordForm(
  _context: Context,
  req: Request,
  res: Response
) {
  const token = req.body.token as string;
  const newPassword = req.body.newPassword as string;

  if (!token || !newPassword) {
    const html = renderResetPasswordFormHtml(token || "", "Falten dades obligatòries.");
    return res.status(400).type("html").send(html);
  }

  if (newPassword.length < 6) {
    const html = renderResetPasswordFormHtml(token, "La contrasenya ha de tenir almenys 6 caràcters.");
    return res.status(400).type("html").send(html);
  }

  const result = await resetPassword({ token, newPassword });
  
  if (!result.ok) {
    const html = renderResetPasswordFormHtml(token, result.error.body.message || "Error en restablir la contrasenya.");
    return res.status(result.error.status).type("html").send(html);
  }

  // Éxito - mostrar página de confirmación
  const html = renderResetSuccessHtml();
  return res.status(200).type("html").send(html);
}
