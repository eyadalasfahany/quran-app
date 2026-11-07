CREATE TABLE `hadith_books` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`book_number` text NOT NULL,
	`title_ar` text,
	`title_en` text,
	`position` integer NOT NULL,
	`hadith_count` integer NOT NULL,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `hadith_books_position_idx` ON `hadith_books` (`resource_id`,`position`);--> statement-breakpoint
CREATE TABLE `hadith_chapters` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`book_id` integer NOT NULL,
	`chapter_number` integer NOT NULL,
	`source_chapter_key` text,
	`title_ar` text,
	`title_en` text,
	`position` integer NOT NULL,
	`hadith_count` integer NOT NULL,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `hadith_chapters_book_position_idx` ON `hadith_chapters` (`resource_id`,`book_id`,`position`);--> statement-breakpoint
CREATE TABLE `hadith_collections` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`slug` text NOT NULL,
	`source_code` text NOT NULL,
	`title_ar` text,
	`title_en` text,
	`author_ar` text,
	`author_en` text,
	`attribution_ar` text NOT NULL,
	`attribution_en` text NOT NULL,
	`source_url` text,
	`total_hadith` integer NOT NULL,
	`books_count` integer NOT NULL,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hadith_collections_slug_unique` ON `hadith_collections` (`slug`);--> statement-breakpoint
CREATE TABLE `hadith_entries` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`book_id` integer NOT NULL,
	`chapter_id` integer,
	`hadith_number` text NOT NULL,
	`arabic_number` text,
	`position` integer NOT NULL,
	`text_ar` text NOT NULL,
	`text_en` text,
	`narrator_en` text,
	`text_search` text NOT NULL,
	`source_url` text,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `hadith_entries_number_idx` ON `hadith_entries` (`resource_id`,`hadith_number`);--> statement-breakpoint
CREATE INDEX `hadith_entries_book_position_idx` ON `hadith_entries` (`resource_id`,`book_id`,`chapter_id`,`position`);--> statement-breakpoint
CREATE TABLE `hadith_grades` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`entry_id` integer NOT NULL,
	`grade` text NOT NULL,
	`graded_by` text,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `hadith_grades_entry_idx` ON `hadith_grades` (`resource_id`,`entry_id`);--> statement-breakpoint
CREATE TABLE `hadith_ref_aliases` (
	`resource_id` integer NOT NULL,
	`old_number` text NOT NULL,
	`new_number` text,
	`match` text NOT NULL,
	`since_version` integer NOT NULL,
	PRIMARY KEY(`resource_id`, `old_number`, `since_version`)
);
--> statement-breakpoint
ALTER TABLE `catalog_resources` ADD `source_key` text;
