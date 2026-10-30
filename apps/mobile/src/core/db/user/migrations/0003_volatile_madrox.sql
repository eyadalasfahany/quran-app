CREATE TABLE `khatma_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`date` text NOT NULL,
	`pages_read` integer NOT NULL,
	`last_verse_id` integer NOT NULL,
	`client_updated_at` integer NOT NULL,
	`deleted_at` integer,
	`dirty` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `khatma_logs_plan_id_idx` ON `khatma_logs` (`plan_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `khatma_logs_live_plan_date_idx` ON `khatma_logs` (`plan_id`,`date`) WHERE "khatma_logs"."deleted_at" is null;--> statement-breakpoint
CREATE TABLE `khatma_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`duration_days` integer NOT NULL,
	`start_verse_id` integer NOT NULL,
	`start_date` text NOT NULL,
	`status` text NOT NULL,
	`completed_at` integer,
	`client_updated_at` integer NOT NULL,
	`deleted_at` integer,
	`dirty` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `khatma_plans_one_active_idx` ON `khatma_plans` (`status`) WHERE "khatma_plans"."status" = 'active' AND "khatma_plans"."deleted_at" is null;