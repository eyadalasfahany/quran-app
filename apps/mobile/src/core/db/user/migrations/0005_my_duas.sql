CREATE TABLE `my_duas` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`body` text NOT NULL,
	`text_search` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dua_favorites` (
	`dua_key` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
