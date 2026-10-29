ALTER TABLE `catalog_resources` ADD `author_ar` text;--> statement-breakpoint
ALTER TABLE `installed_resources` ADD `author_ar` text;--> statement-breakpoint
-- A manifest read by an older app may already carry author_ar under this ETag, so a 304 would never backfill it.
DELETE FROM `meta` WHERE `key` = 'manifest_etag';
