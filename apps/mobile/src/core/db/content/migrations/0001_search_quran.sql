CREATE VIRTUAL TABLE `search_quran` USING fts5(
	verse_id UNINDEXED,
	text_search,
	tokenize = 'unicode61 remove_diacritics 2'
);
