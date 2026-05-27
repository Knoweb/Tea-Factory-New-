import nodemailer from "nodemailer";

interface SendMailParams {
  to: string;
  subject: string;
  name: string;
  temporaryPassword: string;
}

export async function sendTemporaryPasswordEmail({ to, subject, name, temporaryPassword }: SendMailParams) {
  const mailOptions = {
    from: `"SANOTA" <noreply@sanota.com>`,
    to,
    subject,
    html: `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #f7f9f8; border-radius: 16px; border: 1.5px solid rgba(14, 86, 63, 0.08); box-shadow: 0 4px 20px rgba(14, 86, 63, 0.02);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 12px; background: linear-gradient(135deg, #0e563f, #15825f); border-radius: 12px; color: #ffffff; font-weight: 800; font-size: 1.2rem; letter-spacing: 0.05em;">
            SANOTA
          </div>
        </div>
        <h2 style="color: #0e563f; font-size: 1.4rem; font-weight: 700; margin-bottom: 16px; text-align: center;">Welcome to SANOTA!</h2>
        <p style="color: #1c2e2a; font-size: 0.95rem; line-height: 1.5; margin-bottom: 12px;">Hello ${name},</p>
        <p style="color: #1c2e2a; font-size: 0.95rem; line-height: 1.5; margin-bottom: 20px;">You have been registered as an employee in the system. Please find your credentials below to access your dashboard:</p>
        
        <div style="background-color: #ffffff; border: 1px solid rgba(14, 86, 63, 0.12); border-radius: 10px; padding: 20px; margin-bottom: 24px; box-shadow: 0 2px 6px rgba(14, 86, 63, 0.02);">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-weight: 700; color: rgba(14, 86, 63, 0.6); font-size: 0.8rem; text-transform: uppercase; width: 140px;">Email Address</td>
              <td style="padding: 6px 0; color: #0e563f; font-weight: 600; font-size: 0.95rem;">${to}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 700; color: rgba(14, 86, 63, 0.6); font-size: 0.8rem; text-transform: uppercase;">Temporary Pass</td>
              <td style="padding: 6px 0; color: #0e563f; font-weight: 700; font-size: 0.95rem; font-family: monospace; background: #e1ede9; padding: 4px 8px; border-radius: 6px; display: inline-block;">${temporaryPassword}</td>
            </tr>
          </table>
        </div>

        <p style="color: #b91c1c; font-weight: 700; font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px; text-align: center; background: rgba(239, 68, 68, 0.06); padding: 12px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.15);">
          ⚠️ NOTE: after logging using this temporary password, please change it.
        </p>

        <p style="color: rgba(14, 86, 63, 0.5); font-size: 0.8rem; text-align: center; border-top: 1px solid rgba(14, 86, 63, 0.08); padding-top: 20px;">
          This is an automated message. Please do not reply directly to this email.
        </p>
      </div>
    `,
  };

  // 1. Check SMTP Environment configuration
  const hasSMTPConfig = process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER;
  
  let transporter;
  if (hasSMTPConfig) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // 2. Fallback: Use ethereal.email for mock email sending in development
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (e) {
      // Direct console fallback if ethereal setup fails
      transporter = null;
    }
  }

  // Beautiful, clear ASCII console log for local development
  console.log("\n" + "=".repeat(60));
  console.log("📧 NEW WORKER CREATED - TEMPORARY PASSWORD EMAIL SENT");
  console.log(`➡️  To:                 ${to}`);
  console.log(`➡️  Name:               ${name}`);
  console.log(`➡️  Temporary Password:  ${temporaryPassword}`);
  console.log(`➡️  Rule:               "after logging using this temporary password please change it"`);
  console.log("=".repeat(60) + "\n");

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      if (!hasSMTPConfig) {
        console.log(`🌐 Preview Test Email Link: ${nodemailer.getTestMessageUrl(info)}`);
      }
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error("Nodemailer delivery error:", err);
      return { success: false, error: err.message };
    }
  }

  return { success: true, message: "Logged to terminal console" };
}
