const VARIANTS = {
  dark: "bg-[#1F2023] text-white",
  grey: "bg-[#55595F] text-white",
  light: "border border-gray-300 bg-white text-zoom-text shadow-sm",
};

/**
 * Wraps a button and shows a small label under it while hovered or focused (CSS only).
 * align "center" centers the label under the button, "right" lines it up with the right edge
 * (for buttons at the edge of the screen).
 */
export default function HoverTip({ label, variant = "dark", align = "center", children }) {
  const position = align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute top-full z-40 mt-2 whitespace-nowrap rounded-md px-2 py-1 text-xs opacity-0 transition-opacity delay-150 group-focus-within:opacity-100 group-hover:opacity-100 ${position} ${VARIANTS[variant]}`}
      >
        {label}
      </span>
    </span>
  );
}
