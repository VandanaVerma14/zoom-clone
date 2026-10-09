import { Suspense } from "react";
import MeetingRoom from "@/components/meeting/MeetingRoom";
import StatusScreen from "@/components/meeting/StatusScreen";

// /meeting/8123456789 : the meeting room page
export default function MeetingPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-[#1C1C1C]">
          <StatusScreen title="Connecting..." showHomeButton={false} />
        </div>
      }
    >
      <MeetingRoom />
    </Suspense>
  );
}
