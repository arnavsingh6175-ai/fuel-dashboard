import {
  pgTable,
  serial,
  varchar,
  date,
  decimal,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  projectName: varchar("project_name", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  equipmentId: varchar("equipment_id", { length: 100 }).notNull().unique(),
  equipmentType: varchar("equipment_type", { length: 255 }).notNull(),
  siteId: integer("site_id"),
  operatorName: varchar("operator_name", { length: 255 }),
  isActive: boolean("is_active").default(true),
  expectedEfficiency: decimal("expected_efficiency", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contactInfo: varchar("contact_info", { length: 255 }),
  rating: decimal("rating", { precision: 3, scale: 1 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fuelEntries = pgTable("fuel_entries", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  siteId: integer("site_id").notNull(),
  fuelType: varchar("fuel_type", { length: 50 }).notNull(),
  openingStock: decimal("opening_stock", { precision: 12, scale: 2 }).notNull(),
  fuelReceived: decimal("fuel_received", { precision: 12, scale: 2 }).default("0"),
  supplierId: integer("supplier_id"),
  fuelIssued: decimal("fuel_issued", { precision: 12, scale: 2 }).default("0"),
  closingStock: decimal("closing_stock", { precision: 12, scale: 2 }).notNull(),
  fuelConsumed: decimal("fuel_consumed", { precision: 12, scale: 2 }).default("0"),
  equipmentDbId: integer("equipment_db_id"),
  runningHours: decimal("running_hours", { precision: 10, scale: 2 }),
  odometerReading: decimal("odometer_reading", { precision: 12, scale: 2 }),
  fuelEfficiency: decimal("fuel_efficiency", { precision: 10, scale: 2 }),
  fuelCost: decimal("fuel_cost", { precision: 14, scale: 2 }),
  variance: decimal("variance", { precision: 12, scale: 2 }),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  message: text("message").notNull(),
  siteId: integer("site_id"),
  equipmentDbId: integer("equipment_db_id"),
  fuelEntryId: integer("fuel_entry_id"),
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
