import Link from "next/link";

/** Centered message filling its container: loading, meeting ended, removed by host, or invalid meeting. */
export default function StatusScreen({ title, message, showHomeButton = true }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white">
      <h1 className="text-2xl font-bold">{title}</h1>
      {message && <p className="max-w-md text-white/70">{message}</p>}
      {showHomeButton && (
        <Link href="/" className="btn-primary mt-4 px-6 py-2.5">
          Return to Home
        </Link>
      )}
    </div>
  );
}
