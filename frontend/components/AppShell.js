import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

/**
 * The Zoom Workplace frame shared by every page: top Navbar + left Sidebar + main area.
 *
 * - default: a scrolling page whose content sits on a white rounded panel (home dashboard).
 * - fill:    exactly one screen tall with no page scroll; the child fills the main area
 *            (meeting room). The sidebar is hidden on phones to leave room for the meeting.
 */
export default function AppShell({ user, activeNav = "Home", fill = false, children }) {
  if (fill) {
    return (
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#F5F6F8]">
        <Navbar user={user} />
        <div className="flex min-h-0 flex-1">
          <Sidebar active={activeNav} hideOnMobile />
          <main className="min-w-0 flex-1 sm:pb-1.5 sm:pr-1.5 sm:pt-1.5">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <Navbar user={user} />
      <div className="flex">
        <Sidebar active={activeNav} />
        <main className="min-h-[calc(100vh-4rem)] min-w-0 flex-1 bg-white pb-24 sm:mb-1.5 sm:mr-1.5 sm:mt-1.5 sm:min-h-[calc(100vh-4rem-0.75rem)] sm:rounded-2xl sm:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
