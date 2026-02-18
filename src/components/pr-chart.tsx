"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function PRChart({ data }: { data: { date: string; e1rm: number }[] }) {
  if (!data.length) return <p className="text-xs text-zinc-500">No trend data yet.</p>;

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.slice(-12)}>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} hide />
          <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
          <Tooltip />
          <Line type="monotone" dataKey="e1rm" stroke="#e4e4e7" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
