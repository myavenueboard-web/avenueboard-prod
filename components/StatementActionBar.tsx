"use client";

import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

type StatementActionBarProps = {
  backHref: string;
  backLabel: string;
  downloadLabel: string;
  onDownload?: () => void;
};

export default function StatementActionBar({
  backHref,
  backLabel,
  downloadLabel,
  onDownload,
}: StatementActionBarProps) {
  return (
    <div className="mb-2 flex w-full items-center justify-between gap-3 print:hidden">
      <Link
        href={backHref}
        className="inline-flex cursor-pointer items-center gap-2 text-[14px] font-semibold text-zinc-900 transition hover:opacity-70 hover:underline hover:underline-offset-4"
      >
        <ArrowLeft className="h-5 w-5" />
        {backLabel}
      </Link>

      {onDownload && (
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-950 px-5 text-[13px] font-semibold text-white transition hover:bg-slate-800"
        >
          <Download className="h-4 w-4" />
          {downloadLabel}
        </button>
      )}
    </div>
  );
}
