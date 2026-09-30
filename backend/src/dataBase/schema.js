import { pgTable, serial, text, timestamp, integer, date, numeric, jsonb, unique, uuid, boolean} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const weatherCacheTable = pgTable("weather_cache", {
  id: serial("id").primaryKey(),
  gridLat: numeric("grid_lat", { precision: 5, scale: 2 }).notNull(), 
  gridLng: numeric("grid_lng", { precision: 5, scale: 2 }).notNull(), 
  weatherData: jsonb("weather_data"), 
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    uniqueGrid: unique("unique_grid").on(table.gridLat, table.gridLng),
  };
});

export const interestZonesTable = pgTable("interest_zone", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.userId), 
  title: text("title").notNull().default('Untitled zone'),
  latitude: numeric("latitude", { precision: 10, scale: 6 }).notNull(),
  longitude: numeric("longitude", { precision: 10, scale: 6 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersTable = pgTable("users", {
  userId: text("user_id").primaryKey(), 
  name: text("name"),
  email: text("email"), 
  location: text("location"),
});

export const photoOfTheDayTable = pgTable("photo_of_the_day", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  credits: text("credits"),
  image: text("image").notNull(),
  description: text("description"),
  date: date("date").notNull(), 
});

export const disasterTypeTable = pgTable("disaster_type", {
  typeId: integer("typeId").primaryKey(), 
  title: text("title").notNull(),
  description: text("description"),
  averageRiskLevel: numeric("averageRiskLevel", { precision: 4, scale: 2 }), 
  recommendations: text("recommendations"),
});

export const userAlertConfigTable = pgTable("user_alert_config", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.userId, { onDelete: 'cascade' }),
  selectedTypes: jsonb("selected_types").default(['wildfires', 'volcanoes', 'severeStorms', 'floods', 'earthquakes']),
  vibrateEnabled: boolean("vibrate_enabled").default(true),
  soundEnabled: boolean("sound_enabled").default(true),
  flashEnabled: boolean("flash_enabled").default(false),
  soundLevel: integer("sound_level").default(80),
  notifyCurrentLocation: boolean("notify_current_location").default(true),
  notifyOnlySelectedZones: boolean("notify_only_selected_zones").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const incidentsTable = pgTable("incidents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 6 }).notNull(),
  longitude: numeric("longitude", { precision: 10, scale: 6 }).notNull(),
  severity: text("severity").default("medium"),
  status: text("status").default("active"),
  startedAt: timestamp("started_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const incidentSourcesTable = pgTable("incident_sources", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id")
    .notNull()
    .references(() => incidentsTable.id, { onDelete: "cascade" }),
  sourceName: text("source_name").notNull(),
  externalEventId: text("external_event_id"),
  rawData: jsonb("raw_data"),
  url: text("url"),
  fetchedAt: timestamp("fetched_at").defaultNow(),
});

export const incidentReportsTable = pgTable("incident_reports", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").references(() => incidentsTable.id, {
    onDelete: "set null",
  }),
  userId: text("user_id").references(() => usersTable.userId, {
    onDelete: "set null",
  }),
  category: text("category").notNull(),
  description: text("description"),
  latitude: numeric("latitude", { precision: 10, scale: 6 }).notNull(),
  longitude: numeric("longitude", { precision: 10, scale: 6 }).notNull(),
  photos: jsonb("photos").default([]),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const incidentsRelations = relations(incidentsTable, ({ many }) => ({
  sources: many(incidentSourcesTable),
  reports: many(incidentReportsTable),
}));

export const incidentSourcesRelations = relations(
  incidentSourcesTable,
  ({ one }) => ({
    incident: one(incidentsTable, {
      fields: [incidentSourcesTable.incidentId],
      references: [incidentsTable.id],
    }),
  }),
);

export const incidentReportsRelations = relations(
  incidentReportsTable,
  ({ one }) => ({
    incident: one(incidentsTable, {
      fields: [incidentReportsTable.incidentId],
      references: [incidentsTable.id],
    }),
    user: one(usersTable, {
      fields: [incidentReportsTable.userId],
      references: [usersTable.userId],
    }),
  }),
);