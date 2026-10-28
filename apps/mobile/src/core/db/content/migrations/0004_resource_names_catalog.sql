CREATE TABLE `catalog_resources` (
	`resource_id` integer PRIMARY KEY NOT NULL,
	`group` text NOT NULL,
	`name` text,
	`name_ar` text,
	`author_name` text,
	`language_code` text,
	`direction` text,
	`version` integer NOT NULL,
	`pack_size_bytes` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `installed_resources` ADD `name` text;--> statement-breakpoint
ALTER TABLE `installed_resources` ADD `name_ar` text;--> statement-breakpoint
ALTER TABLE `installed_resources` ADD `author_name` text;--> statement-breakpoint
ALTER TABLE `installed_resources` ADD `language_code` text;--> statement-breakpoint
ALTER TABLE `installed_resources` ADD `direction` text;