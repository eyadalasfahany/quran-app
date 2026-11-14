// Data-layer objects the Seerah screens read from content.db (ADR 0089). Arabic text is the book's own, as stored.

export type SeerahBook = {
  resourceId: number;
  slug: string;
  titleAr: string;
  authorAr: string;
  editionAr: string;
  attributionAr: string;
  attributionEn: string;
  sectionsCount: number;
  paragraphsCount: number;
  placesCount: number;
  eventsCount: number;
  routesCount: number;
};

/** The pack as the synced catalogue lists it; `installed` once its rows are in content.db. */
export type SeerahCatalogEntry = {
  resourceId: number;
  version: number;
  packSizeBytes: number;
  installed: boolean;
};

export type SeerahSection = {
  id: string;
  level: string;
  titleAr: string;
  page: number;
  position: number;
};

export type SeerahEvidence = {
  kind: 'place' | 'year';
  position: number;
  paragraphId: string;
  quoteAr: string;
};

/** The paragraphs of an event's span, with the page the first one is on. */
export type SeerahEventText = {
  paragraphs: import('../types').SeerahParagraph[];
  sourcePage: number | null;
};
