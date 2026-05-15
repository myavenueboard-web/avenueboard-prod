import { Megaphone, TrendingUp, Users } from "lucide-react";

export default function MarketingAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-[#e7dfe2] bg-white p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#CA6180]">
          Marketing Analytics
        </p>

        <h1 className="mt-2 text-[40px] font-semibold leading-none tracking-[-0.04em] text-neutral-950">
          Campaign Performance
        </h1>

        <p className="mt-4 max-w-3xl text-[14px] leading-6 text-neutral-500">
          Marketing tracking and acquisition analytics will be enabled once
          AvenueBoard begins onboarding production landlords and tenants.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <PlaceholderCard
          icon={Megaphone}
          title="Campaign Tracking"
          description="Track ad campaigns, spend, impressions, and conversions."
        />

        <PlaceholderCard
          icon={Users}
          title="User Acquisition"
          description="Analyze landlord and tenant signup growth over time."
        />

        <PlaceholderCard
          icon={TrendingUp}
          title="Conversion Analytics"
          description="Measure onboarding performance and conversion funnels."
        />
      </div>

      <div className="rounded-[32px] border border-dashed border-[#e7dfe2] bg-[#fbf9fa] p-16 text-center">
        <p className="text-lg font-semibold text-neutral-900">
          Marketing analytics module coming soon
        </p>

        <p className="mt-3 text-sm text-neutral-500">
          This section will activate after initial production rollout and
          customer acquisition begins.
        </p>
      </div>
    </div>
  );
}

function PlaceholderCard({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-[#e7dfe2] bg-white p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#CA6180]/10 text-[#CA6180]">
        <Icon size={22} />
      </div>

      <h2 className="mt-6 text-xl font-semibold tracking-tight text-neutral-950">
        {title}
      </h2>

      <p className="mt-3 text-sm leading-6 text-neutral-500">
        {description}
      </p>
    </div>
  );
}