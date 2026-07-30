"use client";

import { Info } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type PricingDisclosureTooltipProps = {
  label: string;
  tooltip:
    | string
      | {
          intro: string;
        items: readonly string[];
          note: string;
        };
};

export function PricingDisclosureTooltip({ label, tooltip }: PricingDisclosureTooltipProps) {
  const tooltipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      setPosition({
        left: rect.left + rect.width / 2,
        top: rect.bottom + 10,
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!buttonRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-expanded={isOpen}
        onBlur={() => setIsOpen(false)}
        onClick={() => setIsOpen((current) => !current)}
        onFocus={() => setIsOpen(true)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="inline-flex size-4 items-center justify-center rounded-full text-[#8A92A0] transition-colors hover:text-[#0F172A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]/25"
      >
        <Info size={13} strokeWidth={2} aria-hidden="true" />
      </button>
      {isOpen &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none fixed z-[80] max-w-[min(360px,calc(100vw-32px))] -translate-x-1/2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-[12px] font-normal leading-5 text-[#4B5563] shadow-[0_12px_34px_rgba(15,23,42,0.12)]"
            style={{ left: position.left, top: position.top }}
          >
            {typeof tooltip === "string" ? (
              tooltip
            ) : (
              <span className="block">
                <span className="block">{tooltip.intro}</span>
                <span className="mt-2 block space-y-1">
                  {tooltip.items.map((item) => (
                    <span key={item} className="block">
                      • {item}
                    </span>
                  ))}
                </span>
                <span className="mt-2 block">{tooltip.note}</span>
              </span>
            )}
          </span>,
          document.body,
        )}
    </>
  );
}
