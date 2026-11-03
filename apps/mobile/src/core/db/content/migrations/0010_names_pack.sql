CREATE TABLE `names_lists` (
	`resource_id` integer NOT NULL,
	`list_slug` text NOT NULL,
	`title_ar` text NOT NULL,
	`source_label_ar` text NOT NULL,
	`attribution_ar` text,
	`attribution_en` text,
	`edition_reference` text,
	`source_version` text NOT NULL,
	PRIMARY KEY(`resource_id`, `list_slug`)
);
--> statement-breakpoint
CREATE TABLE `names` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`name_slug` text NOT NULL,
	`position` integer NOT NULL,
	`name_ar` text NOT NULL,
	`text_search` text NOT NULL,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `names_name_slug_unique` ON `names` (`name_slug`);--> statement-breakpoint
CREATE INDEX `names_resource_position_idx` ON `names` (`resource_id`,`position`);--> statement-breakpoint
CREATE TABLE `names_verses` (
	`resource_id` integer NOT NULL,
	`name_slug` text NOT NULL,
	`verse_key` text NOT NULL,
	`review_status` text NOT NULL,
	`evidence` text,
	PRIMARY KEY(`resource_id`, `name_slug`, `verse_key`)
);
--> statement-breakpoint
CREATE TABLE `names_notes` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`name_slug` text NOT NULL,
	`kind` text NOT NULL,
	`text_ar` text,
	`source_type` text NOT NULL,
	`source_name` text NOT NULL,
	`source_reference` text,
	`source_url` text,
	`review_status` text NOT NULL,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `names_notes_name_idx` ON `names_notes` (`resource_id`,`name_slug`);
