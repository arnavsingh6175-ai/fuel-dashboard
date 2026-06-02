import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // KPI aggregates
    const kpisResult = await db.execute(sql`
      SELECT
        COALESCE(SUM(fuel_received::numeric), 0) as total_received,
        COALESCE(SUM(fuel_issued::numeric), 0) as total_issued,
        COALESCE(SUM(fuel_consumed::numeric), 0) as total_consumed,
        COALESCE(AVG(fuel_efficiency::numeric), 0) as avg_efficiency,
        COALESCE(SUM(fuel_cost::numeric), 0) as total_cost,
        COALESCE(SUM(variance::numeric), 0) as total_variance,
        COUNT(*) as total_entries
      FROM fuel_entries
    `);
    const kpis = kpisResult.rows[0] ?? {};

    const stockResult = await db.execute(sql`
      SELECT COALESCE(SUM(closing_stock::numeric), 0) as current_stock
      FROM (
        SELECT DISTINCT ON (site_id) closing_stock
        FROM fuel_entries
        ORDER BY site_id, date DESC, id DESC
      ) latest
    `);

    const sitesCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM sites WHERE is_active = true`);
    const eqCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM equipment WHERE is_active = true`);
    const alertsCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM alerts WHERE is_resolved = false AND severity = 'critical'`);
    const lowStockCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM alerts WHERE is_resolved = false AND type = 'LOW_STOCK'`);

    const sitesCount = sitesCountResult.rows[0] ?? { count: 0 };
    const eqCount = eqCountResult.rows[0] ?? { count: 0 };
    const alertsCount = alertsCountResult.rows[0] ?? { count: 0 };
    const lowStockCount = lowStockCountResult.rows[0] ?? { count: 0 };

    // Monthly fuel consumption trend
    const monthlyTrend = await db.execute(sql`
      SELECT
        TO_CHAR(date::date, 'YYYY-MM') as month,
        SUM(fuel_consumed::numeric) as consumed,
        SUM(fuel_cost::numeric) as cost
      FROM fuel_entries
      GROUP BY TO_CHAR(date::date, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `);

    // Daily fuel usage (last 30 days)
    const dailyTrend = await db.execute(sql`
      SELECT
        date,
        SUM(fuel_consumed::numeric) as consumed,
        SUM(fuel_issued::numeric) as issued
      FROM fuel_entries
      WHERE date::date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY date
      ORDER BY date
    `);

    // Weekly consumption
    const weeklyTrend = await db.execute(sql`
      SELECT
        TO_CHAR(date_trunc('week', date::date), 'YYYY-WW') as week,
        SUM(fuel_consumed::numeric) as consumed
      FROM fuel_entries
      WHERE date::date >= CURRENT_DATE - INTERVAL '12 weeks'
      GROUP BY week
      ORDER BY week
    `);

    // Site-wise consumption
    const siteConsumption = await db.execute(sql`
      SELECT s.name, SUM(fe.fuel_consumed::numeric) as consumed,
             SUM(fe.fuel_cost::numeric) as cost
      FROM fuel_entries fe
      JOIN sites s ON s.id = fe.site_id
      GROUP BY s.name
      ORDER BY consumed DESC
    `);

    // Equipment-wise consumption (top 10)
    const equipmentConsumption = await db.execute(sql`
      SELECT e.equipment_id, e.equipment_type, SUM(fe.fuel_consumed::numeric) as consumed
      FROM fuel_entries fe
      JOIN equipment e ON e.id = fe.equipment_db_id
      GROUP BY e.equipment_id, e.equipment_type
      ORDER BY consumed DESC
      LIMIT 10
    `);

    // Fuel type distribution
    const fuelDistribution = await db.execute(sql`
      SELECT fuel_type, SUM(fuel_consumed::numeric) as consumed
      FROM fuel_entries
      GROUP BY fuel_type
      ORDER BY consumed DESC
    `);

    // Fuel efficiency comparison
    const efficiencyComparison = await db.execute(sql`
      SELECT e.equipment_type,
             AVG(fe.fuel_efficiency::numeric) as avg_efficiency
      FROM fuel_entries fe
      JOIN equipment e ON e.id = fe.equipment_db_id
      GROUP BY e.equipment_type
      ORDER BY avg_efficiency DESC
    `);

    // Supplier performance
    const supplierPerformance = await db.execute(sql`
      SELECT s.name, COUNT(*) as deliveries,
             SUM(fe.fuel_received::numeric) as total_supplied
      FROM fuel_entries fe
      JOIN suppliers s ON s.id = fe.supplier_id
      WHERE fe.supplier_id IS NOT NULL AND fe.fuel_received::numeric > 0
      GROUP BY s.name
      ORDER BY total_supplied DESC
    `);

    // Variance data
    const varianceData = await db.execute(sql`
      SELECT s.name as site,
             TO_CHAR(date::date, 'YYYY-MM') as month,
             SUM(fe.variance::numeric) as variance
      FROM fuel_entries fe
      JOIN sites s ON s.id = fe.site_id
      GROUP BY s.name, TO_CHAR(date::date, 'YYYY-MM')
      ORDER BY site, month
    `);

    // Recent alerts
    const recentAlerts = await db.execute(sql`
      SELECT a.*, s.name as site_name
      FROM alerts a
      LEFT JOIN sites s ON s.id = a.site_id
      ORDER BY a.created_at DESC
      LIMIT 20
    `);

    // Cost trend
    const costTrend = await db.execute(sql`
      SELECT date, SUM(fuel_cost::numeric) as cost
      FROM fuel_entries
      WHERE date::date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY date
      ORDER BY date
    `);

    const totalIssued = Number(kpis.total_issued) || 1;
    const totalVariance = Number(kpis.total_variance) || 0;
    const lossPercentage = ((totalVariance / totalIssued) * 100);

    return NextResponse.json({
      kpis: {
        totalReceived: Number(kpis.total_received ?? 0).toFixed(0),
        totalIssued: Number(kpis.total_issued ?? 0).toFixed(0),
        totalConsumed: Number(kpis.total_consumed ?? 0).toFixed(0),
        currentStock: Number(stockResult.rows[0]?.current_stock ?? 0).toFixed(0),
        totalCost: Number(kpis.total_cost ?? 0).toFixed(0),
        avgEfficiency: Number(kpis.avg_efficiency ?? 0).toFixed(2),
        totalVariance: Number(kpis.total_variance ?? 0).toFixed(0),
        lossPercentage: lossPercentage.toFixed(2),
        activeSites: Number(sitesCount.count),
        activeEquipment: Number(eqCount.count),
        theftAlerts: Number(alertsCount.count),
        lowStockAlerts: Number(lowStockCount.count),
      },
      charts: {
        monthlyTrend: [...monthlyTrend.rows].reverse(),
        dailyTrend: dailyTrend.rows,
        weeklyTrend: weeklyTrend.rows,
        siteConsumption: siteConsumption.rows,
        equipmentConsumption: equipmentConsumption.rows,
        fuelDistribution: fuelDistribution.rows,
        efficiencyComparison: efficiencyComparison.rows,
        supplierPerformance: supplierPerformance.rows,
        varianceData: varianceData.rows,
        costTrend: costTrend.rows,
      },
      alerts: recentAlerts.rows,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
