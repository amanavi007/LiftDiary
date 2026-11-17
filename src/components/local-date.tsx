"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

function format(iso: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", options).format(new Date(iso));
}

/** Formats a timestamp in the viewer's own time zone (the server's zone would be UTC when hosted). */
export function LocalDate({ iso, options }: { iso: string; options: Intl.DateTimeFormatOptions }) {
  const text = useSyncExternalStore(
    noopSubscribe,
    () => format(iso, options),
    () => format(iso, { ...options, timeZone: "UTC" }),
  );
  return <time dateTime={iso}>{text}</time>;
}
