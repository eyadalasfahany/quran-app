CREATE TABLE `azkar_categories` (
	`resource_id` integer NOT NULL,
	`id` text NOT NULL,
	`kind` text NOT NULL,
	`position` integer NOT NULL,
	`occasion` text,
	`progress_period` text NOT NULL,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE TABLE `azkar_chapters` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`source_chapter_id` text NOT NULL,
	`number` integer NOT NULL,
	`title_ar` text,
	`title_en` text,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE TABLE `azkar_entries` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`entry_key` text NOT NULL,
	`chapter_id` integer NOT NULL,
	`position` integer NOT NULL,
	`source_reference` text NOT NULL,
	`entry_type` text NOT NULL,
	`occasion` text,
	`timing_type` text,
	`timing_prayer` text,
	`timing_policy_id` text,
	`review_status` text NOT NULL,
	`source_version` text NOT NULL,
	`imported_at` integer NOT NULL,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `azkar_entries_entry_key_unique` ON `azkar_entries` (`entry_key`);--> statement-breakpoint
CREATE INDEX `azkar_entries_resource_chapter_position_idx` ON `azkar_entries` (`resource_id`,`chapter_id`,`position`);--> statement-breakpoint
CREATE TABLE `azkar_entry_categories` (
	`resource_id` integer NOT NULL,
	`category_id` text NOT NULL,
	`entry_id` integer NOT NULL,
	`variation_key` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`resource_id`, `category_id`, `entry_id`, `variation_key`)
);
--> statement-breakpoint
CREATE TABLE `azkar_items` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`entry_id` integer NOT NULL,
	`item_key` text NOT NULL,
	`variation_key` text NOT NULL,
	`position` integer NOT NULL,
	`kind` text NOT NULL,
	`required_count` integer,
	`speaker` text,
	`source_dua_id` text,
	`text_en` text,
	`transliteration` text,
	`source_text_sha256` text,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `azkar_items_item_key_unique` ON `azkar_items` (`item_key`);--> statement-breakpoint
CREATE INDEX `azkar_items_resource_entry_variation_position_idx` ON `azkar_items` (`resource_id`,`entry_id`,`variation_key`,`position`);--> statement-breakpoint
CREATE TABLE `azkar_notes` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`entry_id` integer NOT NULL,
	`item_id` integer,
	`kind` text NOT NULL,
	`text_ar` text,
	`text_en` text,
	`grader` text,
	`source_type` text NOT NULL,
	`source_name` text NOT NULL,
	`source_reference` text,
	`source_url` text,
	`review_status` text NOT NULL,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `azkar_notes_resource_entry_idx` ON `azkar_notes` (`resource_id`,`entry_id`);--> statement-breakpoint
CREATE TABLE `azkar_recordings` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`recording_key` text NOT NULL,
	`item_id` integer NOT NULL,
	`reciter_name` text NOT NULL,
	`reciter_name_ar` text,
	`source` text NOT NULL,
	`remote_url` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`size_bytes` integer,
	`stream_allowed` integer NOT NULL,
	`download_allowed` integer NOT NULL,
	`redistribution_allowed` integer NOT NULL,
	`attribution_ar` text,
	`attribution_en` text,
	`licence` text NOT NULL,
	`licence_url` text,
	`rights_verified_at` integer,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `azkar_recordings_recording_key_unique` ON `azkar_recordings` (`recording_key`);--> statement-breakpoint
CREATE INDEX `azkar_recordings_resource_item_idx` ON `azkar_recordings` (`resource_id`,`item_id`);--> statement-breakpoint
CREATE TABLE `azkar_segments` (
	`resource_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`position` integer NOT NULL,
	`kind` text NOT NULL,
	`text_ar` text,
	`quran_surah` integer,
	`quran_verse_from` integer,
	`quran_verse_to` integer,
	`text_search` text,
	PRIMARY KEY(`resource_id`, `item_id`, `position`)
);
