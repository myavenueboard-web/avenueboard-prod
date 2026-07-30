"use client";

export default function CommandCenterError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_12px_40px_rgba(15,23,42,0.035)]">
      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Command Center
      </p>
      <h2 className="mt-3 text-[24px] font-semibold tracking-[-0.045em] text-slate-950">
        This view could not be loaded.
      </h2>
      <p className="mx-auto mt-2 max-w-[460px] text-[14px] font-medium leading-6 text-slate-500">
        Please try again. Technical details are intentionally hidden from this
        internal UI.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-2xl bg-slate-950 px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-slate-800"
      >
        Retry
      </button>
    </section>
  );
}
