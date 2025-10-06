CREATE TABLE "interest_zone" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"zone_id" integer NOT NULL,
	"text" text NOT NULL,
	"coordinates" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "photo_of_the_day" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"credits" text,
	"image" text,
	"description" text,
	"date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" text PRIMARY KEY NOT NULL
);
