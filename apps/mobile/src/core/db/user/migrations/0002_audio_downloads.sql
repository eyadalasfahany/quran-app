CREATE TABLE `downloads` (
	`audio_file_id` integer PRIMARY KEY NOT NULL,
	`reciter_resource_id` integer NOT NULL,
	`chapter_id` integer NOT NULL,
	`audio_url` text NOT NULL,
	`source_size_bytes` integer,
	`local_path` text NOT NULL,
	`size_bytes` integer,
	`status` text NOT NULL,
	`progress` real DEFAULT 0 NOT NULL,
	`resume_data` text,
	`downloaded_at` integer,
	`verified_at` integer
);
--> statement-breakpoint
CREATE INDEX `downloads_reciter_resource_id_idx` ON `downloads` (`reciter_resource_id`);