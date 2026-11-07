CREATE VIRTUAL TABLE `search_hadith` USING fts5(
	entry_id UNINDEXED,
	resource_id UNINDEXED,
	text_search,
	tokenize = 'unicode61 remove_diacritics 2'
);
