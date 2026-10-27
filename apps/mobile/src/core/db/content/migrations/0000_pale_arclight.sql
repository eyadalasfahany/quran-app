CREATE TABLE `chapter_audio_files` (
	`id` integer PRIMARY KEY NOT NULL,
	`recitation_id` integer NOT NULL,
	`chapter_id` integer NOT NULL,
	`audio_url` text NOT NULL,
	`size_bytes` integer,
	`duration_ms` integer NOT NULL,
	`format` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chapters` (
	`id` integer PRIMARY KEY NOT NULL,
	`name_arabic` text NOT NULL,
	`name_simple` text NOT NULL,
	`name_en` text NOT NULL,
	`revelation_place` text NOT NULL,
	`revelation_order` integer NOT NULL,
	`verses_count` integer NOT NULL,
	`bismillah_pre` integer NOT NULL,
	`page_start` integer NOT NULL,
	`page_end` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `installed_resources` (
	`resource_id` integer PRIMARY KEY NOT NULL,
	`group` text NOT NULL,
	`version` integer NOT NULL,
	`sha256` text NOT NULL,
	`last_checked_at` integer NOT NULL,
	`change_cursor` text
);
--> statement-breakpoint
CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mushaf_pages` (
	`mushaf_id` integer NOT NULL,
	`page_number` integer NOT NULL,
	`first_verse_id` integer NOT NULL,
	`last_verse_id` integer NOT NULL,
	`first_word_id` integer NOT NULL,
	`last_word_id` integer NOT NULL,
	`verse_mapping` text NOT NULL,
	PRIMARY KEY(`mushaf_id`, `page_number`)
);
--> statement-breakpoint
CREATE TABLE `mushafs` (
	`id` integer PRIMARY KEY NOT NULL,
	`resource_id` integer NOT NULL,
	`name` text NOT NULL,
	`pages_count` integer NOT NULL,
	`lines_per_page` integer NOT NULL,
	`default_font_name` text
);
--> statement-breakpoint
CREATE TABLE `recitation_timings` (
	`audio_file_id` integer NOT NULL,
	`verse_id` integer NOT NULL,
	`start_ms` integer NOT NULL,
	`end_ms` integer NOT NULL,
	`segments` text,
	PRIMARY KEY(`audio_file_id`, `verse_id`)
);
--> statement-breakpoint
CREATE TABLE `recitations` (
	`id` integer PRIMARY KEY NOT NULL,
	`resource_id` integer NOT NULL,
	`reciter_name` text,
	`reciter_name_ar` text,
	`style` text,
	`qirat` text,
	`has_word_segments` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tafsir_entries` (
	`resource_id` integer NOT NULL,
	`group_tafsir_id` integer NOT NULL,
	`first_verse_id` integer NOT NULL,
	`last_verse_id` integer NOT NULL,
	`html` text NOT NULL,
	PRIMARY KEY(`resource_id`, `group_tafsir_id`)
);
--> statement-breakpoint
CREATE INDEX `tafsir_entries_resource_first_verse_idx` ON `tafsir_entries` (`resource_id`,`first_verse_id`);--> statement-breakpoint
CREATE TABLE `translation_entries` (
	`resource_id` integer NOT NULL,
	`verse_id` integer NOT NULL,
	`text` text NOT NULL,
	`footnotes` text,
	PRIMARY KEY(`resource_id`, `verse_id`)
);
--> statement-breakpoint
CREATE TABLE `verses` (
	`id` integer PRIMARY KEY NOT NULL,
	`verse_key` text NOT NULL,
	`chapter_id` integer NOT NULL,
	`verse_number` integer NOT NULL,
	`juz` integer NOT NULL,
	`hizb` integer NOT NULL,
	`rub_el_hizb` integer NOT NULL,
	`page` integer NOT NULL,
	`sajdah` text NOT NULL,
	`text_uthmani` text NOT NULL,
	`text_uthmani_tajweed` text,
	`text_indopak` text,
	`text_imlaei` text,
	`text_search` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `verses_verse_key_unique` ON `verses` (`verse_key`);--> statement-breakpoint
CREATE INDEX `verses_page_idx` ON `verses` (`page`);--> statement-breakpoint
CREATE INDEX `verses_chapter_verse_idx` ON `verses` (`chapter_id`,`verse_number`);--> statement-breakpoint
CREATE TABLE `word_layouts` (
	`mushaf_id` integer NOT NULL,
	`word_id` integer NOT NULL,
	`verse_id` integer NOT NULL,
	`position_in_verse` integer NOT NULL,
	`char_type` text NOT NULL,
	`glyph` text NOT NULL,
	`page` integer NOT NULL,
	`line` integer NOT NULL,
	`position_in_line` integer NOT NULL,
	PRIMARY KEY(`mushaf_id`, `word_id`)
);
--> statement-breakpoint
CREATE INDEX `word_layouts_mushaf_page_line_idx` ON `word_layouts` (`mushaf_id`,`page`,`line`);