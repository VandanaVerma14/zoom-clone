"use client";

import { Bell, ChevronDown, ChevronLeft, ChevronRight, History, Search } from "lucide-react";
import { initials } from "@/lib/format";
import HoverTip from "./HoverTip";

// Text links: grey rounded box + blue text on hover, like Zoom Workplace
const TEXT_LINK = "rounded-lg px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 hover:text-zoom-blue";

/** Top bar of the home page, styled like Zoom Workplace. Everything except the logo is a placeholder. */
export default function Navbar({ user }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:gap-5">
      {/* Wordmark */}
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-[22px] font-black tracking-tight text-zoom-blue">zoomclone</span>
        <span className="hidden h-6 w-px bg-gray-300 sm:block" />
        <span className="hidden text-[22px] text-zoom-text sm:block">Workplace</span>
      </div>

      <nav className="hidden shrink-0 items-center gap-2 xl:flex">
        <button className={`flex items-center gap-1 ${TEXT_LINK}`}>
          Discover Products <ChevronDown size={16} />
        </button>
        <button className={TEXT_LINK}>Pricing</button>
      </nav>

      <div className="hidden shrink-0 items-center gap-1 text-gray-400 md:flex">
        <ChevronLeft size={18} />
        <ChevronRight size={18} />
        <HoverTip label="History" variant="dark">
          <button
            aria-label="History"
            className="rounded-md p-1 text-gray-600 transition hover:bg-gray-100 hover:text-zoom-blue"
          >
            <History size={16} />
          </button>
        </HoverTip>
      </div>

      {/* Search */}
      <label className="relative hidden min-w-0 max-w-xl flex-1 items-center md:flex">
        <Search size={16} className="absolute left-3 text-gray-500" />
        <input
          placeholder="Search Ctrl+K"
          className="h-8 w-full rounded-lg bg-gray-100 pl-9 pr-3 text-center text-sm outline-none placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-zoom-blue/30"
        />
      </label>

      {/* Right side */}
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <button className={`hidden lg:block ${TEXT_LINK}`}>Admin Center</button>
        <button className="hidden rounded-full bg-[#EAF1FF] px-4 py-1.5 text-sm text-zoom-blue hover:bg-[#dce8ff] lg:block">
          Download
        </button>
        <button className="rounded-full bg-zoom-blue px-4 py-1.5 text-sm font-bold text-white hover:bg-[#0849cc]">
          Upgrade
        </button>
        <HoverTip label="Activity Center" variant="light">
          <button aria-label="Activity Center" className="rounded-full p-2 text-gray-600 transition hover:bg-gray-100">
            <Bell size={16} />
          </button>
        </HoverTip>
        <HoverTip label="Profile" variant="grey" align="right">
          <button aria-label="Profile" className="relative block">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3D4451] text-xs font-bold text-white">
              {initials(user?.name || "")}
            </span>
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
          </button>
        </HoverTip>
      </div>
    </header>
  );
}
