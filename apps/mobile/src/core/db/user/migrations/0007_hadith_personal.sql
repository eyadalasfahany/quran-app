CREATE TABLE `hadith_bookmarks` (
	`collection_slug` text NOT NULL,
	`hadith_number` text NOT NULL,
	`book_number` text NOT NULL,
	`unverified` integer DEFAULT 0 NOT NULL,
	`alias_version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`collection_slug`, `hadith_number`)
);
--> statement-breakpoint
CREATE TABLE `hadith_reading_position` (
	`collection_slug` text PRIMARY KEY NOT NULL,
	`hadith_number` text NOT NULL,
	`book_number` text NOT NULL,
	`unverified` integer DEFAULT 0 NOT NULL,
	`alias_version` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
