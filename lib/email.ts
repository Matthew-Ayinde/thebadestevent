import { Resend } from 'resend';

type InquiryEmailPayload = {
  submission: {
    fullName: string;
    email: string;
    phone: string;
    company: string;
    location: string;
    projectDate: string;
    estimatedBudget: number;
    currency: string;
    description: string;
    industries: string[];
    goals?: string[];
    feelings?: string[];
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

function buildResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function formatList(items: string[]) {
  return items.length ? items.join(' • ') : 'Not provided';
}

function getCurrencySymbol(code: string): string {
  const map: Record<string, string> = { NGN: '₦', USD: '$', CAD: 'CA$', GBP: '£', EUR: '€' };
  return map[code] ?? code;
}

function formatBudget(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  return symbol + amount.toLocaleString();
}

function buildAdminEmailHtml(submission: InquiryEmailPayload['submission']) {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:12px 16px;width:38%;vertical-align:top;font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:#8fa8a5;border-bottom:1px solid rgba(255,255,255,0.05);">${label}</td>
      <td style="padding:12px 16px;vertical-align:top;font-size:14px;color:#e8f0ef;line-height:1.6;border-bottom:1px solid rgba(255,255,255,0.05);">${value}</td>
    </tr>`;

  const statCell = (label: string, value: string) => `
    <td style="padding:18px 20px;text-align:center;border-right:1px solid rgba(255,255,255,0.07);">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.22em;color:#7dd3cf;margin-bottom:6px;">${label}</div>
      <div style="font-size:15px;font-weight:600;color:#f5f0e8;">${value}</div>
    </td>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New Inquiry</title></head>
<body style="margin:0;padding:0;background:#041114;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#041114;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;">

        <!-- Header -->
        <tr><td style="padding-bottom:28px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <img src="https://res.cloudinary.com/matthew-ayinde/image/upload/v1780311622/rinwa-logo_cekwvh.png" alt="RÌNWÁ" width="44" height="44" style="display:block;margin-bottom:7px;" />

              </td>
              <td align="right">
                <span style="display:inline-block;background:#7dd3cf;color:#041114;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.24em;padding:5px 12px;border-radius:100px;">New Inquiry</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#07171a;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">

          <!-- Intro -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:32px 32px 24px;">
              <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.28em;color:#7dd3cf;">Inquiry received</p>
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.15;color:#f5f0e8;font-weight:normal;">
                ${escapeHtml(submission.fullName)}<br>
                <span style="color:#8fa8a5;font-size:18px;">from ${escapeHtml(submission.company)}</span>
              </h1>
            </td></tr>

            <!-- Stats strip -->
            <tr><td style="padding:0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#041114;border:1px solid rgba(255,255,255,0.07);border-radius:12px;">
                <tr>
                  ${statCell('Budget', escapeHtml(formatBudget(submission.estimatedBudget, submission.currency)))}
                  ${statCell('Timeline', escapeHtml(submission.projectDate))}
                  <td style="padding:18px 20px;text-align:center;">
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.22em;color:#7dd3cf;margin-bottom:6px;">Industries</div>
                    <div style="font-size:13px;font-weight:600;color:#f5f0e8;">${escapeHtml(submission.industries.join(' · '))}</div>
                  </td>
                </tr>
              </table>
            </td></tr>

            <!-- Divider -->
            <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0;"></td></tr>

            <!-- Field table -->
            <tr><td style="padding:8px 16px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${row('Full Name', escapeHtml(submission.fullName))}
                ${row('Email', '<a href="mailto:' + escapeHtml(submission.email) + '" style="color:#7dd3cf;text-decoration:none;">' + escapeHtml(submission.email) + '</a>')}
                ${row('Phone', escapeHtml(submission.phone))}
                ${row('Company', escapeHtml(submission.company))}
                ${row('Location', escapeHtml(submission.location))}
                ${row('Goals', escapeHtml(formatList(submission.goals || [])))}
                ${row('Feelings', escapeHtml(formatList(submission.feelings || [])))}
                ${row('Description', escapeHtml(submission.description).replace(/\n/g, '<br>'))}
              </table>
            </td></tr>

            <!-- CTA -->
            <tr><td style="padding:28px 32px 32px;text-align:center;">
              <a href="mailto:${escapeHtml(submission.email)}?subject=Re: Your inquiry — RÌNWÁ"
                 style="display:inline-block;background:#7dd3cf;color:#041114;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;text-decoration:none;padding:14px 32px;border-radius:100px;">
                Reply to ${escapeHtml(submission.fullName.split(' ')[0])}
              </a>
            </td></tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#3d5a58;letter-spacing:0.1em;">
            RÌNWÁ Hospitality &nbsp;·&nbsp; Internal notification &nbsp;·&nbsp; Do not forward
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildUserEmailHtml(submission: InquiryEmailPayload['submission']) {
  const summaryRow = (label: string, value: string) => `
    <tr>
      <td style="padding:11px 16px;width:40%;font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:#8fa8a5;border-bottom:1px solid rgba(255,255,255,0.05);vertical-align:top;">${label}</td>
      <td style="padding:11px 16px;font-size:14px;color:#e8f0ef;border-bottom:1px solid rgba(255,255,255,0.05);vertical-align:top;">${value}</td>
    </tr>`;

  const step = (num: string, title: string, body: string) => `
    <tr><td style="padding:0 0 20px;">
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="width:32px;vertical-align:top;padding-top:2px;">
            <div style="width:26px;height:26px;border-radius:50%;background:#0d2a2e;border:1px solid #7dd3cf;text-align:center;line-height:24px;font-size:11px;font-weight:700;color:#7dd3cf;">${num}</div>
          </td>
          <td style="padding-left:14px;vertical-align:top;">
            <p style="margin:0 0 3px;font-size:13px;font-weight:700;color:#f5f0e8;">${title}</p>
            <p style="margin:0;font-size:13px;color:#8fa8a5;line-height:1.6;">${body}</p>
          </td>
        </tr>
      </table>
    </td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>We received your inquiry</title></head>
<body style="margin:0;padding:0;background:#041114;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#041114;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

        <!-- Header -->
        <tr><td style="text-align:center;padding-bottom:32px;">
          <img src="https://res.cloudinary.com/matthew-ayinde/image/upload/v1780311622/rinwa-logo_cekwvh.png" alt="RÌNWÁ" width="54" height="54" style="display:block;margin:0 auto 10px;" />
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:0.14em;color:#f5f0e8;">RÌNWÁ</div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.36em;color:#8fa8a5;margin-top:4px;">Hospitality</div>
        </td></tr>

        <!-- Main card -->
        <tr><td style="background:#07171a;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
          <table width="100%" cellpadding="0" cellspacing="0">

            <!-- Top accent bar -->
            <tr><td style="height:3px;background:linear-gradient(90deg,#7dd3cf,#4db6b0 50%,transparent);"></td></tr>

            <!-- Greeting -->
            <tr><td style="padding:36px 32px 28px;">
              <p style="margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:0.30em;color:#7dd3cf;">Inquiry confirmed</p>
              <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.15;color:#f5f0e8;font-weight:normal;">
                Your vision has been<br>received, ${escapeHtml(submission.fullName.split(' ')[0])}.
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.75;color:#a0bcba;">
                We've captured the shape of your project and will be in touch within&nbsp;48&nbsp;hours.
                In the meantime, here's a summary of what you shared with us.
              </p>
            </td></tr>

            <!-- Divider -->
            <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0;"></td></tr>

            <!-- Summary table -->
            <tr><td style="padding:8px 16px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${summaryRow('Company', escapeHtml(submission.company))}
                ${summaryRow('Location', escapeHtml(submission.location))}
                ${summaryRow('Industries', escapeHtml(formatList(submission.industries)))}
                ${summaryRow('Goals', escapeHtml(formatList(submission.goals || [])))}
                ${summaryRow('Feelings', escapeHtml(formatList(submission.feelings || [])))}
                ${summaryRow('Timeline', escapeHtml(submission.projectDate))}
                ${summaryRow('Budget', escapeHtml(formatBudget(submission.estimatedBudget, submission.currency)))}
              </table>
            </td></tr>

            <!-- Divider -->
            <tr><td style="padding:0 32px 4px;"><hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0;"></td></tr>

            <!-- What's next -->
            <tr><td style="padding:28px 32px;">
              <p style="margin:0 0 20px;font-size:11px;text-transform:uppercase;letter-spacing:0.26em;color:#7dd3cf;">What happens next</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${step('1', 'Your inquiry is reviewed', 'Our creative team reads every submission carefully — no templates, no shortcuts.')}
                ${step('2', 'We reach out within 48 hours', 'Expect a personal response from us at ' + escapeHtml(submission.email) + '.')}
                ${step('3', 'We shape the experience together', 'A brief discovery call to align on vision, scale, and ambition.')}
              </table>
            </td></tr>

            <!-- Divider -->
            <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0;"></td></tr>

            <!-- Sign-off -->
            <tr><td style="padding:28px 32px 36px;text-align:center;">
              <p style="margin:0 0 6px;font-size:14px;color:#8fa8a5;">Until then,</p>
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#f5f0e8;letter-spacing:0.08em;">The RÌNWÁ Team</p>
              <p style="margin:10px 0 0;font-size:12px;color:#3d5a58;font-style:italic;">Come here, you've arrived home.</p>
            </td></tr>

          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0 0 6px;font-size:11px;color:#3d5a58;">You received this because you submitted an inquiry on the RÌNWÁ website.</p>
          <p style="margin:0;font-size:11px;color:#2a3f3e;">RÌNWÁ Hospitality &nbsp;·&nbsp; Lagos, Nigeria</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendInquiryEmails({ submission, adminEmail }: InquiryEmailPayload): Promise<EmailResult> {
  const resend = buildResendClient();
  const warnings: string[] = [];

  if (!resend) {
    warnings.push('RESEND_API_KEY is not configured');
    return { sent: false, warnings };
  }

  const from = process.env.RESEND_FROM;
  if (!from) {
    warnings.push('RESEND_FROM is not configured');
    return { sent: false, warnings };
  }

  const sendAdminEmail = async () => {
    const { error } = await resend.emails.send({
      from,
      to: adminEmail,
      replyTo: submission.email,
      subject: `[New Inquiry] ${submission.fullName} — ${submission.company}`,
      text: [
        `Name: ${submission.fullName}`,
        `Email: ${submission.email}`,
        `Phone: ${submission.phone}`,
        `Company: ${submission.company}`,
        `Location: ${submission.location}`,
        `Project Date: ${submission.projectDate}`,
        `Budget: ${formatBudget(submission.estimatedBudget, submission.currency)}`,
        `Industries: ${formatList(submission.industries)}`,
        `Goals: ${formatList(submission.goals || [])}`,
        `Feelings: ${formatList(submission.feelings || [])}`,
        '',
        submission.description,
      ].join('\n'),
      html: buildAdminEmailHtml(submission),
    });
    if (error) {
      console.error('Failed to send admin inquiry email:', error);
      warnings.push('Failed to send admin notification email');
      return false;
    }
    return true;
  };

  const sendUserEmail = async () => {
    const { error } = await resend.emails.send({
      from,
      to: submission.email,
      subject: 'Your vision has been received — RINWA',
      text: [
        `Thanks ${submission.fullName},`,
        '',
        'We received your inquiry and will respond within 48 hours.',
        '',
        `Location: ${submission.location}`,
        `Industries: ${formatList(submission.industries)}`,
        `Feelings: ${formatList(submission.feelings || [])}`,
        `Project Date: ${submission.projectDate}`,
        `Budget: ${formatBudget(submission.estimatedBudget, submission.currency)}`,
      ].join('\n'),
      html: buildUserEmailHtml(submission),
    });
    if (error) {
      console.error('Failed to send user inquiry email:', error);
      warnings.push('Failed to send confirmation email to the submitter');
      return false;
    }
    return true;
  };

  const adminSent = await sendAdminEmail();
  const userSent = await sendUserEmail();

  return {
    sent: adminSent && userSent,
    warnings,
  };
}

// ─── Questionnaire Emails ──────────────────────────────────────────────────────

type QuestionnairePayload = {
  submission: Record<string, any>;
  adminEmail: string;
};

function qs(v: any): string {
  if (!v || (Array.isArray(v) && v.length === 0)) return '—';
  if (Array.isArray(v)) return v.join(' · ');
  return String(v);
}

function qRow(label: string, value: any) {
  const val = qs(value);
  if (val === '—') return '';
  return `
    <tr>
      <td style="padding:10px 16px;width:38%;vertical-align:top;font-size:11px;text-transform:uppercase;letter-spacing:0.16em;color:#8fa8a5;border-bottom:1px solid rgba(255,255,255,0.05);">${label}</td>
      <td style="padding:10px 16px;vertical-align:top;font-size:13px;color:#e8f0ef;line-height:1.6;border-bottom:1px solid rgba(255,255,255,0.05);">${escapeHtml(val).replace(/\n/g, '<br>')}</td>
    </tr>`;
}

function qSection(title: string, rows: string) {
  const filtered = rows.trim();
  if (!filtered) return '';
  return `
    <tr><td colspan="2" style="padding:20px 16px 6px;">
      <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:0.28em;color:#7dd3cf;">${title}</p>
    </td></tr>
    ${filtered}`;
}

function buildAdminQuestionnaireEmailHtml(s: Record<string, any>) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New Questionnaire</title></head>
<body style="margin:0;padding:0;background:#041114;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#041114;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">
        <tr><td style="padding-bottom:24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <img src="https://res.cloudinary.com/matthew-ayinde/image/upload/v1780311622/rinwa-logo_cekwvh.png" alt="RÌNWÁ" width="44" height="44" style="display:block;margin-bottom:7px;" />
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:0.12em;color:#f5f0e8;">RÌNWÁ</div>
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.32em;color:#8fa8a5;margin-top:3px;">Event Logistics Discovery</div>
              </td>
              <td align="right">
                <span style="display:inline-block;background:#7dd3cf;color:#041114;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;padding:5px 12px;border-radius:100px;">New Questionnaire</span>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="background:#07171a;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:28px 32px 20px;">
              <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.28em;color:#7dd3cf;">Questionnaire received</p>
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;color:#f5f0e8;font-weight:normal;">
                ${escapeHtml(s.fullName)}<br>
                <span style="color:#8fa8a5;font-size:17px;">from ${escapeHtml(s.company)}</span>
              </h1>
              ${s.eventName ? `<p style="margin:12px 0 2px;font-size:14px;color:#7dd3cf;font-style:italic;">${escapeHtml(s.eventName)}</p>` : ''}
              ${s.eventPurpose ? `<p style="margin:0 0 0;font-size:12px;color:#8fa8a5;">${escapeHtml(s.eventPurpose)}</p>` : ''}
              ${(s.hostCity || s.venueLocation) ? `<p style="margin:6px 0 0;font-size:11px;letter-spacing:0.08em;color:#7dd3cf/80;">${[s.hostCity, s.venueLocation].filter(Boolean).map(escapeHtml).join(' · ')}</p>` : ''}
              ${(s.eventHashtags && s.eventHashtags.length > 0) ? `<div style="margin-top:8px;">${(s.eventHashtags as string[]).map(tag => `<span style="display:inline-block;margin:2px 4px 2px 0;padding:2px 9px;border-radius:100px;border:1px solid rgba(125,211,207,0.3);background:rgba(125,211,207,0.08);font-size:11px;color:#7dd3cf;">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
            </td></tr>
            <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0;"></td></tr>
            <tr><td style="padding:4px 16px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${qSection('Contact Details', [
                  qRow('Full Name', s.fullName),
                  qRow('Email', s.email),
                  qRow('Phone', s.phone),
                  qRow('Organization', s.company),
                ].join(''))}
                ${qSection('Event Overview', [
                  qRow('Event Name', s.eventName),
                  qRow('Event Purpose', s.eventPurpose),
                  qRow('Objectives & Success Metrics', s.objectives),
                  qRow('Event Date(s)', s.eventDate),
                  qRow('Host City', s.hostCity),
                  qRow('Venue Location', s.venueLocation),
                  qRow('Official Hashtags', s.eventHashtags),
                  qRow('Format', s.eventFormat),
                  qRow('Attendee Count', s.attendeeCount),
                  qRow('Target Audience', s.targetAudience),
                ].join(''))}
                ${qSection('Scope of Support', [
                  qRow('Responsibilities', s.responsibilities),
                  qRow('Managing Scope', s.managingScope),
                  qRow('Existing Vendors', s.existingVendors),
                  qRow('Vendor Details', s.existingVendorDetails),
                  qRow('Internal Team', s.internalTeam),
                  qRow('Team Details', s.internalTeamDetails),
                ].join(''))}
                ${qSection('Venue & Production', [
                  qRow('Venue Secured', s.venueSecured),
                  qRow('Venue Preferences', s.venuePreferences),
                  qRow('Required Spaces', s.requiredSpaces),
                  qRow('Production Needs', s.productionNeeds),
                  qRow('Special Production', s.specialProduction),
                ].join(''))}
                ${qSection('Guest Experience & Speakers', [
                  qRow('Registration Method', s.registrationMethod),
                  qRow('Ticketing Support', s.ticketingSupport),
                  qRow('VIPs / Special Guests', s.vipGuests),
                  qRow('VIP Details', s.vipDetails),
                  qRow('Accessibility Required', s.accessibilityRequired),
                  qRow('Accessibility Details', s.accessibilityDetails),
                  qRow('Guest Touchpoints', s.guestTouchpoints),
                  qRow('Speaker Count', s.speakerCount),
                  qRow('Travel Coordination', s.travelCoordination),
                  qRow('Speaker Management', s.speakerManagement),
                ].join(''))}
                ${qSection('Operations', [
                  qRow('Staffing Required', s.staffingRequired),
                  qRow('Volunteers', s.volunteersNeeded),
                  qRow('Staffing Recruitment', s.staffingRecruitment),
                  qRow('Catering Provided', s.cateringProvided),
                  qRow('Service Style', s.serviceStyle),
                  qRow('Dietary Requirements', s.dietaryRequirements),
                  qRow('Attendee Communications', s.attendeeCommunications),
                  qRow('Marketing Management', s.marketingManagement),
                  qRow('Event Materials', s.eventMaterials),
                ].join(''))}
                ${qSection('Logistics & Risk', [
                  qRow('Transportation', s.transportationRequired),
                  qRow('Hotel Blocks', s.hotelBlocks),
                  qRow('Airport Transfers', s.airportTransfers),
                  qRow('Sponsors Involved', s.sponsorsInvolved),
                  qRow('Sponsor Deliverables', s.sponsorDeliverables),
                  qRow('Exhibitor Activations', s.exhibitorActivations),
                  qRow('Event Insurance', s.eventInsurance),
                  qRow('Permits Required', s.permitsRequired),
                  qRow('Security Required', s.securityRequired),
                  qRow('Contingency Plans', s.contingencyPlans),
                ].join(''))}
                ${qSection('Budget & Timeline', [
                  qRow('Budget Range', s.budgetRange),
                  qRow('Budget Constraints', s.budgetConstraints),
                  qRow('Decision Makers', s.decisionMakers),
                  qRow('Procurement Process', s.procurementProcess),
                  qRow('Planning Start', s.planningStart),
                  qRow('Major Milestones', s.majorMilestones),
                  qRow('Post-Event Reporting', s.postEventReporting),
                  qRow('Success Definition', s.successDefinition),
                ].join(''))}
              </table>
            </td></tr>
            <tr><td style="padding:24px 32px 28px;text-align:center;">
              <a href="mailto:${escapeHtml(s.email)}?subject=Re: Your RÌNWÁ Event Questionnaire"
                 style="display:inline-block;background:#7dd3cf;color:#041114;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;text-decoration:none;padding:13px 28px;border-radius:100px;">
                Reply to ${escapeHtml((s.fullName || '').split(' ')[0] || 'Client')}
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 0 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#3d5a58;letter-spacing:0.1em;">RÌNWÁ Hospitality · Internal notification · Do not forward</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildUserQuestionnaireEmailHtml(s: Record<string, any>) {
  const firstName = escapeHtml((s.fullName || '').split(' ')[0] || 'there');
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>You've Rinwa'd</title></head>
<body style="margin:0;padding:0;background:#041114;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#041114;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr><td style="text-align:center;padding-bottom:28px;">
          <img src="https://res.cloudinary.com/matthew-ayinde/image/upload/v1780311622/rinwa-logo_cekwvh.png" alt="RÌNWÁ" width="54" height="54" style="display:block;margin:0 auto 10px;" />
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:0.14em;color:#f5f0e8;">RÌNWÁ</div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.38em;color:#8fa8a5;margin-top:4px;">The Global Standard for African Hospitality</div>
        </td></tr>
        <tr><td style="background:#07171a;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="height:2px;background:#7dd3cf;"></td></tr>
            <tr><td style="padding:36px 32px 28px;">
              <p style="margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:0.30em;color:#7dd3cf;">Questionnaire received</p>
              <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.1;color:#f5f0e8;font-weight:normal;">
                Welcome home, ${firstName}.<br>
                <span style="color:#8fa8a5;font-size:20px;">You've Rinwa'd.</span>
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.78;color:#a0bcba;">
                Thank you for taking the time to share your vision with us. We've received your responses and our team will review everything carefully. Expect to hear from us within <strong style="color:#f5f0e8;">48 hours</strong> with tailored recommendations.
              </p>
            </td></tr>
            <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0;"></td></tr>
            ${(s.eventName || s.eventPurpose || s.hostCity || s.venueLocation || (s.eventHashtags && s.eventHashtags.length > 0)) ? `
            <tr><td style="padding:22px 32px;">
              <p style="margin:0 0 8px;font-size:10px;text-transform:uppercase;letter-spacing:0.28em;color:#7dd3cf;">Your event</p>
              ${s.eventName ? `<p style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#f5f0e8;">${escapeHtml(s.eventName)}</p>` : ''}
              ${s.eventPurpose ? `<p style="margin:0 0 8px;font-size:13px;color:#8fa8a5;line-height:1.5;">${escapeHtml(s.eventPurpose)}</p>` : ''}
              ${(s.hostCity || s.venueLocation) ? `<p style="margin:0 0 8px;font-size:12px;color:#7dd3cf;letter-spacing:0.04em;">${[s.hostCity, s.venueLocation].filter(Boolean).map(escapeHtml).join(' · ')}</p>` : ''}
              ${s.eventDate ? `<p style="margin:0 0 10px;font-size:13px;color:#8fa8a5;">${escapeHtml(s.eventDate)}</p>` : ''}
              ${(s.eventHashtags && s.eventHashtags.length > 0) ? `<div style="margin-top:6px;">${(s.eventHashtags as string[]).map(tag => `<span style="display:inline-block;margin:2px 4px 2px 0;padding:3px 11px;border-radius:100px;border:1px solid rgba(125,211,207,0.35);background:rgba(125,211,207,0.1);font-size:12px;color:#7dd3cf;font-weight:500;">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
            </td></tr>
            <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0;"></td></tr>
            ` : ''}
            <tr><td style="padding:24px 32px;">
              <p style="margin:0 0 18px;font-size:10px;text-transform:uppercase;letter-spacing:0.26em;color:#7dd3cf;">What happens next</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:0 0 16px;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:28px;vertical-align:top;padding-top:2px;">
                      <div style="width:24px;height:24px;border-radius:50%;background:#0d2a2e;border:1px solid #7dd3cf;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#7dd3cf;">1</div>
                    </td>
                    <td style="padding-left:12px;vertical-align:top;">
                      <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#f5f0e8;">Your questionnaire is reviewed</p>
                      <p style="margin:0;font-size:13px;color:#8fa8a5;line-height:1.6;">Our team reads every response — no shortcuts.</p>
                    </td>
                  </tr></table>
                </td></tr>
                <tr><td style="padding:0 0 16px;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:28px;vertical-align:top;padding-top:2px;">
                      <div style="width:24px;height:24px;border-radius:50%;background:#0d2a2e;border:1px solid #7dd3cf;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#7dd3cf;">2</div>
                    </td>
                    <td style="padding-left:12px;vertical-align:top;">
                      <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#f5f0e8;">We reach out within 48 hours</p>
                      <p style="margin:0;font-size:13px;color:#8fa8a5;line-height:1.6;">A personal response at ${escapeHtml(s.email)}.</p>
                    </td>
                  </tr></table>
                </td></tr>
                <tr><td>
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:28px;vertical-align:top;padding-top:2px;">
                      <div style="width:24px;height:24px;border-radius:50%;background:#0d2a2e;border:1px solid #7dd3cf;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#7dd3cf;">3</div>
                    </td>
                    <td style="padding-left:12px;vertical-align:top;">
                      <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#f5f0e8;">We bring your vision to life</p>
                      <p style="margin:0;font-size:13px;color:#8fa8a5;line-height:1.6;">A tailored proposal aligned to your vision and budget.</p>
                    </td>
                  </tr></table>
                </td></tr>
              </table>
            </td></tr>
            <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0;"></td></tr>
            <tr><td style="padding:28px 32px 36px;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;color:#8fa8a5;">Until then,</p>
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#f5f0e8;letter-spacing:0.06em;">The RÌNWÁ Team</p>
              <p style="margin:12px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:0.32em;color:#3d5a58;">Enter Into Your Ease</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 0 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#3d5a58;">You received this because you completed the RÌNWÁ event questionnaire.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendQuestionnaireEmails({
  submission,
  adminEmail,
}: QuestionnairePayload): Promise<EmailResult> {
  const resend = buildResendClient();
  const warnings: string[] = [];

  if (!resend) {
    warnings.push('RESEND_API_KEY is not configured');
    return { sent: false, warnings };
  }

  const from = process.env.RESEND_FROM;
  if (!from) {
    warnings.push('RESEND_FROM is not configured');
    return { sent: false, warnings };
  }

  const eventLabel = submission.eventName ? ` — ${submission.eventName}` : '';

  const sendAdmin = async () => {
    const { error } = await resend.emails.send({
      from,
      to: adminEmail,
      replyTo: submission.email,
      subject: `[New Inquiry] ${submission.fullName} · ${submission.company}${eventLabel}`,
      text: `New inquiry from ${submission.fullName} (${submission.email}) at ${submission.company}.`,
      html: buildAdminQuestionnaireEmailHtml(submission),
    });
    if (error) {
      console.error('Admin questionnaire email failed:', error);
      warnings.push('Failed to send admin notification');
      return false;
    }
    return true;
  };

  const sendUser = async () => {
    const { error } = await resend.emails.send({
      from,
      to: submission.email,
      subject: "You've Rinwa'd — Your questionnaire has been received",
      text: `Hi ${submission.fullName}, we've received your questionnaire and will be in touch within 48 hours.`,
      html: buildUserQuestionnaireEmailHtml(submission),
    });
    if (error) {
      console.error('User questionnaire email failed:', error);
      warnings.push('Failed to send confirmation email to submitter');
      return false;
    }
    return true;
  };

  const [adminSent, userSent] = await Promise.all([sendAdmin(), sendUser()]);
  return { sent: adminSent && userSent, warnings };
}

// ─── Homecoming Check-In Emails ────────────────────────────────────────────────

const GOLD = '#e8c07a';
const TEAL = '#7dd3cf';

type HomecomingPayload = {
  submission: Record<string, any>;
  adminEmail: string;
};

function hRow(label: string, value: any) {
  const val = qs(value);
  if (val === '—') return '';
  return `
    <tr>
      <td style="padding:10px 16px;width:38%;vertical-align:top;font-size:11px;text-transform:uppercase;letter-spacing:0.16em;color:#8fa8a5;border-bottom:1px solid rgba(255,255,255,0.05);">${label}</td>
      <td style="padding:10px 16px;vertical-align:top;font-size:13px;color:#e8f0ef;line-height:1.6;border-bottom:1px solid rgba(255,255,255,0.05);">${escapeHtml(val).replace(/\n/g, '<br>')}</td>
    </tr>`;
}

function hSection(title: string, rows: string) {
  const filtered = rows.trim();
  if (!filtered) return '';
  return `
    <tr><td colspan="2" style="padding:20px 16px 6px;">
      <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:0.28em;color:${GOLD};">${title}</p>
    </td></tr>
    ${filtered}`;
}

function buildAdminHomecomingEmailHtml(s: Record<string, any>) {
  const firstName = escapeHtml((s.name || '').split(' ')[0] || 'Someone');
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New Diaspora Check-In</title></head>
<body style="margin:0;padding:0;background:#041114;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#041114;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">
        <tr><td style="padding-bottom:24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <img src="https://res.cloudinary.com/matthew-ayinde/image/upload/v1780311622/rinwa-logo_cekwvh.png" alt="RÌNWÁ" width="44" height="44" style="display:block;margin-bottom:7px;" />
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:0.12em;color:#f5f0e8;">RÌNWÁ</div>
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.32em;color:#8fa8a5;margin-top:3px;">Diaspora Week Lagos — Check-In</div>
              </td>
              <td align="right">
                <span style="display:inline-block;background:${GOLD};color:#041114;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;padding:5px 12px;border-radius:100px;">New Check-In</span>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="background:#07171a;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="height:2px;background:${GOLD};"></td></tr>
            <tr><td style="padding:28px 32px 20px;">
              <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.28em;color:${GOLD};">Home is calling</p>
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;color:#f5f0e8;font-weight:normal;">
                ${escapeHtml(s.name)}
              </h1>
              <p style="margin:10px 0 0;font-size:12px;letter-spacing:0.04em;color:#8fa8a5;">
                ${escapeHtml(s.visitorType || '—')} · ${escapeHtml(s.timeframe || '—')}
              </p>
            </td></tr>
            <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0;"></td></tr>
            <tr><td style="padding:4px 16px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${hSection('Contact', [
                  hRow('Name', s.name),
                  hRow('Reach via', s.contactMethod),
                  hRow('Contact Detail', s.contactValue),
                ].join(''))}
                ${hSection('Trip Details', [
                  hRow('First Time or Returning', s.visitorType),
                  hRow('Timeframe', s.timeframe),
                  hRow('Family / Friends Aware', s.familyAware),
                ].join(''))}
                ${hSection('Motivation', [
                  hRow('Reason for Coming', s.reason === 'Other' ? s.reasonOther : s.reason),
                ].join(''))}
                ${hSection('Friction Points', [
                  hRow('Trip Challenges', s.challenges),
                  hRow('Other Challenge', s.challengesOther),
                  hRow('Wants On-Ground Help', s.wantsHelp),
                ].join(''))}
                ${hSection('Excitement', [
                  hRow('Excited To Experience', s.excitedFor),
                  hRow('Other Excitement', s.excitedForOther),
                ].join(''))}
                ${hSection('Awareness', [
                  hRow('Heard of Diaspora Week Lagos', s.heardOfDWL),
                ].join(''))}
              </table>
            </td></tr>
            <tr><td style="padding:24px 32px 28px;text-align:center;">
              <a href="mailto:${escapeHtml(s.contactMethod === 'Email' ? s.contactValue : '')}?subject=Re: Your RÌNWÁ Diaspora Check-In"
                 style="display:inline-block;background:${GOLD};color:#041114;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;text-decoration:none;padding:13px 28px;border-radius:100px;">
                Reach out to ${firstName}
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 0 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#3d5a58;letter-spacing:0.1em;">RÌNWÁ Hospitality · Internal notification · Do not forward</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildUserHomecomingEmailHtml(s: Record<string, any>) {
  const firstName = escapeHtml((s.name || '').split(' ')[0] || 'there');
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>You're checked in</title></head>
<body style="margin:0;padding:0;background:#041114;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#041114;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr><td style="text-align:center;padding-bottom:28px;">
          <img src="https://res.cloudinary.com/matthew-ayinde/image/upload/v1780311622/rinwa-logo_cekwvh.png" alt="RÌNWÁ" width="54" height="54" style="display:block;margin:0 auto 10px;" />
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:0.14em;color:#f5f0e8;">RÌNWÁ</div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.38em;color:#8fa8a5;margin-top:4px;">Diaspora Week Lagos</div>
        </td></tr>
        <tr><td style="background:#07171a;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="height:2px;background:${GOLD};"></td></tr>
            <tr><td style="padding:36px 32px 28px;">
              <p style="margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:0.30em;color:${GOLD};">Check-in received</p>
              <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.15;color:#f5f0e8;font-weight:normal;">
                Thank you for your time, ${firstName}.<br>
                <span style="color:#8fa8a5;font-size:19px;">We'd get to you soon.</span>
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.78;color:#a0bcba;">
                We've received your details and our team will review everything carefully. Expect a personal follow-up soon on <strong style="color:#f5f0e8;">${escapeHtml(s.contactValue || '')}</strong>.
              </p>
            </td></tr>
            <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0;"></td></tr>
            <tr><td style="padding:22px 32px;">
              <p style="margin:0 0 8px;font-size:10px;text-transform:uppercase;letter-spacing:0.28em;color:${GOLD};">What you told us</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${[
                  hRow('Timeframe', s.timeframe),
                  hRow('First Time or Returning', s.visitorType),
                  hRow('Reason for Coming', s.reason === 'Other' ? s.reasonOther : s.reason),
                ].join('')}
              </table>
            </td></tr>
            <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0;"></td></tr>
            <tr><td style="padding:28px 32px;text-align:center;">
              <p style="margin:0 0 10px;font-size:13px;line-height:1.7;color:#8fa8a5;">
                Before that — we bet you'd have at least one person coming home this holiday.
                Help spread the word by sharing RÌNWÁ with them directly or on your stories.
              </p>
            </td></tr>
            <tr><td style="padding:0 32px 4px;"><hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0;"></td></tr>
            <tr><td style="padding:28px 32px 36px;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;color:#8fa8a5;">Until then,</p>
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#f5f0e8;letter-spacing:0.06em;">The RÌNWÁ Team</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 0 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#3d5a58;">You received this because you checked in for Diaspora Week Lagos on the RÌNWÁ website.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendHomecomingEmails({
  submission,
  adminEmail,
}: HomecomingPayload): Promise<EmailResult> {
  const resend = buildResendClient();
  const warnings: string[] = [];

  if (!resend) {
    warnings.push('RESEND_API_KEY is not configured');
    return { sent: false, warnings };
  }

  const from = process.env.RESEND_FROM;
  if (!from) {
    warnings.push('RESEND_FROM is not configured');
    return { sent: false, warnings };
  }

  const userEmail = submission.contactMethod === 'Email' ? submission.contactValue : null;

  const sendAdmin = async () => {
    const { error } = await resend.emails.send({
      from,
      to: adminEmail,
      replyTo: userEmail || undefined,
      subject: `[Diaspora Check-In] ${submission.name}`,
      text: `${submission.name} checked in via ${submission.contactMethod} (${submission.contactValue}). Coming ${submission.timeframe} as a ${submission.visitorType}.`,
      html: buildAdminHomecomingEmailHtml(submission),
    });
    if (error) {
      console.error('Admin homecoming email failed:', error);
      warnings.push('Failed to send admin notification');
      return false;
    }
    return true;
  };

  const sendUser = async () => {
    if (!userEmail) return true;
    const { error } = await resend.emails.send({
      from,
      to: userEmail,
      subject: "You're checked in — RÌNWÁ Homecoming",
      text: `Thank you for your time, ${submission.name}! We'd get to you soon.`,
      html: buildUserHomecomingEmailHtml(submission),
    });
    if (error) {
      console.error('User homecoming email failed:', error);
      warnings.push('Failed to send confirmation email to submitter');
      return false;
    }
    return true;
  };

  const [adminSent, userSent] = await Promise.all([sendAdmin(), sendUser()]);
  return { sent: adminSent && userSent, warnings };
}

