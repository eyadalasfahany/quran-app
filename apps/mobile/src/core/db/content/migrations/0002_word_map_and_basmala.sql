CREATE TABLE `words` (
	`verse_id` integer NOT NULL,
	`position` integer NOT NULL,
	`char_type` text NOT NULL,
	`text_uthmani` text NOT NULL,
	`text_imlaei` text NOT NULL,
	PRIMARY KEY(`verse_id`, `position`)
);
--> statement-breakpoint
CREATE INDEX `words_verse_id_idx` ON `words` (`verse_id`);--> statement-breakpoint
ALTER TABLE `chapters` ADD `bismillah_text` text;--> statement-breakpoint
ALTER TABLE `chapters` ADD `bismillah_imlaei` text;