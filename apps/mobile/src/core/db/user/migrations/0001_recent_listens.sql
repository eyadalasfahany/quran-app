CREATE TABLE `recent_listens` (
	`audio_file_id` integer PRIMARY KEY NOT NULL,
	`reciter_resource_id` integer NOT NULL,
	`chapter_id` integer NOT NULL,
	`last_position_ms` integer NOT NULL,
	`played_at` integer NOT NULL
);
