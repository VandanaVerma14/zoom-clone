import { avatarColor, initials } from "@/lib/format";

/** Round coloured circle with the person's initials. */
export default function Avatar({ name, size = 40, className = "" }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{ width: size, height: size, backgroundColor: avatarColor(name), fontSize: size * 0.4 }}
    >
      {initials(name)}
    </div>
  );
}
