CREATE TABLE `hadith_explanation_links` (
	`resource_id` integer NOT NULL,
	`collection_slug` text NOT NULL,
	`hadith_number` text NOT NULL,
	`explanation_id` integer NOT NULL,
	PRIMARY KEY(`resource_id`, `collection_slug`, `hadith_number`, `explanation_id`)
);
--> statement-breakpoint
CREATE INDEX `hadith_explanation_links_number_idx` ON `hadith_explanation_links` (`collection_slug`,`hadith_number`);--> statement-breakpoint
CREATE TABLE `hadith_explanations` (
	`resource_id` integer NOT NULL,
	`id` integer NOT NULL,
	`title_ar` text,
	`attribution_ar` text,
	`reference_ar` text,
	`body_ar` text,
	`benefits_ar` text,
	`words_ar` text,
	`intro_ar` text,
	`source_url` text NOT NULL,
	PRIMARY KEY(`resource_id`, `id`)
);
