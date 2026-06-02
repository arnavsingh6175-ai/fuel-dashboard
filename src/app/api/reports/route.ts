import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type") || "daily";

    let query;
    switch (type) {
      case "daily":
        query = sql`
          SELECT fe.date, s.name as site_name, fe.fuel_type,
                 SUM(fe.fuel_received::numeric) as received,
                 SUM(fe.fuel_issued::numeric) as issued,
                 SUM(fe.fuel_consumed::numeric) as consumed,
                 SUM(fe.fuel_cost::numeric) as cost,
                 SUM(fe.variance::numeric) as variance
          FROM fuel_entries fe
          JOIN sites s ON s.id = fe.site_id
          WHERE fe.date::date >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY fe.date, s.name, fe.fuel_type
          ORDER BY fe.date DESC
        `;
        break;
      case "weekly":
        query = sql`
          SELECT TO_CHAR(date_trunc('week', fe.date::date), 'YYYY-MM-DD') as week_start,
                 s.name as site_name,
                 SUM(fe.fuel_received::numeric) as received,
                 SUM(fe.fuel_issued::numeric) as issued,
                 SUM(fe.fuel_consumed::numeric) as consumed,
                 SUM(fe.fuel_cost::numeric) as cost,
                 SUM(fe.variance::numeric) as variance
          FROM fuel_entries fe
          JOIN sites s ON s.id = fe.site_id
          GROUP BY week_start, s.name
          ORDER BY week_start DESC
        `;
        break;
      case "monthly":
        query = sql`
          SELECT TO_CHAR(fe.date::date, 'YYYY-MM') as month,
                 s.name as site_name,
                 SUM(fe.fuel_received::numeric) as received,
                 SUM(fe.fuel_issued::numeric) as issued,
                 SUM(fe.fuel_consumed::numeric) as consumed,
                 SUM(fe.fuel_cost::numeric) as cost,
                 SUM(fe.variance::numeric) as variance
          FROM fuel_entries fe
          JOIN sites s ON s.id = fe.site_id
          GROUP BY month, s.name
          ORDER BY month DESC
        `;
        break;
      case "equipment":
        query = sql`
          SELECT e.equipment_id, e.equipment_type, e.operator_name,
                 s.name as site_name,
                 SUM(fe.fuel_consumed::numeric) as consumed,
                 AVG(fe.fuel_efficiency::numeric) as avg_efficiency,
                 SUM(fe.running_hours::numeric) as total_hours,
                 SUM(fe.fuel_cost::numeric) as cost
          FROM fuel_entries fe
          JOIN equipment e ON e.id = fe.equipment_db_id
          JOIN sites s ON s.id = fe.site_id
          GROUP BY e.equipment_id, e.equipment_type, e.operator_name, s.name
          ORDER BY consumed DESC
        `;
        break;
      case "variance":
        query = sql`
          SELECT fe.date, s.name as site_name, e.equipment_id,
                 fe.fuel_issued::numeric as issued,
                 fe.fuel_consumed::numeric as consumed,
                 fe.variance::numeric as variance,
                 CASE WHEN fe.fuel_issued::numeric > 0
                   THEN ROUND((fe.variance::numeric / fe.fuel_issued::numeric * 100)::numeric, 2)
                   ELSE 0
                 END as loss_pct
          FROM fuel_entries fe
          JOIN sites s ON s.id = fe.site_id
          LEFT JOIN equipment e ON e.id = fe.equipment_db_id
          WHERE fe.variance::numeric > 5
          ORDER BY fe.variance::numeric DESC
          LIMIT 200
        `;
        break;
      default:
        query = sql`SELECT 1`;
    }

    const result = await db.execute(query);
    return NextResponse.json({ data: result.rows, type });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
