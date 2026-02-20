import nodemailer from "nodemailer";
import { renderTemplate } from "./html-templates.js";
import { logger } from "./logger";

const smtpHost = process.env.SMTP_HOST ?? "";
const smtpPort = parseInt(process.env.SMTP_PORT ?? "587", 10);
const smtpUser = process.env.SMTP_USER ?? "";
const smtpPass = process.env.SMTP_PASS ?? "";
const smtpFrom = process.env.SMTP_FROM ?? "noreply@reservationsystem.com";
const smtpSecure = process.env.SMTP_SECURE === "true";
const smtpRejectUnauthorized = process.env.SMTP_REJECT_UNAUTHORIZED !== "false";
const appUrl = process.env.APP_URL ?? "http://localhost:3000";

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass
  },
  tls: {
    rejectUnauthorized: smtpRejectUnauthorized
  }
});

export function generatePasswordResetEmail(resetUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablir contrasenya</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Restablir la teva contrasenya</h2>
    <p>Hem rebut una sol·licitud per restablir la contrasenya del teu compte.</p>
    <p>Fes clic a l'enllaç següent per crear una nova contrasenya:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" 
         style="display: inline-block; background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        Restablir contrasenya
      </a>
    </div>
    <p style="font-size: 14px; color: #7f8c8d;">
      Si no has sol·licitat aquest canvi, pots ignorar aquest email. L'enllaç expirarà en 1 hora per seguretat.
    </p>
    <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
    <p style="font-size: 12px; color: #95a5a6; text-align: center;">
      Reservation System - Si tens problemes amb l'enllaç, copia i enganxa aquesta URL al teu navegador:<br>
      <span style="word-break: break-all;">${resetUrl}</span>
    </p>
  </div>
</body>
</html>
  `.trim();
}

export interface EmailResult {
  ok: boolean;
  error?: string;
}

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string
): Promise<EmailResult> {
  if (!smtpHost || !smtpUser || !smtpPass) {
    return {
      ok: false,
      error: "Email service not configured"
    };
  }

  // URL del backend donde el usuario introduce la nueva contraseña (formulario HTML)
  const resetUrl = `${appUrl}/auth/reset-password-form?token=${resetToken}`;
  const htmlContent = generatePasswordResetEmail(resetUrl);

  try {
    await transporter.sendMail({
      from: `"Reservation System" <${smtpFrom}>`,
      to,
      subject: "Restablir la teva contrasenya",
      html: htmlContent,
      text: `Restablir contrasenya: ${resetUrl}\n\nSi no has sol·licitat aquest canvi, ignora aquest email. L'enllaç expira en 1 hora.`
    });

    return { ok: true };
  } catch (error) {
    logger.error("Failed to send password reset email", { error });
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export function generateVerificationEmail(verificationUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificar el teu compte</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Benvingut a Reservation System!</h2>
    <p>Gràcies per registrar-te. Per completar el teu registre i activar el teu compte, necessitem verificar la teva adreça d'email.</p>
    <p>Fes clic a l'enllaç següent per verificar el teu compte:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" 
         style="display: inline-block; background-color: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        Verificar el meu compte
      </a>
    </div>
    <p style="font-size: 14px; color: #7f8c8d;">
      Si no has creat un compte a Reservation System, pots ignorar aquest email. L'enllaç expirarà en 24 hores per seguretat.
    </p>
    <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
    <p style="font-size: 12px; color: #95a5a6; text-align: center;">
      Reservation System - Si tens problemes amb l'enllaç, copia i enganxa aquesta URL al teu navegador:<br>
      <span style="word-break: break-all;">${verificationUrl}</span>
    </p>
  </div>
</body>
</html>
  `.trim();
}

export async function sendVerificationEmail(
  to: string,
  verificationToken: string
): Promise<EmailResult> {
  if (!smtpHost || !smtpUser || !smtpPass) {
    return {
      ok: false,
      error: "Email service not configured"
    };
  }

  const verificationUrl = `${appUrl}/auth/verify-email?token=${verificationToken}`;
  const htmlContent = generateVerificationEmail(verificationUrl);

  try {
    await transporter.sendMail({
      from: `"Reservation System" <${smtpFrom}>`,
      to,
      subject: "Verifica el teu compte",
      html: htmlContent,
      text: `Verifica el teu compte: ${verificationUrl}\n\nSi no has creat un compte a Reservation System, ignora aquest email. L'enllaç expira en 24 hores.`
    });

    return { ok: true };
  } catch (error) {
    logger.error("Failed to send verification email", { error });
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export async function sendReservationCreatedEmail(
  to: string,
  date: string,
  timeRangeLabel: string,
  observations?: string
): Promise<EmailResult> {
  if (!smtpHost || !smtpUser || !smtpPass) {
    return {
      ok: false,
      error: "Email service not configured"
    };
  }

  const htmlContent = renderTemplate("reservation-created", {
    date: escapeHtml(date),
    timeRange: escapeHtml(timeRangeLabel),
    observations: observations ? escapeHtml(observations) : "",
    observationsDisplay: observations ? "block" : "none"
  });

  try {
    await transporter.sendMail({
      from: `"Reservation System" <${smtpFrom}>`,
      to,
      subject: "Reserva confirmada",
      html: htmlContent,
      text: `La teva reserva ha estat confirmada per al ${date} a les ${timeRangeLabel}.`
    });

    return { ok: true };
  } catch (error) {
    logger.error("Failed to send reservation created email", { error, to, date, timeRangeLabel });
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export async function sendReservationCancelledEmail(
  to: string,
  date: string,
  timeRangeLabel: string,
  reason: "CAPACITY_REDUCTION" | "MANUAL_CANCELLATION" | "OTHER" = "OTHER"
): Promise<EmailResult> {
  if (!smtpHost || !smtpUser || !smtpPass) {
    return {
      ok: false,
      error: "Email service not configured"
    };
  }

  let reasonText = "";
  if (reason === "CAPACITY_REDUCTION") {
    reasonText = "La teva reserva ha estat cancel·lada per reducció de capacitat.";
  } else if (reason === "MANUAL_CANCELLATION") {
    reasonText = "La teva reserva ha estat cancel·lada pel Back Office.";
  } else {
    reasonText = "La teva reserva ha estat cancel·lada.";
  }

  const htmlContent = renderTemplate("reservation-cancelled", {
    date: escapeHtml(date),
    timeRange: escapeHtml(timeRangeLabel),
    reason: escapeHtml(reasonText)
  });

  try {
    await transporter.sendMail({
      from: `"Reservation System" <${smtpFrom}>`,
      to,
      subject: "Reserva cancel·lada",
      html: htmlContent,
      text: `La teva reserva per al ${date} a les ${timeRangeLabel} ha estat cancel·lada.`
    });

    return { ok: true };
  } catch (error) {
    logger.error("Failed to send reservation cancelled email", {
      error,
      to,
      date,
      timeRangeLabel,
      reason
    });
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
