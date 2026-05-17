import nodemailer from 'nodemailer';

type InquiryEmailPayload = {
  submission: {
    fullName: string;
    email: string;
    phone: string;
    company: string;
    projectDate: string;
    estimatedBudget: number;
    description: string;
    industries: string[];
    goals?: string[];
  };
  adminEmail: string;
};

type EmailResult = {
  sent: boolean;
  warnings: string[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

function formatList(items: string[]) {
  return items.length ? items.join(' • ') : 'Not provided';
}

function buildAdminEmailHtml(submission: InquiryEmailPayload['submission']) {
  return `
    <div style="font-family:Arial,sans-serif;background:#041114;color:#f5f0e8;padding:32px">
      <div style="max-width:640px;margin:0 auto;background:#07171a;border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:32px">
        <p style="text-transform:uppercase;letter-spacing:0.24em;color:#7dd3cf;font-size:12px;margin:0 0 12px">New inquiry</p>
        <h1 style="margin:0 0 24px;font-size:28px;line-height:1.1">${escapeHtml(submission.fullName)} reached out through the contact form.</h1>
        <div style="display:grid;gap:12px;font-size:15px;line-height:1.6">
          <p style="margin:0"><strong>Email:</strong> ${escapeHtml(submission.email)}</p>
          <p style="margin:0"><strong>Phone:</strong> ${escapeHtml(submission.phone)}</p>
          <p style="margin:0"><strong>Company:</strong> ${escapeHtml(submission.company)}</p>
          <p style="margin:0"><strong>Project Date:</strong> ${escapeHtml(submission.projectDate)}</p>
          <p style="margin:0"><strong>Budget:</strong> ₦${submission.estimatedBudget.toLocaleString()}</p>
          <p style="margin:0"><strong>Industries:</strong> ${escapeHtml(formatList(submission.industries))}</p>
          <p style="margin:0"><strong>Goals:</strong> ${escapeHtml(formatList(submission.goals || []))}</p>
          <p style="margin:0"><strong>Description:</strong><br />${escapeHtml(submission.description).replace(/\n/g, '<br />')}</p>
        </div>
      </div>
    </div>
  `;
}

function buildUserEmailHtml(submission: InquiryEmailPayload['submission']) {
  return `
    <div style="font-family:Arial,sans-serif;background:#041114;color:#f5f0e8;padding:32px">
      <div style="max-width:640px;margin:0 auto;background:#07171a;border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:32px">
        <p style="text-transform:uppercase;letter-spacing:0.24em;color:#7dd3cf;font-size:12px;margin:0 0 12px">We received your inquiry</p>
        <h1 style="margin:0 0 20px;font-size:28px;line-height:1.1">Thanks, ${escapeHtml(submission.fullName)}.</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#d6e4e1">Your message is in our queue and we’ll respond within 48 hours.</p>
        <div style="display:grid;gap:10px;font-size:15px;line-height:1.6">
          <p style="margin:0"><strong>Industries:</strong> ${escapeHtml(formatList(submission.industries))}</p>
          <p style="margin:0"><strong>Project Date:</strong> ${escapeHtml(submission.projectDate)}</p>
          <p style="margin:0"><strong>Budget:</strong> ₦${submission.estimatedBudget.toLocaleString()}</p>
        </div>
      </div>
    </div>
  `;
}

export async function sendInquiryEmails({ submission, adminEmail }: InquiryEmailPayload): Promise<EmailResult> {
  const transporter = buildTransporter();
  const warnings: string[] = [];

  if (!transporter) {
    warnings.push('SMTP credentials are not configured');
    return { sent: false, warnings };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!from) {
    warnings.push('SMTP_FROM is missing');
    return { sent: false, warnings };
  }

  const results = await Promise.allSettled([
    transporter.sendMail({
      from,
      to: adminEmail,
      replyTo: submission.email,
      subject: `New inquiry from ${submission.fullName}`,
      text: [
        `Name: ${submission.fullName}`,
        `Email: ${submission.email}`,
        `Phone: ${submission.phone}`,
        `Company: ${submission.company}`,
        `Project Date: ${submission.projectDate}`,
        `Budget: ₦${submission.estimatedBudget.toLocaleString()}`,
        `Industries: ${formatList(submission.industries)}`,
        `Goals: ${formatList(submission.goals || [])}`,
        '',
        submission.description,
      ].join('\n'),
      html: buildAdminEmailHtml(submission),
    }),
    transporter.sendMail({
      from,
      to: submission.email,
      subject: 'We received your inquiry',
      text: [
        `Thanks ${submission.fullName},`,
        '',
        'We received your inquiry and will respond within 48 hours.',
        '',
        `Industries: ${formatList(submission.industries)}`,
        `Project Date: ${submission.projectDate}`,
        `Budget: ₦${submission.estimatedBudget.toLocaleString()}`,
      ].join('\n'),
      html: buildUserEmailHtml(submission),
    }),
  ]);

  const failed = results.filter((result) => result.status === 'rejected');

  if (failed.length > 0) {
    warnings.push(`Failed to send ${failed.length} email notification${failed.length > 1 ? 's' : ''}`);
  }

  return {
    sent: failed.length === 0,
    warnings,
  };
}