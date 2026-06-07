"use client";

import { useMemo, useState } from "react";
import {
  Copy,
  Download,
  Maximize2,
  Monitor,
  Printer,
  Smartphone,
  X,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/AdminCommandComponents";
import { renderEmailTemplate } from "@/lib/email/templates";
import type { EmailEventType, EmailPayload } from "@/lib/email/types";

type PreviewTemplate = {
  eventType: EmailEventType;
  label: string;
  description: string;
};

const templates: PreviewTemplate[] = [
  {
    eventType: "landlord_welcome",
    label: "Landlord Welcome",
    description: "First email after landlord account creation.",
  },
  {
    eventType: "tenant_welcome",
    label: "Tenant Welcome",
    description: "Sent when a tenant workspace is ready.",
  },
  {
    eventType: "add_first_property_reminder",
    label: "Add Property Reminder",
    description: "Reminder for landlords who have not created a property.",
  },
  {
    eventType: "tenant_invitation",
    label: "Tenant Invitation",
    description: "Initial tenant invite with accept link.",
  },
  {
    eventType: "tenant_invite_reminder_24h",
    label: "24h Reminder",
    description: "Friendly first reminder for an open invite.",
  },
  {
    eventType: "tenant_invite_reminder_48h",
    label: "48h Reminder",
    description: "Second invite reminder.",
  },
  {
    eventType: "tenant_invite_reminder_72h",
    label: "72h Reminder",
    description: "Final invite reminder.",
  },
  {
    eventType: "lease_activated",
    label: "Lease Activated",
    description: "Tenant notification when lease access is active.",
  },
  {
    eventType: "tenant_accepted_landlord_notification",
    label: "Tenant Accepted",
    description: "Landlord notification after tenant accepts.",
  },
];

const mockPayload: EmailPayload = {
  landlordName: "Jashwanth Mummareddy",
  tenantName: "Aneela Mummareddy",
  propertyName: "Aneela's Home",
  propertyAddress: "123 Main Street, Naperville, IL",
  monthlyRent: "$2,800",
  leaseDates: "Jun 1, 2026 - May 31, 2027",
  inviteLink: "https://avenueboard.com/tenant/accept-invite?token=preview",
};

function filenameForTemplate(template: PreviewTemplate) {
  return `avenueboard-${template.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}.html`;
}

export default function EmailPreviewPage() {
  const [selectedEventType, setSelectedEventType] =
    useState<EmailEventType>("landlord_welcome");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [showFullScreenPreview, setShowFullScreenPreview] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle"
  );

  const selectedTemplate = templates.find(
    (template) => template.eventType === selectedEventType
  ) || templates[0];

  const renderedEmail = useMemo(
    () => renderEmailTemplate(selectedEventType, mockPayload),
    [selectedEventType]
  );

  const previewWidth = viewport === "desktop" ? 720 : 390;
  const downloadFilename = filenameForTemplate(selectedTemplate);

  function handleDownloadHtml() {
    const blob = new Blob([renderedEmail.html], {
      type: "text/html;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = downloadFilename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function handleCopyHtml() {
    try {
      await navigator.clipboard.writeText(renderedEmail.html);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch {
      setCopyStatus("failed");
      window.setTimeout(() => setCopyStatus("idle"), 2200);
    }
  }

  function handlePrintEmail() {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      return;
    }

    printWindow.document.open();
    printWindow.document.write(renderedEmail.html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Internal QA"
        title="Email Preview Center"
        description="Review Wave 1 AvenueBoard email templates in-browser using realistic mock data. No emails are sent from this page."
      />

      <div className="grid min-h-[calc(100vh-145px)] grid-cols-[280px_1fr] border-t border-zinc-100">
        <aside className="border-r border-zinc-200 bg-white p-4">
          <label
            htmlFor="email-template"
            className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500"
          >
            Select Email Template
          </label>

          <select
            id="email-template"
            value={selectedEventType}
            onChange={(event) =>
              setSelectedEventType(event.target.value as EmailEventType)
            }
            className="mb-5 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-400"
          >
            {templates.map((template) => (
              <option key={template.eventType} value={template.eventType}>
                {template.label}
              </option>
            ))}
          </select>

          <div className="space-y-1">
            {templates.map((template) => {
              const active = template.eventType === selectedEventType;

              return (
                <button
                  key={template.eventType}
                  onClick={() => setSelectedEventType(template.eventType)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left transition ${
                    active
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                  }`}
                >
                  <span className="block text-sm font-semibold">
                    {template.label}
                  </span>
                  <span
                    className={`mt-0.5 block text-xs leading-5 ${
                      active ? "text-zinc-300" : "text-zinc-500"
                    }`}
                  >
                    {template.description}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 bg-zinc-50">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-950">
                {selectedTemplate.label}
              </p>
              <p className="mt-1 truncate text-xs text-zinc-500">
                Subject: {renderedEmail.subject}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="flex rounded-lg border border-zinc-200 bg-white p-1">
                <button
                  onClick={() => setViewport("desktop")}
                  className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold transition ${
                    viewport === "desktop"
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  <Monitor size={14} />
                  Desktop Width
                </button>
                <button
                  onClick={() => setViewport("mobile")}
                  className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold transition ${
                    viewport === "mobile"
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  <Smartphone size={14} />
                  Mobile Width
                </button>
              </div>

              <button
                onClick={() => setShowFullScreenPreview(true)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                <Maximize2 size={14} />
                Full Screen Preview
              </button>
              <button
                onClick={handleDownloadHtml}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                <Download size={14} />
                Download HTML
              </button>
              <button
                onClick={handlePrintEmail}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                <Printer size={14} />
                Print / Save as PDF
              </button>
              <button
                onClick={handleCopyHtml}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                <Copy size={14} />
                {copyStatus === "copied"
                  ? "Copied"
                  : copyStatus === "failed"
                    ? "Copy Failed"
                    : "Copy HTML"}
              </button>
            </div>
          </div>

          <div className="overflow-auto p-6">
            <div
              className="mx-auto rounded-2xl border border-zinc-200 bg-white shadow-sm"
              style={{ width: previewWidth }}
            >
              <div className="border-b border-zinc-100 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                  Live Template Preview
                </p>
              </div>
              <iframe
                title={`${selectedTemplate.label} preview`}
                srcDoc={renderedEmail.html}
                className="h-[820px] w-full rounded-b-2xl bg-white"
                sandbox=""
              />
            </div>
          </div>
        </main>
      </div>

      {showFullScreenPreview ? (
        <div className="fixed inset-0 z-50 bg-zinc-100">
          <div className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-950">
                {selectedTemplate.label}
              </p>
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {downloadFilename}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-zinc-200 bg-white p-1">
                <button
                  onClick={() => setViewport("desktop")}
                  className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold transition ${
                    viewport === "desktop"
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  <Monitor size={14} />
                  Desktop
                </button>
                <button
                  onClick={() => setViewport("mobile")}
                  className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold transition ${
                    viewport === "mobile"
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  <Smartphone size={14} />
                  Mobile
                </button>
              </div>

              <button
                onClick={handleDownloadHtml}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                <Download size={14} />
                HTML
              </button>
              <button
                onClick={handlePrintEmail}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                <Printer size={14} />
                Print
              </button>
              <button
                onClick={() => setShowFullScreenPreview(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-950"
                aria-label="Close full screen preview"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="h-[calc(100vh-64px)] overflow-auto p-6">
            <div
              className="mx-auto overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200"
              style={{ width: previewWidth }}
            >
              <iframe
                title={`${selectedTemplate.label} full screen preview`}
                srcDoc={renderedEmail.html}
                className="h-[calc(100vh-112px)] w-full bg-white"
                sandbox=""
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
