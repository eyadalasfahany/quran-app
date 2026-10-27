CREATE TABLE `bookmarks` (
	`id` text PRIMARY KEY NOT NULL,
	`verse_id` integer NOT NULL,
	`kind` text NOT NULL,
	`page` integer,
	`client_updated_at` integer NOT NULL,
	`deleted_at` integer,
	`dirty` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bookmarks_verse_id_idx` ON `bookmarks` (`verse_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `bookmarks_live_kind_verse_idx` ON `bookmarks` (`kind`,`verse_id`) WHERE "bookmarks"."deleted_at" is null;--> statement-breakpoint
CREATE TABLE `highlights` (
	`id` text PRIMARY KEY NOT NULL,
	`verse_id` integer NOT NULL,
	`color` text NOT NULL,
	`client_updated_at` integer NOT NULL,
	`deleted_at` integer,
	`dirty` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `highlights_verse_id_idx` ON `highlights` (`verse_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `highlights_live_verse_idx` ON `highlights` (`verse_id`) WHERE "highlights"."deleted_at" is null;--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`verse_id` integer NOT NULL,
	`body` text NOT NULL,
	`client_updated_at` integer NOT NULL,
	`deleted_at` integer,
	`dirty` integer NOT NULL,
	CONSTRAINT "notes_body_length" CHECK(length("notes"."body") between 1 and 10000)
);
--> statement-breakpoint
CREATE INDEX `notes_verse_id_idx` ON `notes` (`verse_id`);--> statement-breakpoint
CREATE TABLE `outbox` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`op` text NOT NULL,
	`payload` text NOT NULL,
	`client_updated_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outbox_entity_idx` ON `outbox` (`entity`,`entity_id`);--> statement-breakpoint
CREATE TABLE `sync_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
