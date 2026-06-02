import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fuelEntries, sites, equipment, suppliers } from "@/db/schema";
import { sql, eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "25");
    const siteId = url.searchParams.get("siteId");
    const fuelType = url.searchParams.get("fuelType");
    const search = url.searchParams.get("search");
    const offset = (page - 1) * limit;

    let whereClause = sql`1=1`;
    if (siteId) whereClause = sql`${whereClause} AND fe.site_id = ${parseInt(siteId)}`;
    if (fuelType) whereClause = sql`${whereClause} AND fe.fuel_type = ${fuelType}`;

    const result = await db.execute(sql`
      SELECT fe.*, s.name as site_name, s.project_name,
             e.equipment_id, e.equipment_type, e.operator_name,
             sup.name as supplier_name
      FROM fuel_entries fe
      LEFT JOIN sites s ON s.id = fe.site_id
      LEFT JOIN equipment e ON e.id = fe.equipment_db_id
      LEFT JOIN suppliers sup ON sup.id = fe.supplier_id
      WHERE ${whereClause}
      ORDER BY fe.date DESC, fe.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM fuel_entries fe WHERE ${whereClause}
    `);

    const sitesResult = await db.execute(sql`SELECT id, name FROM sites WHERE is_active = true ORDER BY name`);
    const equipmentResult = await db.execute(sql`SELECT id, equipment_id, equipment_type FROM equipment WHERE is_active = true ORDER BY equipment_id`);
    const suppliersResult = await db.execute(sql`SELECT id, name FROM suppliers WHERE is_active = true ORDER BY name`);

    return NextResponse.json({
      entries: result.rows,
      total: Number(countResult.rows[0]?.total || 0),
      page,
      limit,
      sites: sitesResult.rows,
      equipment: equipmentResult.rows,
      suppliers: suppliersResult.rows,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await db.insert(fuelEntries).values({
      date: body.date,
      siteId: parseInt(body.siteId),
      fuelType: body.fuelType,
      openingStock: body.openingStock,
      fuelReceived: body.fuelReceived || "0",
      supplierId: body.supplierId ? parseInt(body.supplierId) : null,
      fuelIssued: body.fuelIssued || "0",
      closingStock: body.closingStock,
      fuelConsumed: body.fuelConsumed || "0",
      equipmentDbId: body.equipmentDbId ? parseInt(body.equipmentDbId) : null,
      runningHours: body.runningHours || null,
      odometerReading: body.odometerReading || null,
      fuelEfficiency: body.fuelEfficiency || null,
      fuelCost: body.fuelCost || null,
      variance: body.variance || null,
      remarks: body.remarks || null,
    }).returning();
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await db.update(fuelEntries)
      .set({
        date: body.date,
        siteId: parseInt(body.siteId),
        fuelType: body.fuelType,
        openingStock: body.openingStock,
        fuelReceived: body.fuelReceived || "0",
        supplierId: body.supplierId ? parseInt(body.supplierId) : null,
        fuelIssued: body.fuelIssued || "0",
        closingStock: body.closingStock,
        fuelConsumed: body.fuelConsumed || "0",
        equipmentDbId: body.equipmentDbId ? parseInt(body.equipmentDbId) : null,
        runningHours: body.runningHours || null,
        odometerReading: body.odometerReading || null,
        fuelEfficiency: body.fuelEfficiency || null,
        fuelCost: body.fuelCost || null,
        variance: body.variance || null,
        remarks: body.remarks || null,
        updatedAt: new Date(),
      })
      .where(eq(fuelEntries.id, parseInt(body.id)))
      .returning();
    return NextResponse.json(result[0]);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await db.delete(fuelEntries).where(eq(fuelEntries.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
