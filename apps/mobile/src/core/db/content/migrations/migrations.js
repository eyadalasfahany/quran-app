// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_pale_arclight.sql';
import m0001 from './0001_search_quran.sql';
import m0002 from './0002_word_map_and_basmala.sql';
import m0003 from './0003_drop_translation_entries.sql';
import m0004 from './0004_resource_names_catalog.sql';
import m0005 from './0005_author_ar.sql';
import m0006 from './0006_default_reciter.sql';
import m0007 from './0007_reciter_style.sql';
import m0008 from './0008_mixed_darkstar.sql';
import m0009 from './0009_bent_smasher.sql';
import m0010 from './0010_names_pack.sql';
import m0011 from './0011_duas_tables.sql';
import m0012 from './0012_hadith_tables.sql';
import m0013 from './0013_search_hadith.sql';
import m0014 from './0014_hadith_number_range.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005,
m0006,
m0007,
m0008,
m0009,
m0010,
m0011,
m0012,
m0013,
m0014
    }
  }
  