// ─── Guest Experience feedback ──────────────────────────────────────────────

type GuestExperiencePayload = {
  submission: Record<string, any>;
  adminEmail: string;
};

function buildAdminGuestExperienceEmailHtml(s: Record<string, any>) {
  const score = escapeHtml(qs(s.caredForScore));
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New Guest Experience Feedback</title></head>
<body style="margin:0;padding:0;background:#041114;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#041114;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">
        <tr><td style="padding-bottom:24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <img src="https://res.cloudinary.com/matthew-ayinde/image/upload/v1780311622/rinwa-logo_cekwvh.png" alt="RÌNWÁ" width="44" height="44" style="display:block;margin-bottom:7px;" />
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:0.12em;color:#f5f0e8;">RÌNWÁ</div>
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.32em;color:#8fa8a5;margin-top:3px;">Guest Experience Feedback</div>
              </td>
              <td align="right">
                <span style="display:inline-block;background:${TEAL};color:#041114;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;padding:5px 12px;border-radius:100px;">${score} / 5 Cared For</span>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="background:#07171a;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="height:2px;background:${TEAL};"></td></tr>
            <tr><td style="padding:28px 32px 20px;">
              <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.28em;color:${TEAL};">Someone rated tonight</p>
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;color:#f5f0e8;font-weight:normal;">
                A new anonymous response just came in
              </h1>
            </td></tr>
            <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0;"></td></tr>
            <tr><td style="padding:4px 16px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${hRow('Felt welcomed', s.welcomed)}
                ${hRow('Anticipated moment', s.anticipatedMoment)}
                ${hRow('What happened', s.anticipatedMomentDetail)}
                ${hRow('Cared for (1–5)', s.caredForScore)}
                ${hRow('Felt overlooked / unsure', s.overlookedMoment)}
                ${hRow('Would return for the treatment', s.wouldReturn)}
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 0 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#3d5a58;letter-spacing:0.1em;">RÌNWÁ Hospitality · Internal notification · Do not forward</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildUserGuestExperienceEmailHtml(s: Record<string, any>) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Thanks for the feedback</title></head>
<body style="margin:0;padding:0;background:#041114;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#041114;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr><td style="text-align:center;padding-bottom:28px;">
          <img src="https://res.cloudinary.com/matthew-ayinde/image/upload/v1780311622/rinwa-logo_cekwvh.png" alt="RÌNWÁ" width="54" height="54" style="display:block;margin:0 auto 10px;" />
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:0.14em;color:#f5f0e8;">RÌNWÁ</div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.38em;color:#8fa8a5;margin-top:4px;">Guest Experience</div>
        </td></tr>
        <tr><td style="background:#07171a;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="height:2px;background:${TEAL};"></td></tr>
            <tr><td style="padding:36px 32px 28px;">
              <p style="margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:0.30em;color:${TEAL};">Feedback received</p>
              <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.15;color:#f5f0e8;font-weight:normal;">
                That&#8217;s exactly what<br>we needed to hear.
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.78;color:#a0bcba;">
                Thank you for taking a couple of minutes to tell us how tonight felt. Every answer goes straight to the people who plan the next one.
              </p>
            </td></tr>
            <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0;"></td></tr>
            <tr><td style="padding:28px 32px 36px;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;color:#8fa8a5;">See you at the next one,</p>
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#f5f0e8;letter-spacing:0.06em;">The RÌNWÁ Team</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 0 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#3d5a58;">You received this because you shared feedback on a RÌNWÁ evening and left your email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendGuestExperienceEmails({
  submission,
  adminEmail,
}: GuestExperiencePayload): Promise<EmailResult> {
  const resend = buildResendClient();
  const warnings: string[] = [];

  if (!resend) {
    warnings.push('RESEND_API_KEY is not configured');
    return { sent: false, warnings };
  }

  const from = process.env.RESEND_FROM;
  if (!from) {
    warnings.push('RESEND_FROM is not configured');
    return { sent: false, warnings };
  }

  const userEmail = submission.email && submission.email.trim() ? submission.email.trim() : null;

  const sendAdmin = async () => {
    const { error } = await resend.emails.send({
      from,
      to: adminEmail,
      replyTo: userEmail || undefined,
      subject: `[Guest Experience] ${submission.caredForScore}/5 cared-for rating`,
      text: `Felt welcomed: ${submission.welcomed}. Cared for: ${submission.caredForScore}/5. Would return: ${submission.wouldReturn}.`,
      html: buildAdminGuestExperienceEmailHtml(submission),
    });
    if (error) {
      console.error('Admin guest experience email failed:', error);
      warnings.push('Failed to send admin notification');
      return false;
    }
    return true;
  };

  const sendUser = async () => {
    if (!userEmail) return true;
    const { error } = await resend.emails.send({
      from,
      to: userEmail,
      subject: "Thanks for the feedback — RÌNWÁ",
      text: "Thank you for taking a couple of minutes to tell us how tonight felt.",
      html: buildUserGuestExperienceEmailHtml(submission),
    });
    if (error) {
      console.error('User guest experience email failed:', error);
      warnings.push('Failed to send confirmation email to submitter');
      return false;
    }
    return true;
  };

  const [adminSent, userSent] = await Promise.all([sendAdmin(), sendUser()]);
  return { sent: adminSent && userSent, warnings };
}

type GenericEmailPayload = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
};

export async function sendEmail({ to, subject, text, html, from }: GenericEmailPayload): Promise<EmailResult> {
  const resend = buildResendClient();
  const warnings: string[] = [];

  if (!resend) {
    warnings.push('RESEND_API_KEY is not configured');
    return { sent: false, warnings };
  }

  const _from = from || process.env.RESEND_FROM;
  if (!_from) {
    warnings.push('RESEND_FROM is not configured');
    return { sent: false, warnings };
  }

  const { error } = await resend.emails.send({
    from: _from,
    to,
    subject,
    text: text || '',
    html: html || text || '',
  });

  if (error) {
    console.error('Failed to send email:', error);
    warnings.push('Failed to send email');
    return { sent: false, warnings };
  }

  return { sent: true, warnings };
}
