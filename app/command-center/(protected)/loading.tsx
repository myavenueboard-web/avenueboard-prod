export default function CommandCenterLoading() {
  return (
    <div className="space-y-5">
      <div className="h-[170px] animate-pulse rounded-[28px] bg-slate-100" />
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-[260px] animate-pulse rounded-[28px] bg-slate-100"
          />
        ))}
      </div>
    </div>
  );
}
