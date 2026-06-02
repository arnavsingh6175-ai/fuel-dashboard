import { NextResponse } from "next/server";
import { db } from "@/db";
import { sites, equipment, suppliers, fuelEntries, alerts } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Clear existing data
    await db.execute(sql`TRUNCATE fuel_entries, alerts, equipment, suppliers, sites RESTART IDENTITY CASCADE`);

    // Seed sites
    const siteData = [
      { name: "Alpha Construction Site", location: "Houston, TX", projectName: "Highway Bridge Project" },
      { name: "Beta Manufacturing Plant", location: "Detroit, MI", projectName: "Auto Parts Line" },
      { name: "Gamma Oil Field", location: "Midland, TX", projectName: "Well Drilling Phase 3" },
      { name: "Delta Power Station", location: "Phoenix, AZ", projectName: "Solar Farm Build" },
      { name: "Epsilon Mining Site", location: "Denver, CO", projectName: "Gold Extraction" },
      { name: "Zeta Refinery", location: "Baton Rouge, LA", projectName: "Refinery Expansion" },
    ];
    const insertedSites = await db.insert(sites).values(siteData).returning();

    // Seed suppliers
    const supplierData = [
      { name: "PetroMax Fuels", contactInfo: "1-800-PETRO", rating: "4.5" },
      { name: "GreenLine Energy", contactInfo: "1-800-GREEN", rating: "4.2" },
      { name: "FuelCorp International", contactInfo: "1-800-FUEL", rating: "3.8" },
      { name: "National Petroleum Co.", contactInfo: "1-800-NPC", rating: "4.7" },
      { name: "Atlas Oil & Gas", contactInfo: "1-800-ATLAS", rating: "4.0" },
    ];
    const insertedSuppliers = await db.insert(suppliers).values(supplierData).returning();

    // Seed equipment
    const eqTypes = ["Excavator", "Bulldozer", "Crane", "Generator", "Dump Truck", "Loader", "Compactor", "Drill Rig", "Forklift", "Concrete Mixer"];
    const operators = ["John Smith", "Mike Johnson", "Sarah Davis", "Tom Wilson", "Emily Brown", "Chris Lee", "Anna Martinez", "David Garcia", "Lisa Anderson", "James Taylor"];
    const equipmentData = eqTypes.map((type, i) => ({
      equipmentId: `EQ-${String(1001 + i)}`,
      equipmentType: type,
      siteId: insertedSites[i % insertedSites.length].id,
      operatorName: operators[i],
      expectedEfficiency: String((3 + Math.random() * 5).toFixed(2)),
    }));
    const insertedEquipment = await db.insert(equipment).values(equipmentData).returning();

    // Seed fuel entries for the last 90 days
    const fuelTypes = ["Diesel", "Petrol", "HSD"];
    const entries = [];
    const now = new Date();

    for (let d = 90; d >= 0; d--) {
      const entryDate = new Date(now);
      entryDate.setDate(now.getDate() - d);
      const dateStr = entryDate.toISOString().split("T")[0];

      for (const site of insertedSites) {
        const eqsForSite = insertedEquipment.filter(e => e.siteId === site.id);
        for (const eq of eqsForSite) {
          const fuelType = fuelTypes[Math.floor(Math.random() * fuelTypes.length)];
          const opening = 500 + Math.random() * 2000;
          const received = Math.random() > 0.6 ? Math.floor(Math.random() * 1000) : 0;
          const consumed = 50 + Math.random() * 200;
          const issued = consumed + (Math.random() > 0.9 ? Math.random() * 30 : 0);
          const closing = opening + received - issued;
          const hours = 4 + Math.random() * 12;
          const efficiency = consumed / hours;
          const cost = consumed * (fuelType === "Diesel" ? 4.5 : fuelType === "Petrol" ? 3.8 : 4.2);
          const variance = issued - consumed;
          const supplierId = received > 0 ? insertedSuppliers[Math.floor(Math.random() * insertedSuppliers.length)].id : null;

          entries.push({
            date: dateStr,
            siteId: site.id,
            fuelType,
            openingStock: opening.toFixed(2),
            fuelReceived: received.toFixed(2),
            supplierId,
            fuelIssued: issued.toFixed(2),
            closingStock: closing.toFixed(2),
            fuelConsumed: consumed.toFixed(2),
            equipmentDbId: eq.id,
            runningHours: hours.toFixed(2),
            odometerReading: String(Math.floor(10000 + Math.random() * 50000)),
            fuelEfficiency: efficiency.toFixed(2),
            fuelCost: cost.toFixed(2),
            variance: variance.toFixed(2),
            remarks: variance > 15 ? "Variance exceeds threshold" : null,
          });
        }
      }
    }

    // Insert in batches
    const batchSize = 200;
    for (let i = 0; i < entries.length; i += batchSize) {
      await db.insert(fuelEntries).values(entries.slice(i, i + batchSize));
    }

    // Seed some alerts
    const alertData = [
      { type: "THEFT", severity: "critical", message: "🚨 Possible Fuel Theft Detected - Variance exceeds 5% at Alpha Construction Site", siteId: insertedSites[0].id },
      { type: "STOCK_MISMATCH", severity: "warning", message: "⚠ Stock Mismatch Detected at Beta Manufacturing Plant", siteId: insertedSites[1].id },
      { type: "LOW_STOCK", severity: "warning", message: "⛽ Reorder Required - Low fuel stock at Gamma Oil Field", siteId: insertedSites[2].id },
      { type: "ABNORMAL", severity: "warning", message: "⚠ Abnormal Fuel Usage detected for Excavator EQ-1001", siteId: insertedSites[0].id, equipmentDbId: insertedEquipment[0].id },
      { type: "LOW_EFFICIENCY", severity: "info", message: "Low Efficiency Alert - Bulldozer EQ-1002 below threshold", siteId: insertedSites[1].id, equipmentDbId: insertedEquipment[1].id },
      { type: "THEFT", severity: "critical", message: "🚨 Possible Fuel Theft Detected - Large variance at Epsilon Mining Site", siteId: insertedSites[4].id },
      { type: "LOW_STOCK", severity: "warning", message: "⛽ Reorder Required - Delta Power Station running low", siteId: insertedSites[3].id },
    ];
    await db.insert(alerts).values(alertData);

    return NextResponse.json({ success: true, entries: entries.length });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
