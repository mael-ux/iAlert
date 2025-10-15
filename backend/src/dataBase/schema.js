import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const interestZonesTable = pgTable("interest_zone", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  zoneId: integer("zone_id").notNull(),
  title: text("title"),
  coordinates: text("coordinates").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  userId: text("user_id").primaryKey(),
});

export const photoOfTheDay = pgTable("photo_of_the_day", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  credits: text("credits"),
  image: text("image").notNull(),
  description: text("description"),
  date: timestamp("date").defaultNow(),
});
