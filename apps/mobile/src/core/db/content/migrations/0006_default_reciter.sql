ALTER TABLE `catalog_resources` ADD `is_default` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- A manifest read by an older app has no is_default, so a 304 would leave every reciter unflagged.
DELETE FROM `meta` WHERE `key` = 'manifest_etag';
