import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface MailConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from?: string;
}

export interface MailService {
  sendPasswordResetEmail(to: string, resetUrl: string): Promise<{ messageId: string; previewUrl?: string }>;
}

/**
 * Create mail service with Nodemailer
 * If no config provided, uses Ethereal (test email service)
 */
export async function createMailService(config?: MailConfig): Promise<MailService> {
  let transporter: Transporter;
  let fromAddress: string;
  let isEthereal = false;

  if (config?.host) {
    // Use provided SMTP config
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port ?? 587,
      secure: config.secure ?? false,
      auth: config.auth,
    });
    fromAddress = config.from ?? 'noreply@static-admin.local';
  } else {
    // Use Ethereal for development/testing
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    fromAddress = `Static Admin <${testAccount.user}>`;
    isEthereal = true;
    console.log('[Mail] Using Ethereal test account:', testAccount.user);
  }

  return {
    async sendPasswordResetEmail(to: string, resetUrl: string) {
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject: 'パスワードリセットのご案内',
        text: `
パスワードリセットのリクエストを受け付けました。

以下のリンクをクリックして、新しいパスワードを設定してください:
${resetUrl}

このリンクは1時間後に有効期限が切れます。

このリクエストに心当たりがない場合は、このメールを無視してください。
        `.trim(),
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: sans-serif; padding: 20px; max-width: 600px;">
  <h2>パスワードリセット</h2>
  <p>パスワードリセットのリクエストを受け付けました。</p>
  <p>以下のボタンをクリックして、新しいパスワードを設定してください:</p>
  <p style="margin: 24px 0;">
    <a href="${resetUrl}"
       style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      パスワードをリセット
    </a>
  </p>
  <p style="color: #666; font-size: 14px;">このリンクは1時間後に有効期限が切れます。</p>
  <p style="color: #666; font-size: 14px;">このリクエストに心当たりがない場合は、このメールを無視してください。</p>
</body>
</html>
        `.trim(),
      });

      const result: { messageId: string; previewUrl?: string } = {
        messageId: info.messageId,
      };

      if (isEthereal) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          result.previewUrl = previewUrl as string;
          console.log('[Mail] Preview URL:', previewUrl);
        }
      }

      return result;
    },
  };
}
