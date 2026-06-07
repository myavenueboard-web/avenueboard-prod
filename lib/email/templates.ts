import type {
  EmailEventType,
  EmailPayload,
  RenderedEmail,
} from "@/lib/email/types";

const ACCENT = "#B9476D";
const SLATE = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e5e7eb";

function value(payload: EmailPayload, key: string, fallback: string) {
  const item = payload[key];
  if (item === null || item === undefined || item === "") return fallback;
  return String(item);
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function assetUrl(path: string) {
  return `${appUrl()}${path}`;
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeHref(href: string) {
  return escapeHtml(href);
}

export function EmailShell({
  preview,
  title,
  children,
}: {
  preview: string;
  title: string;
  children: string;
}) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <title>${escapeHtml(title)}</title>
        <style>
          @media only screen and (max-width: 640px) {
            .ab-container { width: 100% !important; }
            .ab-pad { padding-left: 24px !important; padding-right: 24px !important; }
            .ab-hero { font-size: 32px !important; line-height: 1.06 !important; }
            .ab-card-pad { padding: 22px !important; }
            .ab-button { display: block !important; text-align: center !important; }
          }
        </style>
      </head>
      <body style="margin:0;padding:0;background:#ffffff;color:${SLATE};font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
        <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${escapeHtml(preview)}</span>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;">
          <tr>
            <td align="center" style="padding:0;">
              <table role="presentation" class="ab-container" width="640" cellspacing="0" cellpadding="0" border="0" style="width:640px;max-width:640px;background:#ffffff;">
                ${children}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function EmailHeader({ eyebrow }: { eyebrow?: string }) {
  return `
    <tr>
      <td class="ab-pad" style="padding:42px 48px 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="vertical-align:middle;">
              <img src="${safeHref(assetUrl("/logo.png"))}" width="150" alt="AvenueBoard" style="display:block;width:150px;max-width:150px;height:auto;border:0;outline:none;text-decoration:none;" />
            </td>
            ${
              eyebrow
                ? `<td align="right" style="vertical-align:middle;font-size:11px;line-height:16px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#94a3b8;">${escapeHtml(eyebrow)}</td>`
                : ""
            }
          </tr>
        </table>
      </td>
    </tr>
  `;
}

export function EmailHero({
  eyebrow,
  headline,
  copy,
  secondaryCopy,
}: {
  eyebrow: string;
  headline: string;
  copy: string;
  secondaryCopy?: string;
}) {
  return `
    <tr>
      <td class="ab-pad" style="padding:18px 48px 20px;">
        <div style="margin:0 0 14px;color:${ACCENT};font-size:11px;line-height:16px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;">
          ${escapeHtml(eyebrow)}
        </div>
        <h1 class="ab-hero" style="margin:0;color:#020617;font-size:36px;line-height:1.05;letter-spacing:-0.045em;font-weight:800;">
          ${escapeHtml(headline)}
        </h1>
        <p style="margin:18px 0 0;color:#111827;font-size:16px;line-height:25px;font-weight:400;max-width:520px;">
          ${escapeHtml(copy)}
        </p>
        ${
          secondaryCopy
            ? `<p style="margin:10px 0 0;color:#475569;font-size:15px;line-height:24px;font-weight:400;max-width:520px;">${escapeHtml(secondaryCopy)}</p>`
            : ""
        }
      </td>
    </tr>
  `;
}

export function EmailFeatureGrid({ items }: { items: string[] }) {
  if (items.length === 0) return "";

  return `
    <tr>
      <td class="ab-pad" style="padding:0 48px 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${Array.from({ length: Math.ceil(items.length / 2) })
            .map((_, rowIndex) => {
              const rowItems = items.slice(rowIndex * 2, rowIndex * 2 + 2);
              return `
                <tr>
                  ${rowItems
                    .map(
                      (item, cellIndex) => `
                        <td width="50%" style="width:50%;padding:${rowIndex > 0 ? "10px" : "0"} ${cellIndex === 0 ? "6px" : "0"} 0 ${cellIndex === 0 ? "0" : "6px"};vertical-align:top;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #eef2f7;border-radius:14px;background:#fbfcfd;">
                            <tr>
                              <td style="padding:13px 14px;">
                                <span style="display:inline-block;width:18px;height:18px;border-radius:6px;background:#fdf2f6;color:${ACCENT};font-size:12px;line-height:18px;text-align:center;font-weight:800;margin-right:8px;">✓</span>
                                <span style="color:${SLATE};font-size:13px;line-height:19px;font-weight:700;">${escapeHtml(item)}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      `
                    )
                    .join("")}
                  ${
                    rowItems.length === 1
                      ? `<td width="50%" style="width:50%;padding:${rowIndex > 0 ? "10px" : "0"} 0 0 6px;"></td>`
                      : ""
                  }
                </tr>
              `;
            })
            .join("")}
        </table>
      </td>
    </tr>
  `;
}

export function EmailButton({
  label,
  href,
}: {
  label: string;
  href: string;
}) {
  return `
    <tr>
      <td class="ab-pad" style="padding:0 48px 34px;">
        <a class="ab-button" href="${safeHref(href)}" style="display:inline-block;background:${ACCENT};border:1px solid ${ACCENT};border-radius:12px;color:#ffffff;font-size:14px;line-height:18px;font-weight:800;text-decoration:none;padding:12px 16px;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  `;
}

export function EmailStatusModule({
  label,
  title,
  status,
  rows = [],
}: {
  label: string;
  title: string;
  status: string;
  rows?: Array<{ label: string; value: string }>;
}) {
  return `
    <tr>
      <td class="ab-pad" style="padding:2px 48px 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid ${BORDER};border-radius:20px;background:#ffffff;">
          <tr>
            <td class="ab-card-pad" style="padding:20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align:top;">
                    <div style="font-size:10px;line-height:14px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;color:#94a3b8;">
                      ${escapeHtml(label)}
                    </div>
                    <div style="margin-top:8px;font-size:22px;line-height:27px;font-weight:800;letter-spacing:-0.035em;color:${SLATE};">
                      ${escapeHtml(title)}
                    </div>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <span style="display:inline-block;border-radius:10px;background:#fdf2f6;color:${ACCENT};font-size:12px;line-height:16px;font-weight:800;padding:7px 10px;">
                      ${escapeHtml(status)}
                    </span>
                  </td>
                </tr>
              </table>
              ${
                rows.length
                  ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:18px;border-top:1px solid #f1f5f9;">${rows
                      .map((row) =>
                        EmailInfoRow({
                          label: row.label,
                          value: row.value,
                        })
                      )
                      .join("")}</table>`
                  : ""
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

export function EmailInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return `
    <tr>
      <td style="padding:14px 0 0;color:#94a3b8;font-size:12px;line-height:18px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">
        ${escapeHtml(label)}
      </td>
      <td align="right" style="padding:14px 0 0;color:${SLATE};font-size:14px;line-height:20px;font-weight:700;">
        ${escapeHtml(value)}
      </td>
    </tr>
  `;
}

export function EmailFooter({ note }: { note?: string }) {
  return `
    <tr>
      <td class="ab-pad" style="padding:0 48px 54px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #e5e7eb;">
          <tr>
            <td style="padding-top:24px;color:${MUTED};font-size:12px;line-height:20px;">
              <div style="font-weight:800;color:${SLATE};font-size:15px;letter-spacing:-0.03em;">AvenueBoard</div>
              <div style="margin-top:10px;">
                ${escapeHtml(
                  note || "Built for landlords. Designed for tenants."
                )}
              </div>
              <div style="margin-top:16px;color:#94a3b8;">
                Need help? support@avenueboard.com
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function renderPremiumEmail({
  preview,
  title,
  eyebrow,
  headline,
  copy,
  secondaryCopy,
  ctaLabel,
  ctaHref,
  features = [],
  card,
  footerNote,
}: {
  preview: string;
  title: string;
  eyebrow: string;
  headline: string;
  copy: string;
  secondaryCopy?: string;
  ctaLabel: string;
  ctaHref: string;
  features?: string[];
  card: Parameters<typeof EmailStatusModule>[0];
  footerNote?: string;
}) {
  return EmailShell({
    preview,
    title,
    children: `
      ${EmailHeader({})}
      ${EmailHero({ eyebrow, headline, copy, secondaryCopy })}
      ${EmailStatusModule(card)}
      ${EmailFeatureGrid({ items: features })}
      ${EmailButton({ label: ctaLabel, href: ctaHref })}
      ${EmailFooter({ note: footerNote })}
    `,
  });
}

function EmailLandlordWelcome({
  landlordName,
  ctaHref,
}: {
  landlordName: string;
  ctaHref: string;
}) {
  const greeting =
    landlordName === "there"
      ? "Hi there,"
      : `Hi <span style="color:#12304d;">${escapeHtml(landlordName)}</span>,`;

  return `
    <!doctype html>
    <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <title>Welcome to AvenueBoard</title>
        <style>
          @media only screen and (max-width: 640px) {
            .ab-container { width: 100% !important; }
            .ab-shell { padding: 0 !important; }
            .ab-header { padding: 12px 24px !important; }
            .ab-content { padding: 38px 28px 42px !important; }
            .ab-title { font-size: 30px !important; line-height: 1.12 !important; }
            .ab-footer { padding: 30px 24px 36px !important; }
            .ab-button { display: block !important; text-align: center !important; }
          }
        </style>
      </head>
      <body style="margin:0;padding:0;background:#f7f8fa;color:${SLATE};font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
        <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">Welcome to AvenueBoard. A note from the AvenueBoard team.</span>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f8fa;">
          <tr>
            <td class="ab-shell" align="center" style="padding:34px 12px;">
              <table role="presentation" class="ab-container" width="640" cellspacing="0" cellpadding="0" border="0" style="width:640px;max-width:640px;background:#ffffff;">
                <tr>
                  <td class="ab-header" align="right" style="padding:12px 48px;background:#eef3f7;border-bottom:1px solid #e3e8ee;">
                    <img src="${safeHref(assetUrl("/logo.png"))}" width="136" alt="AvenueBoard" style="display:block;width:136px;max-width:136px;height:auto;border:0;outline:none;text-decoration:none;" />
                  </td>
                </tr>
                <tr>
                  <td class="ab-content" style="padding:48px 64px 48px;background:#ffffff;">
                    <p style="margin:0 0 18px;color:${SLATE};font-size:15px;line-height:29px;font-weight:700;">
                      ${greeting}
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      Welcome to AvenueBoard.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      And more importantly, welcome to a different way of managing rentals.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      For many landlords, rental management slowly becomes a collection of spreadsheets, reminders, text messages, bank transfers, folders, and paperwork spread across different places. It works—until it doesn't.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      A missed payment. A lost document. A lease renewal that sneaks up unexpectedly.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      Over time, the small things become the things that take up most of your attention.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      AvenueBoard was created because we believe landlords deserve something better.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      Whether you own a single rental property or are building a growing portfolio, managing your rentals should feel organized, professional, and effortless. Not complicated. Not expensive. And certainly not like a second full-time job.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      As you begin using AvenueBoard, you'll notice something simple:
                    </p>
                    <p style="margin:0 0 18px;color:#0b1324;font-size:16px;line-height:29px;font-weight:800;letter-spacing:-0.015em;">
                      Everything starts coming together in one place.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      Properties. Tenants. Leases. Documents. Payments.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      One workspace designed around the way real landlords actually operate.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      But the biggest benefit isn't a feature.
                    </p>
                    <p style="margin:0 0 18px;color:#0b1324;font-size:16px;line-height:29px;font-weight:800;letter-spacing:-0.015em;">
                      It's peace of mind.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      Knowing where everything is. Knowing what needs attention. Knowing that your rental business is organized and moving forward.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      We're also building AvenueBoard differently.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      We're not building for shareholders first. We're building for landlords.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      Every improvement, every feature, and every decision starts with one question:
                    </p>
                    <p style="margin:0 0 18px;color:#0b1324;font-size:16px;line-height:29px;font-weight:800;letter-spacing:-0.015em;">
                      "Will this make life easier for the people managing rental properties every day?"
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      That commitment will never change.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      As AvenueBoard grows, we'll continue investing in better tools, better experiences, and better ways to support both landlords and tenants.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      Thank you for trusting us with your rental journey.
                    </p>
                    <p style="margin:0 0 26px;color:#42526a;font-size:15px;line-height:29px;">
                      We are excited to build alongside you.
                    </p>
                    <p style="margin:0 0 32px;color:#172033;font-size:15px;line-height:29px;font-weight:700;">
                      — The AvenueBoard Team
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="padding-top:4px;">
                          <a class="ab-button" href="${safeHref(ctaHref)}" style="display:inline-block;background:#07111f;border:1px solid #07111f;border-radius:11px;color:#ffffff;font-size:13px;line-height:18px;font-weight:800;text-decoration:none;padding:11px 16px;">
                            Create Your First Property
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="ab-footer" style="padding:34px 48px 42px;background:#f4f6f8;border-top:1px solid #e5e7eb;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="color:#64748b;font-size:12px;line-height:20px;text-align:center;">
                          <div style="color:#334155;font-weight:700;">Built for landlords. Designed for tenants.</div>
                          <div style="margin-top:14px;color:#475569;">support@avenueboard.com</div>
                          <div style="margin-top:18px;color:#718096;">You are receiving this email because your AvenueBoard account was created.</div>
                          <div style="margin-top:8px;color:#718096;">© 2026 AvenueBoard. All rights reserved.</div>
                          <div style="margin-top:8px;color:#718096;">AvenueBoard is a rental management platform for landlords and tenants.</div>
                        </td>
                      </tr>
                    </table>
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

function EmailTenantWelcome({
  tenantName,
  ctaHref,
}: {
  tenantName: string;
  ctaHref: string;
}) {
  const greeting =
    tenantName === "there"
      ? "Hi there,"
      : `Hi <span style="color:#12304d;">${escapeHtml(tenantName)}</span>,`;

  return `
    <!doctype html>
    <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <title>Welcome to AvenueBoard</title>
        <style>
          @media only screen and (max-width: 640px) {
            .ab-container { width: 100% !important; }
            .ab-shell { padding: 0 !important; }
            .ab-header { padding: 12px 24px !important; }
            .ab-content { padding: 38px 28px 42px !important; }
            .ab-footer { padding: 30px 24px 36px !important; }
            .ab-button { display: block !important; text-align: center !important; }
          }
        </style>
      </head>
      <body style="margin:0;padding:0;background:#f7f8fa;color:${SLATE};font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
        <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">Welcome to AvenueBoard. Your rental experience is ready.</span>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f8fa;">
          <tr>
            <td class="ab-shell" align="center" style="padding:34px 12px;">
              <table role="presentation" class="ab-container" width="640" cellspacing="0" cellpadding="0" border="0" style="width:640px;max-width:640px;background:#ffffff;">
                <tr>
                  <td class="ab-header" align="right" style="padding:12px 48px;background:#eef3f7;border-bottom:1px solid #e3e8ee;">
                    <img src="${safeHref(assetUrl("/logo.png"))}" width="136" alt="AvenueBoard" style="display:block;width:136px;max-width:136px;height:auto;border:0;outline:none;text-decoration:none;" />
                  </td>
                </tr>
                <tr>
                  <td class="ab-content" style="padding:48px 64px 48px;background:#ffffff;">
                    <p style="margin:0 0 18px;color:${SLATE};font-size:15px;line-height:29px;font-weight:700;">
                      ${greeting}
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      Welcome to AvenueBoard.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      Your landlord has invited you to join a simpler, more organized rental experience.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      Renting a home should not mean searching through old emails, tracking down payment records, or wondering where important documents are stored.
                    </p>
                    <p style="margin:0 0 18px;color:#0b1324;font-size:16px;line-height:29px;font-weight:800;letter-spacing:-0.015em;">
                      AvenueBoard brings everything together in one place.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      From rent payments and receipts to lease documents and important updates, you'll always have access to the information that matters most.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      But AvenueBoard is about more than convenience.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      We believe renting should feel transparent, organized, and stress-free for everyone involved.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      That's why we're building a platform that helps create stronger relationships between landlords and tenants—making communication easier, records clearer, and day-to-day rental management simpler.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      As you begin using AvenueBoard, you'll be able to securely manage your rental experience, stay informed, and keep important information within reach whenever you need it.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      And we're just getting started.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      As AvenueBoard continues to grow, we'll introduce tenant-focused benefits designed to reward responsible renters and create an even better rental experience.
                    </p>
                    <p style="margin:0 0 18px;color:#42526a;font-size:15px;line-height:29px;">
                      Thank you for joining AvenueBoard.
                    </p>
                    <p style="margin:0 0 26px;color:#42526a;font-size:15px;line-height:29px;">
                      We're excited to have you here.
                    </p>
                    <p style="margin:0 0 32px;color:#172033;font-size:15px;line-height:29px;font-weight:700;">
                      — The AvenueBoard Team
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="padding-top:4px;">
                          <a class="ab-button" href="${safeHref(ctaHref)}" style="display:inline-block;background:#07111f;border:1px solid #07111f;border-radius:11px;color:#ffffff;font-size:13px;line-height:18px;font-weight:800;text-decoration:none;padding:11px 16px;">
                            Complete Your Setup
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="ab-footer" style="padding:34px 48px 42px;background:#f4f6f8;border-top:1px solid #e5e7eb;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="color:#64748b;font-size:12px;line-height:20px;text-align:center;">
                          <div style="color:#334155;font-weight:700;">Built for landlords. Designed for tenants.</div>
                          <div style="margin-top:14px;color:#475569;">support@avenueboard.com</div>
                          <div style="margin-top:18px;color:#718096;">You are receiving this email because your AvenueBoard account was created.</div>
                          <div style="margin-top:8px;color:#718096;">© 2026 AvenueBoard. All rights reserved.</div>
                          <div style="margin-top:8px;color:#718096;">AvenueBoard is a rental management platform for landlords and tenants.</div>
                        </td>
                      </tr>
                    </table>
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

function EmailActionNotice({
  preview,
  title,
  eyebrow,
  headline,
  paragraphs,
  ctaLabel,
  ctaHref,
  details = [],
}: {
  preview: string;
  title: string;
  eyebrow: string;
  headline: string;
  paragraphs: string[];
  ctaLabel?: string;
  ctaHref?: string;
  details?: Array<{ label: string; value: string }>;
}) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <title>${escapeHtml(title)}</title>
        <style>
          @media only screen and (max-width: 640px) {
            .ab-container { width: 100% !important; }
            .ab-shell { padding: 0 !important; }
            .ab-header { padding: 12px 24px !important; }
            .ab-content { padding: 34px 28px 38px !important; }
            .ab-footer { padding: 30px 24px 36px !important; }
            .ab-button { display: block !important; text-align: center !important; }
          }
        </style>
      </head>
      <body style="margin:0;padding:0;background:#f7f8fa;color:${SLATE};font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
        <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${escapeHtml(preview)}</span>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f8fa;">
          <tr>
            <td class="ab-shell" align="center" style="padding:34px 12px;">
              <table role="presentation" class="ab-container" width="640" cellspacing="0" cellpadding="0" border="0" style="width:640px;max-width:640px;background:#ffffff;">
                <tr>
                  <td class="ab-header" align="right" style="padding:12px 48px;background:#eef3f7;border-bottom:1px solid #e3e8ee;">
                    <img src="${safeHref(assetUrl("/logo.png"))}" width="136" alt="AvenueBoard" style="display:block;width:136px;max-width:136px;height:auto;border:0;outline:none;text-decoration:none;" />
                  </td>
                </tr>
                <tr>
                  <td class="ab-content" style="padding:42px 64px 44px;background:#ffffff;">
                    <div style="margin:0 0 12px;color:#718096;font-size:11px;line-height:16px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;">
                      ${escapeHtml(eyebrow)}
                    </div>
                    <h1 style="margin:0 0 22px;color:#07111f;font-size:26px;line-height:1.16;letter-spacing:-0.025em;font-weight:800;">
                      ${escapeHtml(headline)}
                    </h1>
                    ${paragraphs
                      .map(
                        (paragraph) => `
                          <p style="margin:0 0 16px;color:#42526a;font-size:15px;line-height:28px;">
                            ${escapeHtml(paragraph)}
                          </p>
                        `
                      )
                      .join("")}
                    ${
                      details.length
                        ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:10px 0 24px;border-top:1px solid #edf0f3;">${details
                            .map(
                              (detail) => `
                                <tr>
                                  <td style="padding:12px 0 0;color:#718096;font-size:12px;line-height:18px;font-weight:700;">
                                    ${escapeHtml(detail.label)}
                                  </td>
                                  <td align="right" style="padding:12px 0 0;color:#172033;font-size:13px;line-height:18px;font-weight:700;">
                                    ${escapeHtml(detail.value)}
                                  </td>
                                </tr>
                              `
                            )
                            .join("")}</table>`
                        : ""
                    }
                    ${
                      ctaLabel && ctaHref
                        ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td align="center" style="padding-top:4px;">
                                <a class="ab-button" href="${safeHref(ctaHref)}" style="display:inline-block;background:#07111f;border:1px solid #07111f;border-radius:11px;color:#ffffff;font-size:13px;line-height:18px;font-weight:800;text-decoration:none;padding:11px 16px;">
                                  ${escapeHtml(ctaLabel)}
                                </a>
                              </td>
                            </tr>
                          </table>`
                        : ""
                    }
                  </td>
                </tr>
                <tr>
                  <td class="ab-footer" style="padding:34px 48px 42px;background:#f4f6f8;border-top:1px solid #e5e7eb;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="color:#64748b;font-size:12px;line-height:20px;text-align:center;">
                          <div style="color:#334155;font-weight:700;">Built for landlords. Designed for tenants.</div>
                          <div style="margin-top:14px;color:#475569;">support@avenueboard.com</div>
                          <div style="margin-top:18px;color:#718096;">You are receiving this email because your AvenueBoard account was created.</div>
                          <div style="margin-top:8px;color:#718096;">© 2026 AvenueBoard. All rights reserved.</div>
                          <div style="margin-top:8px;color:#718096;">AvenueBoard is a rental management platform for landlords and tenants.</div>
                        </td>
                      </tr>
                    </table>
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

function dashboardUrl() {
  return `${appUrl()}/dashboard`;
}

function tenantUrl() {
  return `${appUrl()}/tenant`;
}

function addPropertyUrl() {
  return `${dashboardUrl()}/add-property`;
}

export function renderEmailTemplate(
  eventType: EmailEventType,
  payload: EmailPayload = {}
): RenderedEmail {
  const inviteLink = value(
    payload,
    "inviteLink",
    `${appUrl()}/tenant/accept-invite`
  );
  const landlordName = value(payload, "landlordName", "there");
  const tenantName = value(payload, "tenantName", "there");
  const propertyName = value(payload, "propertyName", "your property");
  const landlordGreeting =
    landlordName === "there" ? "Hi there," : `Hi ${landlordName},`;

  const templates: Record<EmailEventType, RenderedEmail> = {
    landlord_welcome: {
      subject: "Welcome to AvenueBoard",
      text: `${landlordGreeting}

Welcome to AvenueBoard.

And more importantly, welcome to a different way of managing rentals.

For many landlords, rental management slowly becomes a collection of spreadsheets, reminders, text messages, bank transfers, folders, and paperwork spread across different places. It works—until it doesn't.

A missed payment. A lost document. A lease renewal that sneaks up unexpectedly.

Over time, the small things become the things that take up most of your attention.

AvenueBoard was created because we believe landlords deserve something better.

Whether you own a single rental property or are building a growing portfolio, managing your rentals should feel organized, professional, and effortless. Not complicated. Not expensive. And certainly not like a second full-time job.

As you begin using AvenueBoard, you'll notice something simple:

Everything starts coming together in one place.

Properties. Tenants. Leases. Documents. Payments.

One workspace designed around the way real landlords actually operate.

But the biggest benefit isn't a feature.

It's peace of mind.

Knowing where everything is. Knowing what needs attention. Knowing that your rental business is organized and moving forward.

We're also building AvenueBoard differently.

We're not building for shareholders first. We're building for landlords.

Every improvement, every feature, and every decision starts with one question:

"Will this make life easier for the people managing rental properties every day?"

That commitment will never change.

As AvenueBoard grows, we'll continue investing in better tools, better experiences, and better ways to support both landlords and tenants.

Thank you for trusting us with your rental journey.

We are excited to build alongside you.

— The AvenueBoard Team`,
      html: EmailLandlordWelcome({
        landlordName,
        ctaHref: addPropertyUrl(),
      }),
    },
    tenant_welcome: {
      subject: "Welcome to AvenueBoard",
      text: `${tenantName === "there" ? "Hi there," : `Hi ${tenantName},`}

Welcome to AvenueBoard.

Your landlord has invited you to join a simpler, more organized rental experience.

Renting a home should not mean searching through old emails, tracking down payment records, or wondering where important documents are stored.

AvenueBoard brings everything together in one place.

From rent payments and receipts to lease documents and important updates, you'll always have access to the information that matters most.

But AvenueBoard is about more than convenience.

We believe renting should feel transparent, organized, and stress-free for everyone involved.

That's why we're building a platform that helps create stronger relationships between landlords and tenants—making communication easier, records clearer, and day-to-day rental management simpler.

As you begin using AvenueBoard, you'll be able to securely manage your rental experience, stay informed, and keep important information within reach whenever you need it.

And we're just getting started.

As AvenueBoard continues to grow, we'll introduce tenant-focused benefits designed to reward responsible renters and create an even better rental experience.

Thank you for joining AvenueBoard.

We're excited to have you here.

— The AvenueBoard Team`,
      html: EmailTenantWelcome({
        tenantName,
        ctaHref: tenantUrl(),
      }),
    },
    add_first_property_reminder: {
      subject: "Create your first AvenueBoard property",
      text: `${landlordName}, your AvenueBoard workspace is ready. Add your first property to start organizing leases, tenant access, documents, and rent activity in one place. ${addPropertyUrl()}`,
      html: EmailActionNotice({
        preview: "Add your first property to start organizing your rental workspace.",
        title: "Create your first property",
        eyebrow: "Next Step",
        headline: "Your workspace is ready.",
        paragraphs: [
          `${landlordName}, add your first property to create the center of your rental record.`,
          "Once your property is added, AvenueBoard can help keep leases, tenant access, documents, and rent activity organized in one place.",
        ],
        ctaLabel: "Create Your First Property",
        ctaHref: addPropertyUrl(),
      }),
    },
    tenant_invitation: {
      subject: `You’ve been invited to AvenueBoard`,
      text: `${tenantName}, your landlord invited you to join ${propertyName} on AvenueBoard. Accept your invitation to access your tenant workspace and keep lease information, documents, and payment records organized. ${inviteLink}`,
      html: EmailActionNotice({
        preview: `Your landlord invited you to join ${propertyName} on AvenueBoard.`,
        title: "AvenueBoard invitation",
        eyebrow: "Invitation",
        headline: "Your tenant workspace is ready.",
        paragraphs: [
          `${tenantName}, your landlord invited you to join ${propertyName} on AvenueBoard.`,
          "Accept your invitation to access your tenant workspace and keep lease information, documents, payment records, and property updates organized in one place.",
        ],
        ctaLabel: "Accept Invitation",
        ctaHref: inviteLink,
        details: [{ label: "Property", value: propertyName }],
      }),
    },
    tenant_invite_reminder_24h: {
      subject: "Your AvenueBoard invitation is ready",
      text: `A friendly reminder that your AvenueBoard invitation for ${propertyName} is ready when you are. Accept to access your tenant workspace. ${inviteLink}`,
      html: EmailActionNotice({
        preview: "Your AvenueBoard invite is ready when you are.",
        title: "Accept your invite",
        eyebrow: "Reminder",
        headline: "Your invite is ready.",
        paragraphs: [
          `A friendly note that your AvenueBoard invitation for ${propertyName} is still available.`,
          "Accept when convenient to access your tenant workspace and keep important rental information organized.",
        ],
        ctaLabel: "Accept Invitation",
        ctaHref: inviteLink,
        details: [{ label: "Property", value: propertyName }],
      }),
    },
    tenant_invite_reminder_48h: {
      subject: "Your AvenueBoard invite is still open",
      text: `Your AvenueBoard invite for ${propertyName} is still open. Accept whenever you are ready to access your tenant workspace. ${inviteLink}`,
      html: EmailActionNotice({
        preview: "Your AvenueBoard invite is still open.",
        title: "Your invite is still open",
        eyebrow: "Reminder",
        headline: "A quick note.",
        paragraphs: [
          `Your invitation for ${propertyName} is still open.`,
          "When you're ready, you can accept it to access your tenant workspace and keep rental records in one place.",
        ],
        ctaLabel: "Accept Invitation",
        ctaHref: inviteLink,
        details: [{ label: "Property", value: propertyName }],
      }),
    },
    tenant_invite_reminder_72h: {
      subject: "Final reminder: AvenueBoard invitation",
      text: `Final reminder: your AvenueBoard invitation for ${propertyName} is still available. Accept to access your tenant workspace when you're ready. ${inviteLink}`,
      html: EmailActionNotice({
        preview: "Your AvenueBoard invitation is still available.",
        title: "Final invite reminder",
        eyebrow: "Final Reminder",
        headline: "Your invitation is still available.",
        paragraphs: [
          `This is a final reminder that your AvenueBoard invitation for ${propertyName} is still open.`,
          "Accept when you're ready to access your tenant workspace and keep important rental information organized.",
        ],
        ctaLabel: "Accept Invitation",
        ctaHref: inviteLink,
        details: [{ label: "Property", value: propertyName }],
      }),
    },
    lease_activated: {
      subject: "Your lease is active on AvenueBoard",
      text: `Your lease for ${propertyName} is active on AvenueBoard. You can now view lease details, documents, payment information, and property updates in your tenant portal. ${tenantUrl()}`,
      html: EmailActionNotice({
        preview: "Your lease workspace is now active.",
        title: "Lease activated",
        eyebrow: "Lease Activated",
        headline: "Your lease is active.",
        paragraphs: [
          `Good news: your lease for ${propertyName} is active in AvenueBoard.`,
          "You can now view lease details, documents, payment information, and property updates in your tenant portal.",
        ],
        ctaLabel: "View Lease",
        ctaHref: tenantUrl(),
        details: [
          { label: "Property", value: propertyName },
          { label: "Tenant", value: tenantName },
        ],
      }),
    },
    tenant_accepted_landlord_notification: {
      subject: `${tenantName} accepted your AvenueBoard invite`,
      text: `${tenantName} accepted the AvenueBoard invitation for ${propertyName}. Their tenant workspace is now active. ${dashboardUrl()}`,
      html: EmailActionNotice({
        preview: "Tenant onboarding is complete.",
        title: "Tenant invite accepted",
        eyebrow: "Invite Accepted",
        headline: "Tenant onboarding is complete.",
        paragraphs: [
          `${tenantName} accepted the AvenueBoard invitation for ${propertyName}.`,
          "Their tenant workspace is active, and both sides can stay aligned around lease information, documents, and rental activity.",
        ],
        ctaLabel: "View Lease",
        ctaHref: dashboardUrl(),
        details: [
          { label: "Tenant", value: tenantName },
          { label: "Property", value: propertyName },
        ],
      }),
    },
  };

  return templates[eventType];
}
