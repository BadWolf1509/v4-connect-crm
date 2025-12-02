import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.EMAIL_FROM || 'V4 Connect <noreply@v4connect.com.br>';
const WEB_URL = process.env.WEB_URL || 'http://localhost:3002';

export interface SendInviteParams {
  email: string;
  token: string;
  inviterName: string;
  tenantName: string;
  role: string;
}

export interface SendPasswordResetParams {
  email: string;
  token: string;
  userName: string;
}

export interface SendWelcomeParams {
  email: string;
  userName: string;
  tenantName: string;
}

// Email templates
const templates = {
  invite: ({
    inviteUrl,
    inviterName,
    tenantName,
    role,
  }: {
    inviteUrl: string;
    inviterName: string;
    tenantName: string;
    role: string;
  }) => ({
    subject: `${inviterName} convidou você para o V4 Connect`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite para V4 Connect</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #DC2626; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">V4 Connect</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                Você foi convidado!
              </h2>

              <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 24px;">
                <strong>${inviterName}</strong> convidou você para fazer parte do time <strong>${tenantName}</strong> no V4 Connect como <strong>${role === 'admin' ? 'Administrador' : role === 'owner' ? 'Proprietário' : 'Agente'}</strong>.
              </p>

              <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 24px;">
                O V4 Connect é uma plataforma omnichannel que unifica WhatsApp, Instagram e outros canais em uma única inbox, com CRM integrado e automações inteligentes.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" style="display: inline-block; padding: 16px 32px; background-color: #DC2626; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Aceitar Convite
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; color: #888888; font-size: 14px; line-height: 20px;">
                Este convite expira em 7 dias. Se você não esperava este email, pode ignorá-lo com segurança.
              </p>

              <p style="margin: 20px 0 0 0; color: #888888; font-size: 12px; line-height: 18px;">
                Ou copie e cole este link no seu navegador:<br>
                <a href="${inviteUrl}" style="color: #DC2626; word-break: break-all;">${inviteUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9f9f9; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #888888; font-size: 12px;">
                © ${new Date().getFullYear()} V4 Connect. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `
${inviterName} convidou você para o V4 Connect

Você foi convidado para fazer parte do time ${tenantName} no V4 Connect como ${role === 'admin' ? 'Administrador' : role === 'owner' ? 'Proprietário' : 'Agente'}.

Para aceitar o convite, acesse: ${inviteUrl}

Este convite expira em 7 dias.

--
V4 Connect - Plataforma Omnichannel
    `,
  }),

  passwordReset: ({ resetUrl, userName }: { resetUrl: string; userName: string }) => ({
    subject: 'Redefinição de senha - V4 Connect',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir Senha</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #DC2626; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">V4 Connect</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                Redefinir sua senha
              </h2>

              <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 24px;">
                Olá <strong>${userName}</strong>,
              </p>

              <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 24px;">
                Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; padding: 16px 32px; background-color: #DC2626; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Redefinir Senha
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; color: #888888; font-size: 14px; line-height: 20px;">
                Este link expira em 1 hora. Se você não solicitou a redefinição de senha, ignore este email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9f9f9; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #888888; font-size: 12px;">
                © ${new Date().getFullYear()} V4 Connect. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `
Olá ${userName},

Recebemos uma solicitação para redefinir a senha da sua conta no V4 Connect.

Para criar uma nova senha, acesse: ${resetUrl}

Este link expira em 1 hora. Se você não solicitou a redefinição de senha, ignore este email.

--
V4 Connect - Plataforma Omnichannel
    `,
  }),

  welcome: ({ userName, tenantName }: { userName: string; tenantName: string }) => ({
    subject: 'Bem-vindo ao V4 Connect!',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao V4 Connect</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #DC2626; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">V4 Connect</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                Bem-vindo, ${userName}!
              </h2>

              <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 24px;">
                Sua conta no <strong>${tenantName}</strong> foi criada com sucesso. Agora você tem acesso à plataforma V4 Connect.
              </p>

              <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 24px;">
                Com o V4 Connect você pode:
              </p>

              <ul style="margin: 0 0 30px 0; padding-left: 20px; color: #4a4a4a; font-size: 16px; line-height: 28px;">
                <li>Gerenciar conversas de WhatsApp, Instagram e mais</li>
                <li>Acompanhar seu pipeline de vendas no CRM</li>
                <li>Criar campanhas de marketing</li>
                <li>Automatizar atendimentos com chatbots</li>
              </ul>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${WEB_URL}" style="display: inline-block; padding: 16px 32px; background-color: #DC2626; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Acessar Plataforma
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9f9f9; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #888888; font-size: 12px;">
                © ${new Date().getFullYear()} V4 Connect. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `
Bem-vindo ao V4 Connect, ${userName}!

Sua conta no ${tenantName} foi criada com sucesso.

Com o V4 Connect você pode:
- Gerenciar conversas de WhatsApp, Instagram e mais
- Acompanhar seu pipeline de vendas no CRM
- Criar campanhas de marketing
- Automatizar atendimentos com chatbots

Acesse a plataforma em: ${WEB_URL}

--
V4 Connect - Plataforma Omnichannel
    `,
  }),
};

export const emailService = {
  /**
   * Send team invite email
   */
  async sendInvite(params: SendInviteParams): Promise<{ success: boolean; error?: string }> {
    const inviteUrl = `${WEB_URL}/invite/${params.token}`;
    const template = templates.invite({
      inviteUrl,
      inviterName: params.inviterName,
      tenantName: params.tenantName,
      role: params.role,
    });

    if (!resend) {
      console.log('[Email] Resend not configured, skipping email send');
      console.log('[Email] Would send invite email to:', params.email);
      console.log('[Email] Invite URL:', inviteUrl);
      return { success: true };
    }

    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: params.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (error) {
        console.error('[Email] Failed to send invite:', error);
        return { success: false, error: error.message };
      }

      console.log('[Email] Invite sent to:', params.email);
      return { success: true };
    } catch (err) {
      console.error('[Email] Error sending invite:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  },

  /**
   * Send password reset email
   */
  async sendPasswordReset(
    params: SendPasswordResetParams,
  ): Promise<{ success: boolean; error?: string }> {
    const resetUrl = `${WEB_URL}/reset-password/${params.token}`;
    const template = templates.passwordReset({
      resetUrl,
      userName: params.userName,
    });

    if (!resend) {
      console.log('[Email] Resend not configured, skipping email send');
      console.log('[Email] Would send password reset to:', params.email);
      return { success: true };
    }

    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: params.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (error) {
        console.error('[Email] Failed to send password reset:', error);
        return { success: false, error: error.message };
      }

      console.log('[Email] Password reset sent to:', params.email);
      return { success: true };
    } catch (err) {
      console.error('[Email] Error sending password reset:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  },

  /**
   * Send welcome email
   */
  async sendWelcome(params: SendWelcomeParams): Promise<{ success: boolean; error?: string }> {
    const template = templates.welcome({
      userName: params.userName,
      tenantName: params.tenantName,
    });

    if (!resend) {
      console.log('[Email] Resend not configured, skipping email send');
      console.log('[Email] Would send welcome email to:', params.email);
      return { success: true };
    }

    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: params.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (error) {
        console.error('[Email] Failed to send welcome:', error);
        return { success: false, error: error.message };
      }

      console.log('[Email] Welcome email sent to:', params.email);
      return { success: true };
    } catch (err) {
      console.error('[Email] Error sending welcome:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  },

  /**
   * Check if email service is configured
   */
  isConfigured(): boolean {
    return resend !== null;
  },
};
