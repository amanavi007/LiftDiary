"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { date: string; e1rm: number };

function shortDate(iso: string) {
  const d = new Date(iso); // rendered in the viewer's local time zone
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function PRChart({ data, unit }: { data: Point[]; unit: string }) {
  if (!data.length) return <p className="text-xs text-muted">No trend data yet.</p>;
  if (data.length === 1) {
    return (
      <p className="text-xs text-muted-2">
        One session so far ({data[0].e1rm} {unit} est. 1RM). The trend line appears after your second session.
      </p>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.slice(-16)} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#23252b" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fontSize: 10, fill: "#7b7d86" }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#7b7d86" }}
            domain={["auto", "auto"]}
            allowDecimals={false}
            tickFormatter={(v) => String(Math.round(Number(v)))}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: "#23252b", strokeWidth: 1 }}
            contentStyle={{
              background: "#181a1f",
              border: "1px solid #23252b",
              borderRadius: 12,
              color: "#ece9e4",
            }}
            labelFormatter={(label) => shortDate(String(label))}
            formatter={(value) => [`${value} ${unit}`, "Est. 1RM"]}
          />
          <Line
            type="monotone"
            dataKey="e1rm"
            isAnimationActive={false}
            stroke="#c6ff3d"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#c6ff3d", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#c6ff3d" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
