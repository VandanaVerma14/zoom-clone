import { ChevronUp } from "lucide-react";

/**
 * One button of the bottom toolbar: outline icon over a label.
 * - chevron: small "^" right of the icon (visual only, like Zoom's option menus)
 * - slashed: red diagonal line over the icon (mic / camera off)
 * - badge:   small text right of the icon (participant count)
 * - alert:   red bubble with a number on the icon (unread chat events); hidden when 0
 */
export default function ToolbarButton({ icon: Icon, label, onClick, chevron, slashed, badge, alert, iconClassName = "", className = "" }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-white transition hover:bg-white/10 sm:min-w-[72px] ${className}`}
    >
      <span className="relative flex items-center">
        <span className="relative">
          <Icon size={21} strokeWidth={1.5} className={iconClassName} />
          {slashed && (
            <span className="absolute left-1/2 top-1/2 h-[2px] w-[27px] -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-[#E8364B]" />
          )}
          {alert > 0 && (
            <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E8364B] px-1 text-[10px] font-bold leading-none">
              {alert}
            </span>
          )}
        </span>
        {badge !== undefined && <span className="ml-1 self-start text-[10px] text-gray-300">{badge}</span>}
        {chevron && <ChevronUp size={10} strokeWidth={2.5} className="ml-2 hidden text-gray-200 sm:block" />}
      </span>
      <span className="hidden whitespace-nowrap text-[11px] sm:block">{label}</span>
    </button>
  );
}
