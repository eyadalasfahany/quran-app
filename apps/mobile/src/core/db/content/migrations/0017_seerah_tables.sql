CREATE TABLE `seerah_books` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`slug` text NOT NULL,
	`title_ar` text NOT NULL,
	`author_ar` text NOT NULL,
	`edition_ar` text NOT NULL,
	`attribution_ar` text NOT NULL,
	`attribution_en` text NOT NULL,
	`sections_count` integer NOT NULL,
	`paragraphs_count` integer NOT NULL,
	`places_count` integer NOT NULL,
	`events_count` integer NOT NULL,
	`routes_count` integer NOT NULL,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE TABLE `seerah_event_evidence` (
	`resource_id` integer NOT NULL,
	`event_id` integer NOT NULL,
	`kind` text NOT NULL,
	`position` integer NOT NULL,
	`paragraph_id` integer NOT NULL,
	`quote_ar` text NOT NULL,
	PRIMARY KEY(`resource_id`, `event_id`, `kind`, `position`)
);
--> statement-breakpoint
CREATE TABLE `seerah_events` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`slug` text NOT NULL,
	`position` integer NOT NULL,
	`section_id` integer NOT NULL,
	`paragraph_from` integer,
	`paragraph_to` integer,
	`title_ar` text NOT NULL,
	`kind` text NOT NULL,
	`place_id` integer,
	`place_basis` text,
	`also` text NOT NULL,
	`age_from` integer,
	`age_to` integer,
	`era` text,
	`hijri_from` integer,
	`hijri_to` integer,
	`year_basis` text,
	`certainty` text,
	`route_id` integer,
	`flags` text NOT NULL,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `seerah_events_position_idx` ON `seerah_events` (`resource_id`,`position`);--> statement-breakpoint
CREATE INDEX `seerah_events_age_idx` ON `seerah_events` (`resource_id`,`age_from`);--> statement-breakpoint
CREATE TABLE `seerah_map_levels` (
	`resource_id` integer NOT NULL,
	`level` text NOT NULL,
	`parent_place_id` integer NOT NULL,
	`viewbox` text NOT NULL,
	`art` text NOT NULL,
	PRIMARY KEY(`resource_id`, `level`)
);
--> statement-breakpoint
CREATE TABLE `seerah_map_positions` (
	`resource_id` integer NOT NULL,
	`level` text NOT NULL,
	`place_id` integer NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`label_priority` integer NOT NULL,
	`label_side` text NOT NULL,
	PRIMARY KEY(`resource_id`, `level`, `place_id`)
);
--> statement-breakpoint
CREATE TABLE `seerah_map_route_paths` (
	`resource_id` integer NOT NULL,
	`level` text NOT NULL,
	`route_id` integer NOT NULL,
	`from_place_id` integer NOT NULL,
	`to_place_id` integer NOT NULL,
	`path_d` text NOT NULL,
	PRIMARY KEY(`resource_id`, `level`, `route_id`, `from_place_id`, `to_place_id`)
);
--> statement-breakpoint
CREATE TABLE `seerah_milestones` (
	`resource_id` integer NOT NULL,
	`milestone_key` text NOT NULL,
	`label_ar` text NOT NULL,
	`event_id` integer NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`resource_id`, `milestone_key`)
);
--> statement-breakpoint
CREATE TABLE `seerah_paragraphs` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`section_id` integer NOT NULL,
	`position` integer NOT NULL,
	`page` integer NOT NULL,
	`text_ar` text NOT NULL,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `seerah_paragraphs_section_idx` ON `seerah_paragraphs` (`resource_id`,`section_id`,`position`);--> statement-breakpoint
CREATE TABLE `seerah_places` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`slug` text NOT NULL,
	`parent_id` integer,
	`kind` text NOT NULL,
	`name_ar` text NOT NULL,
	`lat` real,
	`lng` real,
	`geo_precision` text,
	`flags` text NOT NULL,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE TABLE `seerah_route_stops` (
	`resource_id` integer NOT NULL,
	`route_id` integer NOT NULL,
	`position` integer NOT NULL,
	`place_id` integer NOT NULL,
	PRIMARY KEY(`resource_id`, `route_id`, `position`)
);
--> statement-breakpoint
CREATE TABLE `seerah_routes` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`slug` text NOT NULL,
	`kind` text NOT NULL,
	`name_ar` text NOT NULL,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE TABLE `seerah_sections` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`code` text NOT NULL,
	`level` text NOT NULL,
	`title_ar` text NOT NULL,
	`page` integer NOT NULL,
	`position` integer NOT NULL,
	`paragraph_from` integer,
	`paragraph_to` integer,
	PRIMARY KEY(`resource_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `seerah_sections_position_idx` ON `seerah_sections` (`resource_id`,`position`);