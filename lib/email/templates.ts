import type { EmailEventType, EmailPayload, RenderedEmail } from "@/lib/email/types";

function value(payload: EmailPayload, key: string, fallback: string) {
  const item = payload[key];
  if (item === null || item === undefined || item === "") return fallback;
  return String(item);
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function button(label: string, href: string) {
  return `
    <a href="${escapeHtml(href)}" style="display:inline-block;border-radius:14px;background:#0f172a;color:#ffffff;font-weight:700;text-decoration:none;padding:13px 18px;font-size:14px;">
      ${escapeHtml(label)}
    </a>
  `;
}

function layout({
  preview,
  title,
  body,
}: {
  preview: string;
  title: string;
  body: string;
}) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin:0;background:#f7f7f6;color:#0f172a;font-family:Inter,Arial,sans-serif;">
        <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(preview)}</span>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f6;padding:28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e4e4e7;border-radius:24px;overflow:hidden;">
                <tr>
                  <td style="padding:28px 30px;border-bottom:1px solid #f1f1f2;">
                    <div style="font-size:18px;font-weight:800;letter-spacing:-0.03em;color:#0f172a;">AvenueBoard</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:30px;">
                    ${body}
                  </td>
                </tr>
                <tr>
                  <td style="padding:22px 30px;border-top:1px solid #f1f1f2;color:#71717a;font-size:12px;line-height:1.7;">
                    AvenueBoard helps landlords and tenants manage rent, leases, documents, and property communication in one place.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function paragraph(text: string) {
  return `<p style="margin:0 0 16px;color:#52525b;font-size:15px;line-height:1.7;">${escapeHtml(text)}</p>`;
}

function heading(text: string) {
  return `<h1 style="margin:0 0 16px;color:#0f172a;font-size:28px;line-height:1.12;letter-spacing:-0.05em;">${escapeHtml(text)}</h1>`;
}

export function renderEmailTemplate(
  eventType: EmailEventType,
  payload: EmailPayload = {}
): RenderedEmail {
  const dashboardUrl = `${appUrl()}/dashboard`;
  const tenantUrl = `${appUrl()}/tenant`;
  const inviteLink = value(payload, "inviteLink", `${appUrl()}/tenant/accept-invite`);
  const landlordName = value(payload, "landlordName", "there");
  const tenantName = value(payload, "tenantName", "there");
  const propertyName = value(payload, "propertyName", "your property");

  const templates: Record<EmailEventType, RenderedEmail> = {
    landlord_welcome: {
      subject: "Welcome to AvenueBoard",
      text: `Welcome to AvenueBoard, ${landlordName}. Add your first property to start managing your lease and tenant workflow.`,
      html: layout({
        preview: "Welcome to AvenueBoard.",
        title: "Welcome to AvenueBoard",
        body: `
          ${heading(`Welcome, ${landlordName}`)}
          ${paragraph("Your landlord workspace is ready. Add your first property to create a lease, invite your tenant, and organize rent activity.")}
          ${button("Open Dashboard", dashboardUrl)}
        `,
      }),
    },
    tenant_welcome: {
      subject: "Welcome to AvenueBoard",
      text: `Welcome to AvenueBoard, ${tenantName}. Your tenant portal is ready.`,
      html: layout({
        preview: "Your AvenueBoard tenant portal is ready.",
        title: "Welcome to AvenueBoard",
        body: `
          ${heading(`Welcome, ${tenantName}`)}
          ${paragraph("Your tenant portal is ready. You can review lease details, shared documents, notes, and rent activity from one secure place.")}
          ${button("Open Tenant Portal", tenantUrl)}
        `,
      }),
    },
    add_first_property_reminder: {
      subject: "Add your first property on AvenueBoard",
      text: "Your AvenueBoard account is ready. Add your first property to invite your tenant and activate your dashboard.",
      html: layout({
        preview: "Add your first property to activate your dashboard.",
        title: "Add your first property",
        body: `
          ${heading("Add your first property")}
          ${paragraph("Your AvenueBoard account is ready. Add your first property to create the lease, invite your tenant, and begin organizing rent activity.")}
          ${button("Add Property", `${dashboardUrl}/add-property`)}
        `,
      }),
    },
    tenant_invitation: {
      subject: `${propertyName} invited you to AvenueBoard`,
      text: `${tenantName}, you have been invited to access ${propertyName} on AvenueBoard. Open your invite: ${inviteLink}`,
      html: layout({
        preview: `You have been invited to access ${propertyName}.`,
        title: "Tenant invitation",
        body: `
          ${heading(`You're invited to AvenueBoard`)}
          ${paragraph(`${tenantName}, your landlord invited you to access ${propertyName} on AvenueBoard.`)}
          ${button("Accept Invitation", inviteLink)}
        `,
      }),
    },
    tenant_invite_reminder_24h: {
      subject: "Reminder: accept your AvenueBoard invite",
      text: `Reminder: accept your AvenueBoard invite for ${propertyName}. ${inviteLink}`,
      html: layout({
        preview: "Your AvenueBoard invite is waiting.",
        title: "Accept your invite",
        body: `
          ${heading("Your invite is waiting")}
          ${paragraph(`Your tenant invite for ${propertyName} is still open. Accept it to activate your portal.`)}
          ${button("Accept Invitation", inviteLink)}
        `,
      }),
    },
    tenant_invite_reminder_48h: {
      subject: "Your AvenueBoard invite is still open",
      text: `Your AvenueBoard invite for ${propertyName} is still open. ${inviteLink}`,
      html: layout({
        preview: "Your AvenueBoard invite is still open.",
        title: "Your invite is still open",
        body: `
          ${heading("Your invite is still open")}
          ${paragraph(`Please accept your invite for ${propertyName} so your tenant portal can be activated.`)}
          ${button("Accept Invitation", inviteLink)}
        `,
      }),
    },
    tenant_invite_reminder_72h: {
      subject: "Final reminder: AvenueBoard invite",
      text: `Final reminder: accept your AvenueBoard invite for ${propertyName}. ${inviteLink}`,
      html: layout({
        preview: "Final reminder to accept your AvenueBoard invite.",
        title: "Final invite reminder",
        body: `
          ${heading("Final invite reminder")}
          ${paragraph(`Your invite for ${propertyName} is still waiting. Accept it to access your tenant portal.`)}
          ${button("Accept Invitation", inviteLink)}
        `,
      }),
    },
    lease_activated: {
      subject: "Your lease is active on AvenueBoard",
      text: `Your lease for ${propertyName} is active on AvenueBoard.`,
      html: layout({
        preview: "Your lease is active on AvenueBoard.",
        title: "Lease activated",
        body: `
          ${heading("Your lease is active")}
          ${paragraph(`Your lease for ${propertyName} is now active in AvenueBoard.`)}
          ${button("Open Tenant Portal", tenantUrl)}
        `,
      }),
    },
    tenant_accepted_landlord_notification: {
      subject: `${tenantName} accepted the AvenueBoard invite`,
      text: `${tenantName} accepted the invite for ${propertyName}.`,
      html: layout({
        preview: "Tenant invite accepted.",
        title: "Tenant invite accepted",
        body: `
          ${heading("Tenant invite accepted")}
          ${paragraph(`${tenantName} accepted the invite for ${propertyName}. You can now continue lease and payment setup from your dashboard.`)}
          ${button("Open Dashboard", dashboardUrl)}
        `,
      }),
    },
  };

  return templates[eventType];
}
