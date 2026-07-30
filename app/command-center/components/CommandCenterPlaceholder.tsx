export default function CommandCenterPlaceholder({
  title,
}: {
  title: string;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_12px_40px_rgba(15,23,42,0.035)]">
      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Coming in Phase 2
      </p>
      <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.06em] text-slate-950">
        {title}
      </h2>
      <p className="mt-3 max-w-[620px] text-[14px] font-medium leading-6 text-slate-500">
        This Command Center module is intentionally a safe placeholder in Phase
        1. No production records, actions, or destructive workflows are exposed
        here yet.
      </p>
    </section>
  );
}
