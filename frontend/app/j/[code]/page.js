import { redirect } from "next/navigation";

// Invite links look like /j/8123456789 (like Zoom's zoom.us/j/...). Send them to the meeting page.
export default async function InviteLinkPage({ params }) {
  const { code } = await params;
  redirect(`/meeting/${code}`);
}
