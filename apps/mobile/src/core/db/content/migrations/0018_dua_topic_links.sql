CREATE TABLE `dua_topic_links` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`topic_id` text NOT NULL,
	`target_kind` text NOT NULL,
	`target_key` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `dua_topic_links_target_idx` ON `dua_topic_links` (`resource_id`,`target_kind`,`target_key`);--> statement-breakpoint
CREATE INDEX `dua_topic_links_topic_idx` ON `dua_topic_links` (`resource_id`,`topic_id`,`position`);