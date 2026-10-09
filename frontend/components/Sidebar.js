"use client";

import { ContactRound, House, MessagesSquare, Settings, Video } from "lucide-react";

const ITEMS = [
  { label: "Home", icon: House },
  { label: "Chat", icon: MessagesSquare },
  { label: "Meetings", icon: Video },
  { label: "Contacts", icon: ContactRound },
];

/**
 * Left navigation (only Home is functional). `active` is the highlighted item's label, if any.
 * On phones it becomes a tab bar fixed to the bottom of the screen, or is hidden (hideOnMobile).
 */
export default function Sidebar({ active, hideOnMobile = false }) {
  return (
    <nav className={`fixed inset-x-0 bottom-0 z-30 ${hideOnMobile ? "hidden sm:flex" : "flex"} justify-around border-t border-gray-200 bg-[#F5F6F8] py-1 sm:sticky sm:top-16 sm:h-[calc(100vh-4rem)] sm:w-20 sm:shrink-0 sm:flex-col sm:justify-start sm:gap-1 sm:border-none sm:px-1.5 sm:py-1.5`}>
      {ITEMS.map((item) => (
        <SidebarItem key={item.label} {...item} active={item.label === active} />
      ))}
      <div className="sm:mt-auto">
        <SidebarItem label="Settings" icon={Settings} />
      </div>
    </nav>
  );
}

function SidebarItem({ label, icon: Icon, active }) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={`flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] text-gray-700 transition ${
        active ? "bg-white font-bold text-zoom-text shadow-sm" : "hover:bg-white/70"
      }`}
    >
      <Icon size={16} strokeWidth={1.8} />
      {label}
    </button>
  );
}
