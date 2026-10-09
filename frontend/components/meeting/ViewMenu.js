"use client";

import { Check, ChevronRight, Grid3x3, LayoutGrid } from "lucide-react";

const VIEWS = [
  { id: "speaker", label: "Speaker View", icon: SpeakerViewIcon },
  { id: "gallery", label: "Gallery View", icon: Grid3x3 },
  { id: "multi", label: "Multi-speaker View", icon: LayoutGrid },
];

/**
 * Zoom's "View" dropdown: layout choice, gallery options, hide options and fullscreen.
 * The parent positions it, owns all the state and closes it (outside click / Escape).
 */
export default function ViewMenu({
  view,
  onViewChange,
  hideSelf,
  onToggleHideSelf,
  hideNonVideo,
  onToggleHideNonVideo,
  fullscreen,
  onComingSoon,
  onClose,
}) {
  // Run the action, then close the menu
  const pick = (action) => () => {
    action();
    onClose();
  };

  return (
    <div
      role="menu"
      aria-label="View"
      className="absolute right-0 top-full z-30 mt-2 w-72 rounded-lg border border-white/10 bg-[#232323] py-1.5 text-sm text-white shadow-2xl"
    >
      <Group>
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <Item key={id} checked={view === id} outlined={view === id} onClick={pick(() => onViewChange(id))}>
            {label}
            <Icon size={14} className="ml-auto text-white/90" />
          </Item>
        ))}
      </Group>
      <Group>
        <Item onClick={pick(onComingSoon)}>
          Sort Gallery By
          <ChevronRight size={16} className="ml-auto text-white/70" />
        </Item>
        <Item onClick={pick(onComingSoon)}>Follow Host&apos;s Video Order</Item>
      </Group>
      <Group>
        <Item checked={hideSelf} onClick={pick(onToggleHideSelf)}>
          Hide Self View
        </Item>
        <Item checked={hideNonVideo} onClick={pick(onToggleHideNonVideo)}>
          Hide Non-video Participants
        </Item>
      </Group>
      {fullscreen.isSupported && (
        <Group>
          <Item onClick={pick(fullscreen.isFullscreen ? fullscreen.exit : fullscreen.enter)}>
            {fullscreen.isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </Item>
        </Group>
      )}
    </div>
  );
}

function Group({ children }) {
  return <div className="border-b border-white/10 py-1 last:border-none">{children}</div>;
}

function Item({ checked, outlined, onClick, children }) {
  return (
    <button
      role={checked === undefined ? "menuitem" : "menuitemcheckbox"}
      aria-checked={checked}
      onClick={onClick}
      className={`mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-white/10 ${
        outlined ? "ring-1 ring-inset ring-white/60" : ""
      }`}
    >
      <span className="w-4 shrink-0">{checked && <Check size={14} />}</span>
      {children}
    </button>
  );
}

/** Small "window" icon: two small tiles on top of one big one (Zoom's view / speaker view icon). */
export function SpeakerViewIcon({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <rect x="2" y="2.5" width="3.5" height="3" rx="0.6" />
      <rect x="6.25" y="2.5" width="3.5" height="3" rx="0.6" />
      <rect x="10.5" y="2.5" width="3.5" height="3" rx="0.6" />
      <rect x="2" y="6.5" width="12" height="7" rx="1" />
    </svg>
  );
}
