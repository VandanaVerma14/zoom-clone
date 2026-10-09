"use client";

import { useEffect, useState } from "react";

/** Big live time with today's date under it, centered at the top of the home page. */
export default function ClockCard() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center">
      <p className="text-5xl font-bold tracking-tight text-zoom-text sm:text-[56px] sm:leading-tight">
        {now ? now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : " "}
      </p>
      <p className="mt-1 text-lg text-gray-500">
        {now ? now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }) : " "}
      </p>
    </div>
  );
}
