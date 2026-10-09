"use client";

import { CircleDot, FileText, PencilLine, Plus, VideoOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ActionTile from "@/components/ActionTile";
import AppShell from "@/components/AppShell";
import ClockCard from "@/components/ClockCard";
import FeatureCard from "@/components/FeatureCard";
import JoinModal from "@/components/JoinModal";
import MeetingSection from "@/components/MeetingSection";
import ScheduleModal from "@/components/ScheduleModal";
import Toast from "@/components/Toast";
import { api } from "@/lib/api";

/** Home dashboard: clock, action buttons, feature shortcuts, upcoming and recent meetings. */
export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [modal, setModal] = useState(null); // "join" | "schedule" | null
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [me, up, rec] = await Promise.all([api.getMe(), api.getUpcoming(), api.getRecent()]);
      setUser(me);
      setUpcoming(up);
      setRecent(rec);
      setLoadFailed(false);
      setError("");
    } catch {
      setLoadFailed(true);
      setError("Could not reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function showToast(text) {
    setToast(text);
    setTimeout(() => setToast(""), 2500);
  }
  const comingSoon = () => showToast("Coming soon");

  async function handleNewMeeting() {
    setCreating(true);
    try {
      const meeting = await api.createInstantMeeting();
      router.push(`/meeting/${meeting.meeting_code}?host=1`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  function handleStart(meeting) {
    router.push(`/meeting/${meeting.meeting_code}?host=1`);
  }

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-[750px] space-y-8 px-4 pt-10 sm:pt-16">
        <ClockCard />

        <div className="flex justify-center gap-8 sm:gap-11">
          <ActionTile
            icon={<VideoOff size={34} fill="white" strokeWidth={1.6} />}
            label="New meeting"
            color="orange"
            onClick={handleNewMeeting}
            disabled={creating}
            menu={[
              { label: "Start meeting", onClick: handleNewMeeting },
              { label: "Copy my meeting link", onClick: comingSoon },
            ]}
          />
          <ActionTile
            icon={
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
                <Plus size={22} strokeWidth={3} className="text-zoom-blue" />
              </span>
            }
            label="Join"
            onClick={() => setModal("join")}
          />
          <ActionTile icon={<CalendarDayIcon />} label="Schedule" onClick={() => setModal("schedule")} />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-zoom-danger">{error}</p>}

        <div className="grid gap-3 sm:grid-cols-3 sm:gap-5">
          <FeatureCard icon={CircleDot} label="Recordings" iconClass="bg-red-50 text-red-600" onClick={comingSoon} />
          <FeatureCard icon={FileText} label="Summaries" iconClass="bg-purple-50 text-purple-600" onClick={comingSoon} />
          <FeatureCard icon={PencilLine} label="My Notes" iconClass="bg-blue-50 text-blue-600" onClick={comingSoon} />
        </div>

        <MeetingSection
          title="Upcoming meetings"
          meetings={upcoming}
          loading={loading}
          failed={loadFailed}
          variant="upcoming"
          emptyText="No upcoming meetings. Click Schedule to add one."
          onStart={handleStart}
        />
        <MeetingSection
          title="Recent meetings"
          meetings={recent}
          loading={loading}
          failed={loadFailed}
          variant="recent"
          emptyText="No recent meetings yet."
        />
      </div>

      {toast && <Toast text={toast} />}
      {modal === "join" && <JoinModal defaultName={user?.name} onClose={() => setModal(null)} />}
      {modal === "schedule" && (
        <ScheduleModal userName={user?.name} onClose={() => setModal(null)} onScheduled={loadData} />
      )}
    </AppShell>
  );
}

/** White calendar page showing today's date number (set after mount to avoid a server/client mismatch). */
function CalendarDayIcon() {
  const [day, setDay] = useState("");
  useEffect(() => setDay(String(new Date().getDate())), []);
  return (
    <span className="relative flex h-8 w-8 items-end justify-center rounded-lg bg-white pb-1 text-sm font-bold leading-none text-zoom-blue">
      <span className="absolute inset-x-1.5 top-1.5 h-0.5 rounded bg-zoom-blue" />
      {day}
    </span>
  );
}
