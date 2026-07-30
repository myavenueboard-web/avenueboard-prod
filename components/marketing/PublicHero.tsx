import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type PublicHeroAction = {
  label: string;
  href: string;
  icon?: LucideIcon;
  variant?: "primary" | "secondary";
};

type PublicHeroProps = {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  descriptionClassName?: string;
  primaryAction?: PublicHeroAction;
  secondaryAction?: PublicHeroAction;
};

export function PublicHero({
  eyebrow,
  title,
  description,
  descriptionClassName = "max-w-[700px]",
  primaryAction,
  secondaryAction,
}: PublicHeroProps) {
  const actions = [primaryAction, secondaryAction].filter(
    Boolean,
  ) as PublicHeroAction[];

  return (
    <section className="mx-auto max-w-[1600px] px-6 sm:px-10 lg:px-16">
      <div className="pt-32 text-center lg:pt-40">
        <div className="mx-auto max-w-[880px]">
          <p className="mb-8 text-[20px] font-medium tracking-[-0.01em] text-[#4B4E5A] sm:text-[22px]">
            {eyebrow}
          </p>

          <h1 className="text-[54px] font-medium leading-[0.98] tracking-[-0.055em] text-black sm:text-[72px]">
            {title}
          </h1>

          <p
            className={`mx-auto mt-9 text-[18px] leading-[1.65] text-[#555966] sm:text-[20px] ${descriptionClassName}`}
          >
            {description}
          </p>

          {actions.length > 0 && (
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
              {actions.map((action) => {
                const Icon = action.icon;
                const variant = action.variant ?? "primary";

                return (
                  <Link
                    key={`${action.href}-${action.label}`}
                    href={action.href}
                    className={
                      variant === "primary"
                        ? "inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-8 py-4 text-[16px] font-semibold text-white transition-all hover:bg-[#1D4ED8]"
                        : "inline-flex items-center gap-2 text-[17px] font-semibold text-[#2563EB] transition-colors hover:text-[#1D4ED8]"
                    }
                  >
                    {action.label}
                    {Icon && <Icon size={variant === "primary" ? 16 : 18} />}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
