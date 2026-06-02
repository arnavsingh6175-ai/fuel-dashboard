"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  IconDashboard, IconFuel, IconBox, IconTruck, IconMap, IconSupplier,
  IconVariance, IconReport, IconSettings, IconMenu, IconX, IconBell,
  IconSun, IconMoon, IconRefresh, IconPlus, IconDownload, IconTrendUp,
  IconTrendDown, IconSearch, IconTrash, IconEdit, IconAlert, IconCheck,
} from "@/components/Icons";
import {
  MonthlyConsumptionChart, DailyUsageChart, WeeklyConsumptionChart,
  SiteConsumptionChart, EquipmentRankingChart, CostTrendChart,
  EfficiencyChart, SupplierChart, FuelDistributionChart,
  FuelLossDonutChart, GaugeChart,
} from "@/components/DashboardCharts";

/* ─── types ─── */
interface KPIs {
  totalReceived: string; totalIssued: string; totalConsumed: string;
  currentStock: string; totalCost: string; avgEfficiency: string;
  totalVariance: string; lossPercentage: string; activeSites: number;
  activeEquipment: number; theftAlerts: number; lowStockAlerts: number;
}
interface DashboardData {
  kpis: KPIs;
  charts: Record<string, Record<string, unknown>[]>;
  alerts: Record<string, unknown>[];
}
interface FuelEntry {
  id: number; date: string; site_name: string; project_name: string;
  fuel_type: string; opening_stock: string; fuel_received: string;
  supplier_name: string; fuel_issued: string; closing_stock: string;
  fuel_consumed: string; equipment_id: string; equipment_type: string;
  operator_name: string; running_hours: string; odometer_reading: string;
  fuel_efficiency: string; fuel_cost: string; variance: string; remarks: string;
}
interface RefOption { id: number; name?: string; equipment_id?: string; equipment_type?: string; }

/* ─── nav items ─── */
const NAV = [
  { key: "dashboard", label: "Dashboard", icon: IconDashboard },
  { key: "fuel-entry", label: "Fuel Entry", icon: IconFuel },
  { key: "inventory", label: "Inventory Management", icon: IconBox },
  { key: "equipment", label: "Equipment Monitoring", icon: IconTruck },
  { key: "site-analysis", label: "Site Analysis", icon: IconMap },
  { key: "supplier", label: "Supplier Analysis", icon: IconSupplier },
  { key: "variance", label: "Variance Analysis", icon: IconVariance },
  { key: "reports", label: "Reports", icon: IconReport },
  { key: "settings", label: "Settings", icon: IconSettings },
];

/* ─── helpers ─── */
function fmtNum(v: string | number): string {
  const n = Number(v);
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}
function fmtCurrency(v: string | number): string {
  return "$" + fmtNum(v);
}

