ALTER TABLE `catalog_resources` ADD `style` text;--> statement-breakpoint
-- A manifest read by an older app has no style, so a 304 would leave every reciter without its style tag.
DELETE FROM `meta` WHERE `key` = 'manifest_etag';
