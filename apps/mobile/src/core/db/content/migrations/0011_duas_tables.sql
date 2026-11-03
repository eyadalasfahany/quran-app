CREATE TABLE `dua_collection_books` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`collection_slug` text NOT NULL,
	`book_number` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `dua_collection_books_position_idx` ON `dua_collection_books` (`resource_id`,`position`);--> statement-breakpoint
CREATE TABLE `dua_collection_refs` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`collection_slug` text NOT NULL,
	`hadith_number` text NOT NULL,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `dua_collection_refs_item_idx` ON `dua_collection_refs` (`resource_id`,`item_id`);--> statement-breakpoint
CREATE TABLE `dua_groups` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`source_category_id` integer NOT NULL,
	`title` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `dua_groups_position_idx` ON `dua_groups` (`resource_id`,`position`);--> statement-breakpoint
CREATE TABLE `dua_hadith` (
	`resource_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`hadeeth_id` integer NOT NULL,
	`title` text NOT NULL,
	`hadeeth` text NOT NULL,
	`attribution` text NOT NULL,
	`grade` text,
	`explanation` text,
	`reference` text,
	`hints` text,
	`text_search` text NOT NULL,
	`source_url` text NOT NULL,
	PRIMARY KEY(`resource_id`, `item_id`)
);
--> statement-breakpoint
CREATE INDEX `dua_hadith_hadeeth_idx` ON `dua_hadith` (`resource_id`,`hadeeth_id`);--> statement-breakpoint
CREATE TABLE `dua_items` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`dua_key` text NOT NULL,
	`kind` text NOT NULL,
	`group_id` integer,
	`position` integer NOT NULL,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dua_items_dua_key_unique` ON `dua_items` (`dua_key`);--> statement-breakpoint
CREATE INDEX `dua_items_kind_position_idx` ON `dua_items` (`resource_id`,`kind`,`position`);--> statement-breakpoint
CREATE INDEX `dua_items_group_position_idx` ON `dua_items` (`resource_id`,`group_id`,`position`);--> statement-breakpoint
CREATE TABLE `dua_links` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`hadeeth_id` integer NOT NULL,
	`entry_key` text NOT NULL,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `dua_links_item_idx` ON `dua_links` (`resource_id`,`item_id`);--> statement-breakpoint
CREATE TABLE `dua_quran_spans` (
	`resource_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`surah` integer NOT NULL,
	`verse_from` integer NOT NULL,
	`verse_to` integer,
	PRIMARY KEY(`resource_id`, `item_id`)
);
--> statement-breakpoint
CREATE INDEX `dua_quran_spans_surah_idx` ON `dua_quran_spans` (`resource_id`,`surah`,`verse_from`);