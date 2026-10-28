// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_pale_arclight.sql';
import m0001 from './0001_search_quran.sql';
import m0002 from './0002_word_map_and_basmala.sql';
import m0003 from './0003_drop_translation_entries.sql';
import m0004 from './0004_resource_names_catalog.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004
    }
  }
  