import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly fromAddress: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {
    this.fromAddress = this.config.get<string>(
      'SMTP_FROM',
      '"Asistencia QR" <noreply@pedsar.com>',
    );

    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: Number(this.config.get<string>('SMTP_PORT', '587')),
      secure: this.config.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: {
        user: this.config.get<string>('SMTP_USER', ''),
        pass: this.config.get<string>('SMTP_PASS', ''),
      },
    });
  }

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject: 'Recuperación de contraseña — Asistencia QR',
        html: this.buildResetEmailHtml(resetUrl),
        text: `Para restablecer tu contraseña visita el siguiente enlace (válido 30 minutos):\n\n${resetUrl}\n\nSi no solicitaste esto, ignora este correo.`,
      });
    } catch (error) {
      this.logger.error(`Error enviando email de reset a ${email}`, error);
      throw error;
    }
  }

  private buildResetEmailHtml(resetUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recuperar contraseña</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
          <tr>
            <td style="background:#111827;padding:24px 32px;">
              <p style="margin:0;color:#fff;font-size:18px;font-weight:600;">Asistencia QR</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 12px;font-size:20px;color:#111827;">Recupera tu contraseña</h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta.<br/>
                Haz clic en el botón para continuar. El enlace es válido por <strong>30 minutos</strong>.
              </p>
              <a href="${resetUrl}"
                 style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;">
                Restablecer contraseña
              </a>
              <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;line-height:1.5;">
                Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.<br/>
                O copia este enlace en tu navegador:<br/>
                <span style="color:#374151;word-break:break-all;">${resetUrl}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;color:#d1d5db;font-size:11px;">Sistema de Control de Asistencia QR</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
