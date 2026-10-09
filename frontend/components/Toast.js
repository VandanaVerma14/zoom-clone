/** Small dark message at the bottom of the screen. Render it only while there is text. */
export default function Toast({ text }) {
  return (
    <div
      role="status"
      className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-black/85 px-4 py-2 text-sm text-white shadow-lg sm:bottom-6"
    >
      {text}
    </div>
  );
}