/* ─── KPI Card ─── */
function KPICard({ title, value, icon, color, trend, change }: {
  title: string; value: string; icon: string; color: string; trend: "up" | "down"; change: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "blue", orange: "orange", green: "green", red: "red", purple: "purple", yellow: "yellow",
  };
  const iconBg: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600", orange: "bg-orange-50 text-orange-600",
    green: "bg-green-50 text-green-600", red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600", yellow: "bg-yellow-50 text-yellow-600",
  };
  return (
    <div className={`kpi-card ${colorMap[color] || "blue"} animate-fade-in-up`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{value}</p>
          <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trend === "up" ? "text-green-600" : "text-red-500"}`}>
            {trend === "up" ? <IconTrendUp size={14} /> : <IconTrendDown size={14} />}
            <span>{change}</span>
          </div>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${iconBg[color] || "bg-gray-50 text-gray-600"}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ─── Alert Item ─── */
function AlertItem({ alert }: { alert: Record<string, unknown> }) {
  const sevClass = alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "warning" : "info";
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
      <div className={`alert-badge ${sevClass}`}>
        {alert.severity === "critical" ? "🚨" : alert.severity === "warning" ? "⚠️" : "ℹ️"}
        {String(alert.severity).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 dark:text-gray-200">{String(alert.message)}</p>
        <p className="text-xs text-gray-400 mt-1">{String(alert.site_name || "")}</p>
      </div>
    </div>
  );
}

/* ================================================================ */
/* ─── MAIN APP ─── */
/* ================================================================ */
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Fuel entries state
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [ePage, setEPage] = useState(1);
  const [eTotal, setETotal] = useState(0);
  const [refSites, setRefSites] = useState<RefOption[]>([]);
  const [refEquipment, setRefEquipment] = useState<RefOption[]>([]);
  const [refSuppliers, setRefSuppliers] = useState<RefOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Reports state
  const [reportType, setReportType] = useState("daily");
  const [reportData, setReportData] = useState<Record<string, unknown>[]>([]);

  // Settings state
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        setDashData(data);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  // Fetch fuel entries
  const fetchEntries = useCallback(async (p = 1) => {
    try {
      const res = await fetch(`/api/fuel-entries?page=${p}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setETotal(data.total || 0);
        setEPage(p);
        setRefSites(data.sites || []);
        setRefEquipment(data.equipment || []);
        setRefSuppliers(data.suppliers || []);
      }
    } catch (e) { console.error(e); }
  }, []);

  // Fetch reports
  const fetchReports = useCallback(async (type: string) => {
    try {
      const res = await fetch(`/api/reports?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data.data || []);
      }
    } catch (e) { console.error(e); }
  }, []);

  // Seed data
  const seedData = async () => {
    setSeeding(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      await fetchDashboard();
      if (page === "fuel-entry" || page === "inventory") await fetchEntries();
    } catch (e) { console.error(e); }
    setSeeding(false);
  };

  // Delete entry
  const deleteEntry = async (id: number) => {
    await fetch(`/api/fuel-entries?id=${id}`, { method: "DELETE" });
    fetchEntries(ePage);
  };

  // Export CSV
  const exportCSV = (data: Record<string, unknown>[], filename: string) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(","), ...data.map(r => keys.map(k => `"${String(r[k] ?? "")}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // Initial load
  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => {
    if (page === "fuel-entry" || page === "inventory" || page === "equipment") fetchEntries();
    if (page === "reports") fetchReports(reportType);
  }, [page, fetchEntries, fetchReports, reportType]);

  const filteredEntries = useMemo(() => {
    if (!searchTerm) return entries;
    const s = searchTerm.toLowerCase();
    return entries.filter(e =>
      (e.site_name || "").toLowerCase().includes(s) ||
      (e.equipment_id || "").toLowerCase().includes(s) ||
      (e.fuel_type || "").toLowerCase().includes(s) ||
      (e.operator_name || "").toLowerCase().includes(s)
    );
  }, [entries, searchTerm]);

  const kpis = dashData?.kpis;
  const charts = dashData?.charts;

  /* ─── Sidebar ─── */
  const Sidebar = (
    <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-navy dark:bg-navy-dark transform transition-transform duration-200 ease-in-out
      ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} flex flex-col`}>
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange rounded-lg flex items-center justify-center text-white font-bold text-sm">FM</div>
          <div>
            <h1 className="text-white font-bold text-sm">Fuel Management</h1>
            <p className="text-gray-400 text-xs">Dashboard v2.0</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setPage(key); setSidebarOpen(false); }}
            className={`sidebar-link w-full ${page === key ? "active" : ""}`}>
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10">
        <button onClick={seedData} disabled={seeding}
          className="w-full py-2 px-4 bg-orange/20 text-orange rounded-lg text-xs font-semibold hover:bg-orange/30 transition disabled:opacity-50">
          {seeding ? "Seeding..." : "🔄 Load Sample Data"}
        </button>
      </div>
    </aside>
  );

  /* ─── Header ─── */
  const Header = (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-slate-700">
      <div className="flex items-center justify-between px-4 lg:px-6 h-14">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-gray-600 dark:text-gray-300">
            {sidebarOpen ? <IconX /> : <IconMenu />}
          </button>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
            {NAV.find(n => n.key === page)?.label || "Dashboard"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchDashboard()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition"
            title="Refresh">
            <IconRefresh size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <div className="relative">
            <button onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition relative">
              <IconBell size={18} />
              {(kpis?.theftAlerts ?? 0) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold pulse-dot">
                  {kpis?.theftAlerts}
                </span>
              )}
            </button>
            {notifOpen && dashData?.alerts && (
              <div className="absolute right-0 top-12 w-96 max-h-96 overflow-y-auto bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl p-4 space-y-2">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Notifications</h4>
                {dashData.alerts.slice(0, 8).map((a, i) => <AlertItem key={i} alert={a} />)}
              </div>
            )}
          </div>
          <button onClick={() => setDark(!dark)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition">
            {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange to-orange-dark flex items-center justify-center text-white text-xs font-bold ml-1">
            AD
          </div>
        </div>
      </div>
    </header>
  );

  /* ─── DASHBOARD PAGE ─── */
  const DashboardPage = () => {
    if (!kpis || !charts) return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-orange border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading dashboard data...</p>
          <button onClick={seedData} className="btn-primary mt-4 text-sm">Load Sample Data</button>
        </div>
      </div>
    );
    const kpiCards = [
      { title: "Total Fuel Received", value: fmtNum(kpis.totalReceived) + " L", icon: "📥", color: "blue", trend: "up" as const, change: "+4.2%" },
      { title: "Total Fuel Issued", value: fmtNum(kpis.totalIssued) + " L", icon: "📤", color: "orange", trend: "up" as const, change: "+3.8%" },
      { title: "Total Fuel Consumed", value: fmtNum(kpis.totalConsumed) + " L", icon: "🔥", color: "green", trend: "up" as const, change: "+5.1%" },
      { title: "Current Fuel Stock", value: fmtNum(kpis.currentStock) + " L", icon: "⛽", color: "purple", trend: "down" as const, change: "-2.3%" },
      { title: "Fuel Cost", value: fmtCurrency(kpis.totalCost), icon: "💰", color: "yellow", trend: "up" as const, change: "+6.7%" },
      { title: "Avg Fuel Efficiency", value: kpis.avgEfficiency + " L/hr", icon: "⚡", color: "blue", trend: "up" as const, change: "+1.5%" },
      { title: "Fuel Variance", value: fmtNum(kpis.totalVariance) + " L", icon: "📊", color: "red", trend: "down" as const, change: "-0.8%" },
      { title: "Fuel Loss %", value: kpis.lossPercentage + "%", icon: "📉", color: "red", trend: "down" as const, change: "-1.2%" },
      { title: "Active Equipment", value: String(kpis.activeEquipment), icon: "🚜", color: "green", trend: "up" as const, change: "+2" },
      { title: "Active Sites", value: String(kpis.activeSites), icon: "🏗️", color: "blue", trend: "up" as const, change: "+1" },
      { title: "Theft Alerts", value: String(kpis.theftAlerts), icon: "🚨", color: "red", trend: "down" as const, change: "-1" },
      { title: "Low Stock Alerts", value: String(kpis.lowStockAlerts), icon: "⚠️", color: "yellow", trend: "up" as const, change: "+2" },
    ];
    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {kpiCards.map((k, i) => <KPICard key={i} {...k} />)}
        </div>

        {/* Anti-Theft Alerts */}
        {(kpis.theftAlerts > 0 || kpis.lowStockAlerts > 0 || Number(kpis.lossPercentage) > 5) && (
          <div className="chart-container border-l-4 border-red-500">
            <h3 className="text-sm font-bold text-red-600 mb-3 flex items-center gap-2">
              <IconAlert className="text-red-500" /> Anti-Theft Monitoring System
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {Number(kpis.lossPercentage) > 5 && (
                <div className="alert-badge critical text-sm py-2 px-4">🚨 Possible Fuel Theft Detected - Loss &gt; 5%</div>
              )}
              {kpis.theftAlerts > 0 && (
                <div className="alert-badge critical text-sm py-2 px-4">🚨 {kpis.theftAlerts} Theft Alert{kpis.theftAlerts > 1 ? "s" : ""} Active</div>
              )}
              {kpis.lowStockAlerts > 0 && (
                <div className="alert-badge warning text-sm py-2 px-4">⛽ {kpis.lowStockAlerts} Low Stock - Reorder Required</div>
              )}
              <div className="alert-badge info text-sm py-2 px-4">ℹ️ Monitoring Active</div>
            </div>
          </div>
        )}

        {/* Row 1: Monthly + Daily */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MonthlyConsumptionChart data={charts.monthlyTrend} title="📈 Monthly Fuel Consumption Trend" dark={dark} />
          <DailyUsageChart data={charts.dailyTrend} title="📊 Daily Fuel Usage (Last 30 Days)" dark={dark} />
        </div>

        {/* Row 2: Weekly + Site */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <WeeklyConsumptionChart data={charts.weeklyTrend} title="📊 Weekly Fuel Consumption" dark={dark} />
          <SiteConsumptionChart data={charts.siteConsumption} title="🏗️ Site-wise Fuel Consumption" dark={dark} />
        </div>

        {/* Row 3: Equipment + Distribution + Loss */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <EquipmentRankingChart data={charts.equipmentConsumption} title="🚜 Top 10 Equipment by Fuel Consumption" dark={dark} />
          <FuelDistributionChart data={charts.fuelDistribution} title="⛽ Fuel Distribution by Type" dark={dark} />
          <FuelLossDonutChart
            data={[
              { name: "Effective Use", value: 100 - Math.abs(Number(kpis.lossPercentage)) },
              { name: "Fuel Loss", value: Math.abs(Number(kpis.lossPercentage)) },
            ]}
            title="📉 Fuel Loss Percentage" dark={dark}
          />
        </div>

        {/* Row 4: Cost + Efficiency + Gauge */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <CostTrendChart data={charts.costTrend} title="💰 Fuel Cost Trend (30 Days)" dark={dark} />
          <EfficiencyChart data={charts.efficiencyComparison} title="⚡ Fuel Efficiency by Equipment" dark={dark} />
          <GaugeChart value={Number(kpis.currentStock)} max={Number(kpis.totalReceived) * 0.2} title="⛽ Current Fuel Stock Level" dark={dark} />
        </div>

        {/* Row 5: Supplier */}
        <div className="grid grid-cols-1 gap-4">
          <SupplierChart data={charts.supplierPerformance} title="🏭 Supplier Performance Dashboard" dark={dark} />
        </div>

        {/* Management Summary */}
        <div className="chart-container">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">📋 Management Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="text-xs font-semibold text-blue-600 uppercase mb-2">Top Consuming Sites</h4>
              {charts.siteConsumption.slice(0, 3).map((s, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span className="text-gray-700 dark:text-gray-300">{String(s.name)}</span>
                  <span className="font-semibold text-blue-600">{fmtNum(String(s.consumed))} L</span>
                </div>
              ))}
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <h4 className="text-xs font-semibold text-orange-600 uppercase mb-2">Top Consuming Equipment</h4>
              {charts.equipmentConsumption.slice(0, 3).map((e, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span className="text-gray-700 dark:text-gray-300">{String(e.equipment_id)} ({String(e.equipment_type)})</span>
                  <span className="font-semibold text-orange-600">{fmtNum(String(e.consumed))} L</span>
                </div>
              ))}
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <h4 className="text-xs font-semibold text-red-600 uppercase mb-2">Fuel Reorder Recommendations</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">Current Stock: <strong>{fmtNum(kpis.currentStock)} L</strong></p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">Daily Avg Usage: <strong>{fmtNum(String(Number(kpis.totalConsumed) / 90))} L</strong></p>
              <p className="text-sm text-red-600 font-semibold mt-2">
                {Number(kpis.currentStock) < Number(kpis.totalConsumed) / 90 * 7
                  ? "⚠️ Stock below 7-day threshold! Order now."
                  : "✅ Stock levels adequate"}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="chart-container">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">🔔 Recent Alerts & Notifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dashData?.alerts?.slice(0, 6).map((a, i) => <AlertItem key={i} alert={a} />)}
          </div>
        </div>
      </div>
    );
  };

  /* ─── FUEL ENTRY PAGE ─── */
  const FuelEntryPage = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <IconSearch className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input type="text" placeholder="Search entries..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="input-field pl-9 w-64" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            <IconPlus size={16} /> Add Entry
          </button>
          <button onClick={() => exportCSV(entries as unknown as Record<string, unknown>[], "fuel-entries.csv")} className="btn-secondary">
            <IconDownload size={16} /> Export CSV
          </button>
        </div>
      </div>

      {showForm && <FuelEntryForm sites={refSites} equipment={refEquipment} suppliers={refSuppliers}
        onSave={() => { setShowForm(false); fetchEntries(ePage); }} onCancel={() => setShowForm(false)} />}

      <div className="chart-container overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th><th>Site</th><th>Fuel Type</th><th>Opening</th><th>Received</th>
              <th>Issued</th><th>Closing</th><th>Consumed</th><th>Equipment</th>
              <th>Efficiency</th><th>Cost</th><th>Variance</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 ? (
              <tr><td colSpan={13} className="text-center py-8 text-gray-400">No entries found. Click &quot;Load Sample Data&quot; to get started.</td></tr>
            ) : filteredEntries.map(e => (
              <tr key={e.id}>
                <td className="whitespace-nowrap">{e.date}</td>
                <td className="whitespace-nowrap max-w-[120px] truncate">{e.site_name}</td>
                <td><span className={`px-2 py-0.5 rounded text-xs font-semibold ${e.fuel_type === "Diesel" ? "bg-blue-100 text-blue-700" : e.fuel_type === "Petrol" ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"}`}>{e.fuel_type}</span></td>
                <td>{fmtNum(e.opening_stock)}</td>
                <td className="text-green-600 font-medium">{fmtNum(e.fuel_received)}</td>
                <td className="text-orange-600 font-medium">{fmtNum(e.fuel_issued)}</td>
                <td>{fmtNum(e.closing_stock)}</td>
                <td className="font-semibold">{fmtNum(e.fuel_consumed)}</td>
                <td className="whitespace-nowrap">{e.equipment_id || "-"}</td>
                <td>{Number(e.fuel_efficiency).toFixed(2)}</td>
                <td className="font-medium">{fmtCurrency(e.fuel_cost)}</td>
                <td className={Number(e.variance) > 15 ? "text-red-600 font-bold" : ""}>{Number(e.variance).toFixed(1)}</td>
                <td>
                  <button onClick={() => deleteEntry(e.id)} className="text-red-500 hover:text-red-700 p-1" title="Delete">
                    <IconTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>Showing {(ePage - 1) * 20 + 1}-{Math.min(ePage * 20, eTotal)} of {eTotal}</span>
        <div className="flex gap-2">
          <button disabled={ePage <= 1} onClick={() => fetchEntries(ePage - 1)}
            className="btn-secondary text-xs disabled:opacity-50">Previous</button>
          <button disabled={ePage * 20 >= eTotal} onClick={() => fetchEntries(ePage + 1)}
            className="btn-secondary text-xs disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );

  /* ─── INVENTORY PAGE ─── */
  const InventoryPage = () => {
    if (!charts) return <div className="text-center py-8 text-gray-400">Loading...</div>;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard title="Current Stock" value={fmtNum(kpis?.currentStock || "0") + " L"} icon="⛽" color="green" trend="down" change="-2.3%" />
          <KPICard title="Total Received" value={fmtNum(kpis?.totalReceived || "0") + " L"} icon="📥" color="blue" trend="up" change="+4.2%" />
          <KPICard title="Total Issued" value={fmtNum(kpis?.totalIssued || "0") + " L"} icon="📤" color="orange" trend="up" change="+3.8%" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GaugeChart value={Number(kpis?.currentStock || 0)} max={Number(kpis?.totalReceived || 1) * 0.2} title="⛽ Stock Level Gauge" dark={dark} />
          <FuelDistributionChart data={charts.fuelDistribution} title="⛽ Fuel Stock by Type" dark={dark} />
        </div>
        <div className="chart-container">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">📦 Inventory Summary by Site</h3>
          <table className="data-table">
            <thead>
              <tr><th>Site</th><th>Total Consumed (L)</th><th>Total Cost ($)</th><th>Status</th></tr>
            </thead>
            <tbody>
              {charts.siteConsumption.map((s, i) => (
                <tr key={i}>
                  <td className="font-medium">{String(s.name)}</td>
                  <td>{fmtNum(String(s.consumed))}</td>
                  <td>{fmtCurrency(String(s.cost))}</td>
                  <td><span className="alert-badge info">Active</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /* ─── EQUIPMENT PAGE ─── */
  const EquipmentPage = () => {
    if (!charts) return <div className="text-center py-8 text-gray-400">Loading...</div>;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard title="Active Equipment" value={String(kpis?.activeEquipment || 0)} icon="🚜" color="green" trend="up" change="+2" />
          <KPICard title="Avg Efficiency" value={(kpis?.avgEfficiency || "0") + " L/hr"} icon="⚡" color="blue" trend="up" change="+1.5%" />
          <KPICard title="Total Consumed" value={fmtNum(kpis?.totalConsumed || "0") + " L"} icon="🔥" color="orange" trend="up" change="+5.1%" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <EquipmentRankingChart data={charts.equipmentConsumption} title="🚜 Equipment Consumption Ranking" dark={dark} />
          <EfficiencyChart data={charts.efficiencyComparison} title="⚡ Efficiency Comparison" dark={dark} />
        </div>
        <div className="chart-container">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">🚜 Equipment Details</h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Equipment ID</th><th>Type</th><th>Total Consumed (L)</th><th>Status</th></tr>
              </thead>
              <tbody>
                {charts.equipmentConsumption.map((e, i) => (
                  <tr key={i}>
                    <td className="font-medium">{String(e.equipment_id)}</td>
                    <td>{String(e.equipment_type)}</td>
                    <td className="font-semibold">{fmtNum(String(e.consumed))}</td>
                    <td><span className="alert-badge info">Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  /* ─── SITE ANALYSIS PAGE ─── */
  const SiteAnalysisPage = () => {
    if (!charts) return <div className="text-center py-8 text-gray-400">Loading...</div>;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <KPICard title="Active Sites" value={String(kpis?.activeSites || 0)} icon="🏗️" color="blue" trend="up" change="+1" />
          <KPICard title="Total Cost" value={fmtCurrency(kpis?.totalCost || "0")} icon="💰" color="yellow" trend="up" change="+6.7%" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SiteConsumptionChart data={charts.siteConsumption} title="🏗️ Site-wise Fuel Consumption" dark={dark} />
          <MonthlyConsumptionChart data={charts.monthlyTrend} title="📈 Monthly Trend" dark={dark} />
        </div>
        <div className="chart-container">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">🏗️ Site Performance Matrix</h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Site Name</th><th>Consumption (L)</th><th>Cost ($)</th><th>Rank</th></tr>
              </thead>
              <tbody>
                {charts.siteConsumption.map((s, i) => (
                  <tr key={i}>
                    <td className="font-medium">{String(s.name)}</td>
                    <td>{fmtNum(String(s.consumed))}</td>
                    <td>{fmtCurrency(String(s.cost))}</td>
                    <td><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${i === 0 ? "bg-red-100 text-red-600" : i < 3 ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"}`}>#{i + 1}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  /* ─── SUPPLIER PAGE ─── */
  const SupplierPage = () => {
    if (!charts) return <div className="text-center py-8 text-gray-400">Loading...</div>;
    return (
      <div className="space-y-4">
        <SupplierChart data={charts.supplierPerformance} title="🏭 Supplier Performance Dashboard" dark={dark} />
        <div className="chart-container">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">🏭 Supplier Details</h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Supplier</th><th>Total Supplied (L)</th><th>Deliveries</th><th>Rating</th></tr>
              </thead>
              <tbody>
                {charts.supplierPerformance.map((s, i) => (
                  <tr key={i}>
                    <td className="font-medium">{String(s.name)}</td>
                    <td className="font-semibold text-green-600">{fmtNum(String(s.total_supplied))}</td>
                    <td>{String(s.deliveries)}</td>
                    <td>{"⭐".repeat(Math.min(5, Math.max(1, Math.round(Number(s.total_supplied) / 50000))))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  /* ─── VARIANCE PAGE ─── */
  const VariancePage = () => {
    if (!charts) return <div className="text-center py-8 text-gray-400">Loading...</div>;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard title="Total Variance" value={fmtNum(kpis?.totalVariance || "0") + " L"} icon="📊" color="red" trend="down" change="-0.8%" />
          <KPICard title="Fuel Loss %" value={(kpis?.lossPercentage || "0") + "%"} icon="📉" color="red" trend="down" change="-1.2%" />
          <KPICard title="Theft Alerts" value={String(kpis?.theftAlerts || 0)} icon="🚨" color="red" trend="down" change="-1" />
        </div>

        {/* Variance Heatmap */}
        <div className="chart-container">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">🔥 Variance Heat Map (Site × Month)</h3>
          <div className="overflow-x-auto">
            {(() => {
              const vd = charts.varianceData;
              const siteNames = [...new Set(vd.map(r => String(r.site)))];
              const months = [...new Set(vd.map(r => String(r.month)))].sort();
              return (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Site</th>
                      {months.map(m => <th key={m}>{m}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {siteNames.map(site => (
                      <tr key={site}>
                        <td className="font-medium whitespace-nowrap">{site}</td>
                        {months.map(m => {
                          const row = vd.find(r => String(r.site) === site && String(r.month) === m);
                          const val = Number(row?.variance || 0);
                          const bg = val > 500 ? "bg-red-500 text-white" : val > 200 ? "bg-red-300" : val > 100 ? "bg-orange-200" : val > 50 ? "bg-yellow-100" : "bg-green-100";
                          return <td key={m} className={`text-center text-xs font-semibold ${bg} rounded`}>{val.toFixed(0)}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FuelLossDonutChart
            data={[
              { name: "Effective Use", value: 100 - Math.abs(Number(kpis?.lossPercentage || 0)) },
              { name: "Fuel Loss", value: Math.abs(Number(kpis?.lossPercentage || 0)) },
            ]}
            title="📉 Fuel Loss Distribution" dark={dark}
          />
          <div className="chart-container">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">🚨 Active Theft & Anomaly Alerts</h3>
            <div className="space-y-2">
              {dashData?.alerts?.filter(a => a.severity === "critical").map((a, i) => <AlertItem key={i} alert={a} />)}
              {dashData?.alerts?.filter(a => a.severity === "critical").length === 0 && (
                <p className="text-sm text-green-600 flex items-center gap-2"><IconCheck /> No active theft alerts</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ─── REPORTS PAGE ─── */
  const ReportsPage = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {["daily", "weekly", "monthly", "equipment", "variance"].map(t => (
          <button key={t} onClick={() => { setReportType(t); fetchReports(t); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${reportType === t ? "bg-orange text-white" : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700"}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)} Report
          </button>
        ))}
        <button onClick={() => exportCSV(reportData, `${reportType}-report.csv`)} className="btn-secondary ml-auto">
          <IconDownload size={16} /> Export CSV
        </button>
      </div>

      <div className="chart-container overflow-x-auto">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 capitalize">📋 {reportType} Report</h3>
        {reportData.length === 0 ? (
          <p className="text-center py-8 text-gray-400">No data available. Load sample data first.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {Object.keys(reportData[0]).map(k => (
                  <th key={k}>{k.replace(/_/g, " ").toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.slice(0, 50).map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((v, j) => (
                    <td key={j} className="whitespace-nowrap">
                      {typeof v === "number" ? fmtNum(v) : String(v ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {reportData.length > 50 && (
          <p className="text-xs text-gray-400 mt-2 text-right">Showing 50 of {reportData.length} rows</p>
        )}
      </div>
    </div>
  );

  /* ─── SETTINGS PAGE ─── */
  const SettingsPage = () => (
    <div className="space-y-4">
      <div className="chart-container max-w-2xl">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">⚙️ General Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Company Name</label>
            <input type="text" defaultValue="Industrial Corp." className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Default Fuel Type</label>
            <select className="input-field"><option>Diesel</option><option>Petrol</option><option>HSD</option></select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Theft Alert Threshold (%)</label>
            <input type="number" defaultValue="5" className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Low Stock Alert Level (L)</label>
            <input type="number" defaultValue="500" className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Abnormal Consumption Threshold (%)</label>
            <input type="number" defaultValue="10" className="input-field" />
          </div>
          <div className="flex items-center gap-3">
            <label className="block text-xs font-semibold text-gray-500">Dark Mode</label>
            <button onClick={() => setDark(!dark)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${dark ? "bg-orange" : "bg-gray-300"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${dark ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          <button onClick={() => { setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2000); }}
            className="btn-primary">
            <IconCheck size={16} /> Save Settings
          </button>
          {settingsSaved && <p className="text-sm text-green-600 flex items-center gap-1"><IconCheck size={14} /> Settings saved successfully!</p>}
        </div>
      </div>

      <div className="chart-container max-w-2xl">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">🗄️ Data Management</h3>
        <div className="space-y-3">
          <button onClick={seedData} disabled={seeding} className="btn-primary w-full justify-center disabled:opacity-50">
            {seeding ? "Loading..." : "🔄 Load / Reset Sample Data"}
          </button>
          <p className="text-xs text-gray-400">This will clear existing data and load fresh sample data for demonstration.</p>
        </div>
      </div>
    </div>
  );

  /* ─── render page ─── */
  const renderPage = () => {
    switch (page) {
      case "dashboard": return <DashboardPage />;
      case "fuel-entry": return <FuelEntryPage />;
      case "inventory": return <InventoryPage />;
      case "equipment": return <EquipmentPage />;
      case "site-analysis": return <SiteAnalysisPage />;
      case "supplier": return <SupplierPage />;
      case "variance": return <VariancePage />;
      case "reports": return <ReportsPage />;
      case "settings": return <SettingsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden ${dark ? "dark bg-slate-950" : "bg-[#F3F4F6]"}`}>
      {Sidebar}
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className="flex-1 flex flex-col overflow-hidden">
        {Header}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

/* ─── FUEL ENTRY FORM ─── */
function FuelEntryForm({ sites, equipment, suppliers, onSave, onCancel }: {
  sites: RefOption[]; equipment: RefOption[]; suppliers: RefOption[];
  onSave: () => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    siteId: "", fuelType: "Diesel", openingStock: "", fuelReceived: "0",
    supplierId: "", fuelIssued: "0", closingStock: "", fuelConsumed: "0",
    equipmentDbId: "", runningHours: "", odometerReading: "",
    fuelEfficiency: "", fuelCost: "", variance: "", remarks: "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/fuel-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) onSave();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <div className="chart-container">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">➕ New Fuel Entry</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
          <input type="date" name="date" value={form.date} onChange={handleChange} className="input-field" required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Site</label>
          <select name="siteId" value={form.siteId} onChange={handleChange} className="input-field" required>
            <option value="">Select Site</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Fuel Type</label>
          <select name="fuelType" value={form.fuelType} onChange={handleChange} className="input-field">
            <option>Diesel</option><option>Petrol</option><option>HSD</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Opening Stock (L)</label>
          <input type="number" step="0.01" name="openingStock" value={form.openingStock} onChange={handleChange} className="input-field" required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Fuel Received (L)</label>
          <input type="number" step="0.01" name="fuelReceived" value={form.fuelReceived} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Supplier</label>
          <select name="supplierId" value={form.supplierId} onChange={handleChange} className="input-field">
            <option value="">Select Supplier</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Fuel Issued (L)</label>
          <input type="number" step="0.01" name="fuelIssued" value={form.fuelIssued} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Closing Stock (L)</label>
          <input type="number" step="0.01" name="closingStock" value={form.closingStock} onChange={handleChange} className="input-field" required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Fuel Consumed (L)</label>
          <input type="number" step="0.01" name="fuelConsumed" value={form.fuelConsumed} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Equipment</label>
          <select name="equipmentDbId" value={form.equipmentDbId} onChange={handleChange} className="input-field">
            <option value="">Select Equipment</option>
            {equipment.map(e => <option key={e.id} value={e.id}>{e.equipment_id} - {e.equipment_type}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Running Hours</label>
          <input type="number" step="0.01" name="runningHours" value={form.runningHours} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Fuel Cost ($)</label>
          <input type="number" step="0.01" name="fuelCost" value={form.fuelCost} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Variance / Loss (L)</label>
          <input type="number" step="0.01" name="variance" value={form.variance} onChange={handleChange} className="input-field" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Remarks</label>
          <input type="text" name="remarks" value={form.remarks} onChange={handleChange} className="input-field" />
        </div>
        <div className="flex gap-2 items-end md:col-span-2 lg:col-span-4">
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save Entry"}</button>
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
