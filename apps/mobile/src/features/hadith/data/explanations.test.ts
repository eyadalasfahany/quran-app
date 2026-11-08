import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { openAzkarContentDb } from '../../../../jest/azkar-test-db';

import { explanationsFor, uninstalledExplanationResourceIds } from './explanations';

// Placeholder text only (ADR 0014 / the fixture rule): no real hadith or explanation text.
const BODY = ' نص تجريبي ١ — ليس شرحًا‏ ';
const INTRO = 'مقدمة تجريبية ١';
const BENEFIT = 'فائدة تجريبية ١';
const WORDS = [{ word: 'كلمة تجريبية', meaning: 'معنى تجريبي' }];

const SLUG = 'fixture-explained';
const NUMBER = '42';
const FIRST = 71;
const SECOND = 72;

describe('hadith explanations repository', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
  });

  afterEach(() => {
    database.close();
  });

  function install(resourceId: number, name: string, nameAr: string, installed = true) {
    executor.run(
      `INSERT INTO catalog_resources (resource_id, "group", name, name_ar, version, pack_size_bytes, is_default)
       VALUES (?, 'hadith_explanations', ?, ?, 1, 1, 0)`,
      [resourceId, name, nameAr],
    );
    if (installed) {
      executor.run(
        `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, name, name_ar)
         VALUES (?, 'hadith_explanations', 1, 'fixture', 0, ?, ?)`,
        [resourceId, name, nameAr],
      );
    }
  }

  function explanation(resourceId: number, id: number, over: Record<string, string | null> = {}) {
    executor.run(
      `INSERT INTO hadith_explanations (resource_id, id, title_ar, attribution_ar, reference_ar, body_ar, benefits_ar, words_ar, intro_ar, source_url)
       VALUES (?, ?, NULL, NULL, NULL, ?, ?, ?, ?, 'https://example.test/fixture')`,
      [
        resourceId,
        id,
        'body_ar' in over ? over.body_ar ?? null : BODY,
        'benefits_ar' in over ? over.benefits_ar ?? null : JSON.stringify([BENEFIT]),
        'words_ar' in over ? over.words_ar ?? null : JSON.stringify(WORDS),
        'intro_ar' in over ? over.intro_ar ?? null : INTRO,
      ],
    );
  }

  function link(resourceId: number, explanationId: number, slug = SLUG, number = NUMBER) {
    executor.run(
      `INSERT INTO hadith_explanation_links (resource_id, collection_slug, hadith_number, explanation_id) VALUES (?, ?, ?, ?)`,
      [resourceId, slug, number, explanationId],
    );
  }

  it('returns the explanations of a hadith in resource order, then id order', () => {
    install(SECOND, 'FIXTURE second source', 'مصدر تجريبي ثانٍ');
    install(FIRST, 'FIXTURE first source', 'مصدر تجريبي أول');
    explanation(SECOND, 1);
    explanation(FIRST, 2);
    explanation(FIRST, 1);
    link(SECOND, 1);
    link(FIRST, 2);
    link(FIRST, 1);

    const views = explanationsFor(executor, SLUG, NUMBER, 'ar');
    expect(views.map((view) => view.sourceName)).toEqual(['مصدر تجريبي أول', 'مصدر تجريبي أول', 'مصدر تجريبي ثانٍ']);
    expect(views).toHaveLength(3);
  });

  it('maps the fields and keeps the body byte for byte', () => {
    install(FIRST, 'FIXTURE source', 'مصدر تجريبي');
    explanation(FIRST, 1);
    link(FIRST, 1);

    expect(explanationsFor(executor, SLUG, NUMBER, 'ar')).toEqual([
      {
        sourceName: 'مصدر تجريبي',
        explanation: BODY,
        benefits: [BENEFIT],
        wordMeanings: WORDS,
        intro: INTRO,
      },
    ]);
  });

  it('reads the source name in the UI language', () => {
    install(FIRST, 'FIXTURE source', 'مصدر تجريبي');
    explanation(FIRST, 1);
    link(FIRST, 1);

    expect(explanationsFor(executor, SLUG, NUMBER, 'en')[0]?.sourceName).toBe('FIXTURE source');
    expect(explanationsFor(executor, SLUG, NUMBER, 'ar')[0]?.sourceName).toBe('مصدر تجريبي');
  });

  it('gives null for a field whose JSON does not parse, and keeps the rest of the row', () => {
    install(FIRST, 'FIXTURE source', 'مصدر تجريبي');
    explanation(FIRST, 1, { benefits_ar: '{not json', words_ar: '[broken' });
    link(FIRST, 1);

    const [view] = explanationsFor(executor, SLUG, NUMBER, 'ar');
    expect(view?.benefits).toBeNull();
    expect(view?.wordMeanings).toBeNull();
    expect(view?.explanation).toBe(BODY);
  });

  it('skips a row with no body and no benefits or word meanings', () => {
    install(FIRST, 'FIXTURE source', 'مصدر تجريبي');
    explanation(FIRST, 1, { body_ar: null, benefits_ar: '[]', words_ar: null });
    explanation(FIRST, 2, { body_ar: null, benefits_ar: JSON.stringify([BENEFIT]), words_ar: null });
    link(FIRST, 1);
    link(FIRST, 2);

    const views = explanationsFor(executor, SLUG, NUMBER, 'ar');
    expect(views).toHaveLength(1);
    expect(views[0]?.benefits).toEqual([BENEFIT]);
  });

  it('returns nothing for an explanation whose resource is not installed', () => {
    install(FIRST, 'FIXTURE source', 'مصدر تجريبي', false);
    explanation(FIRST, 1);
    link(FIRST, 1);

    expect(explanationsFor(executor, SLUG, NUMBER, 'ar')).toEqual([]);
  });

  it('matches only the given collection and hadith number', () => {
    install(FIRST, 'FIXTURE source', 'مصدر تجريبي');
    explanation(FIRST, 1);
    link(FIRST, 1, 'other-collection', NUMBER);
    link(FIRST, 1, SLUG, '43');

    expect(explanationsFor(executor, SLUG, NUMBER, 'ar')).toEqual([]);
  });

  it('lists the uninstalled explanation resources only', () => {
    install(FIRST, 'FIXTURE source', 'مصدر تجريبي', false);
    install(SECOND, 'FIXTURE other', 'مصدر آخر');
    expect(uninstalledExplanationResourceIds(executor)).toEqual([FIRST]);
  });
});
