CREATE TABLE `azkar_favorites` (
	`entry_key` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `azkar_progress` (
	`scope_key` text NOT NULL,
	`period_key` text NOT NULL,
	`item_key` text NOT NULL,
	`current_count` integer DEFAULT 0 NOT NULL,
	`completed_at` integer,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`scope_key`, `period_key`, `item_key`)
);
--> statement-breakpoint
CREATE INDEX `azkar_progress_scope_period_idx` ON `azkar_progress` (`scope_key`,`period_key`);--> statement-breakpoint
CREATE TABLE `azkar_reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`target_type` text NOT NULL,
	`target_key` text NOT NULL,
	`enabled` integer NOT NULL,
	`trigger_type` text NOT NULL,
	`clock_time` text,
	`prayer` text,
	`offset_minutes` integer,
	`notification_ids` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `azkar_reminders_target_idx` ON `azkar_reminders` (`target_type`,`target_key`);