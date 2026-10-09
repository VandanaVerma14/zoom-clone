/** White card with a small tinted icon circle and a bold label (Recordings, Summaries, My Notes). */
export default function FeatureCard({ icon: Icon, label, iconClass, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 text-left transition hover:bg-gray-50"
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
        <Icon size={20} />
      </span>
      <span className="text-base font-bold text-zoom-text">{label}</span>
    </button>
  );
}
