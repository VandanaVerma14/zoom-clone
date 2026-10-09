"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import useDismiss from "@/hooks/useDismiss";

/**
 * A rounded square button with a grey label under it (New meeting, Join, Schedule).
 * Pass `menu` ([{ label, onClick }]) to add a chevron next to the label that opens a small dropdown.
 */
export default function ActionTile({ icon, label, color = "blue", onClick, disabled, menu }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useDismiss(ref, open, useCallback(() => setOpen(false), []));

  const colors = color === "orange" ? "bg-zoom-orange hover:bg-zoom-orangeHover" : "bg-zoom-blue hover:bg-[#0849cc]";

  return (
    <div ref={ref} className="relative flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`flex h-[70px] w-[70px] items-center justify-center rounded-2xl text-white transition active:scale-95 disabled:cursor-wait disabled:opacity-60 ${colors}`}
      >
        {icon}
      </button>

      {menu ? (
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={`${label} options`}
          className="flex items-center gap-1 rounded px-1 text-[15px] text-gray-600 hover:text-zoom-text"
        >
          {label}
          <ChevronDown size={16} />
        </button>
      ) : (
        <span className="text-[15px] text-gray-600">{label}</span>
      )}

      {open && (
        <div className="absolute top-full z-20 mt-1 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          {menu.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className="block w-full px-4 py-2 text-left text-sm text-zoom-text hover:bg-gray-100"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
