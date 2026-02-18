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
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.25)", strokeWidth: 1 }}
            contentStyle={{
              background: "rgba(8, 8, 10, 0.96)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "12px",
              color: "#f4f4f5",
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.45)",
            }}
            labelStyle={{ color: "#d4d4d8", fontSize: 12 }}
            itemStyle={{ color: "#ffffff", fontSize: 12 }}
          />
          <Line type="monotone" dataKey="e1rm" stroke="#e4e4e7" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
