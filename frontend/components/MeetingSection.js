import MeetingItem from "./MeetingItem";

/** A titled card listing meetings, with loading, error and empty states. */
export default function MeetingSection({ title, meetings, loading, failed, variant, emptyText, onStart }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
        <h2 className="text-base font-bold text-zoom-text">{title}</h2>
        {!loading && !failed && <span className="text-xs text-gray-500">{meetings.length}</span>}
      </div>

      {loading ? (
        <div className="space-y-3 p-5">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : failed ? (
        <p className="px-5 py-8 text-center text-sm text-zoom-danger">Couldn&apos;t load meetings. Is the backend running?</p>
      ) : meetings.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-500">{emptyText}</p>
      ) : (
        <ul>
          {meetings.map((m) => (
            <MeetingItem key={m.id} meeting={m} variant={variant} onStart={onStart} />
          ))}
        </ul>
      )}
    </section>
  );
}
