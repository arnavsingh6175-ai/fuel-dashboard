"use client";
import React from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar,
} from "recharts";

const COLORS = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#F59E0B", "#06B6D4", "#EC4899"];

interface ChartProps {
  data: Record<string, unknown>[];
  title: string;
  dark?: boolean;
}

const textColor = (dark?: boolean) => dark ? "#94a3b8" : "#6B7280";
const gridColor = (dark?: boolean) => dark ? "#334155" : "#E5E7EB";

function fmt(v: number): string {
  if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
  if (v >= 1000) return (v / 1000).toFixed(1) + "K";
  return v.toFixed(0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFmt = (v: any) => fmt(Number(v));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFmtDollar = (v: any) => "$" + fmt(Number(v));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFmtLiters = (v: any) => fmt(Number(v)) + " L";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFmtEfficiency = (v: any) => Number(v).toFixed(2) + " L/hr";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFmtPct = (v: any) => Number(v).toFixed(2) + "%";

export function MonthlyConsumptionChart({ data, title, dark }: ChartProps) {
  return (
    <div className="chart-container">
      <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor(dark)} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: textColor(dark) }} />
          <YAxis tick={{ fontSize: 11, fill: textColor(dark) }} tickFormatter={fmt} />
          <Tooltip formatter={tooltipFmt} />
          <Legend />
          <Line type="monotone" dataKey="consumed" stroke="#F97316" strokeWidth={2.5} dot={{ r: 4 }} name="Consumed (L)" />
          <Line type="monotone" dataKey="cost" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Cost ($)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyUsageChart({ data, title, dark }: ChartProps) {
  return (
    <div className="chart-container">
      <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorConsumed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorIssued" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor(dark)} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: textColor(dark) }} />
          <YAxis tick={{ fontSize: 11, fill: textColor(dark) }} tickFormatter={fmt} />
          <Tooltip formatter={tooltipFmt} />
          <Legend />
          <Area type="monotone" dataKey="consumed" stroke="#F97316" fill="url(#colorConsumed)" strokeWidth={2} name="Consumed" />
          <Area type="monotone" dataKey="issued" stroke="#3B82F6" fill="url(#colorIssued)" strokeWidth={2} name="Issued" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeeklyConsumptionChart({ data, title, dark }: ChartProps) {
  return (
    <div className="chart-container">
      <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor(dark)} />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: textColor(dark) }} />
          <YAxis tick={{ fontSize: 11, fill: textColor(dark) }} tickFormatter={fmt} />
          <Tooltip formatter={tooltipFmt} />
          <Bar dataKey="consumed" fill="#F97316" radius={[4, 4, 0, 0]} name="Consumed (L)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SiteConsumptionChart({ data, title, dark }: ChartProps) {
  return (
    <div className="chart-container">
      <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor(dark)} />
          <XAxis type="number" tick={{ fontSize: 11, fill: textColor(dark) }} tickFormatter={fmt} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: textColor(dark) }} width={120} />
          <Tooltip formatter={tooltipFmt} />
          <Bar dataKey="consumed" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Consumed (L)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EquipmentRankingChart({ data, title, dark }: ChartProps) {
  return (
    <div className="chart-container">
      <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">{title}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor(dark)} />
          <XAxis type="number" tick={{ fontSize: 11, fill: textColor(dark) }} tickFormatter={fmt} />
          <YAxis type="category" dataKey="equipment_id" tick={{ fontSize: 10, fill: textColor(dark) }} width={80} />
          <Tooltip formatter={tooltipFmt} />
          <Bar dataKey="consumed" radius={[0, 4, 4, 0]} name="Consumed (L)">
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CostTrendChart({ data, title, dark }: ChartProps) {
  return (
    <div className="chart-container">
      <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor(dark)} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: textColor(dark) }} />
          <YAxis tick={{ fontSize: 11, fill: textColor(dark) }} tickFormatter={(v) => "$" + fmt(v)} />
          <Tooltip formatter={tooltipFmtDollar} />
          <Line type="monotone" dataKey="cost" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} name="Cost ($)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EfficiencyChart({ data, title, dark }: ChartProps) {
  return (
    <div className="chart-container">
      <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor(dark)} />
          <XAxis dataKey="equipment_type" tick={{ fontSize: 10, fill: textColor(dark) }} angle={-20} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11, fill: textColor(dark) }} />
          <Tooltip formatter={tooltipFmtEfficiency} />
          <Bar dataKey="avg_efficiency" radius={[4, 4, 0, 0]} name="Efficiency (L/hr)">
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SupplierChart({ data, title, dark }: ChartProps) {
  return (
    <div className="chart-container">
      <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor(dark)} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: textColor(dark) }} angle={-15} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11, fill: textColor(dark) }} tickFormatter={fmt} />
          <Tooltip formatter={tooltipFmt} />
          <Legend />
          <Bar dataKey="total_supplied" fill="#F97316" radius={[4, 4, 0, 0]} name="Total Supplied (L)" />
          <Bar dataKey="deliveries" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Deliveries" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FuelDistributionChart({ data, title }: ChartProps) {
  return (
    <div className="chart-container">
      <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={90} dataKey="consumed" nameKey="fuel_type" label>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={tooltipFmtLiters} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FuelLossDonutChart({ data, title }: { data: { name: string; value: number }[]; title: string; dark?: boolean }) {
  return (
    <div className="chart-container">
      <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label>
            <Cell fill="#10B981" />
            <Cell fill="#EF4444" />
          </Pie>
          <Tooltip formatter={tooltipFmtPct} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GaugeChart({ value, max, title, dark }: { value: number; max: number; title: string; dark?: boolean }) {
  const pct = Math.min((value / (max || 1)) * 100, 100);
  const gaugeData = [{ name: "Stock", value: pct, fill: pct > 30 ? "#10B981" : pct > 15 ? "#F59E0B" : "#EF4444" }];
  return (
    <div className="chart-container">
      <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={gaugeData} startAngle={180} endAngle={0}>
          <RadialBar dataKey="value" cornerRadius={10} background={{ fill: dark ? "#334155" : "#E5E7EB" }} />
          <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold" fill={dark ? "#E2E8F0" : "#1F2937"}>
            {fmt(value)} L
          </text>
          <text x="50%" y="65%" textAnchor="middle" dominantBaseline="middle" className="text-xs" fill={textColor(dark)}>
            {pct.toFixed(0)}% Capacity
          </text>
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
}
