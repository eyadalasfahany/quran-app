// Model → one Skia path per page → one SkPicture per colour (ADR 0090 decision 8). The method is the one the step 1
// speed spike proved: PathBuilder.addPath with each piece's matrix, even-odd fill, then a recorded picture.
import { FillType, Skia, type SkPath, type SkPicture } from '@shopify/react-native-skia';

import { PAGE_VIEWBOX } from './page-layout';
import { PAGE_MODEL_CACHE } from './page-source';
import { type Matrix, type SvgPageModel, SvgPageParseError } from './svg-page-model';

/** The SVG matrix (a b c d e f) as Skia's 3 × 3 row-major array. */
export function toSkMatrix([a, b, c, d, e, f]: Matrix): number[] {
  return [a, c, e, b, d, f, 0, 0, 1];
}

/** Every piece in one path. A piece that Skia cannot read fails the whole page: never a page with holes. */
export function buildPagePath(model: SvgPageModel): SkPath {
  const builder = Skia.PathBuilder.Make();
  for (const piece of model.pieces) {
    const path = Skia.Path.MakeFromSVGString(piece.d);
    if (path === null) {
      throw new SvgPageParseError('A page path could not be read.');
    }
    builder.addPath(path, Skia.Matrix(toSkMatrix(piece.matrix)));
  }
  return builder.setFillType(FillType.EvenOdd).build();
}

/** The path drawn once in `color` (a theme token, never a hex literal in this module), into a picture. */
export function recordPagePicture(path: SkPath, color: string): SkPicture {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, PAGE_VIEWBOX.width, PAGE_VIEWBOX.height));
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(color));
  canvas.drawPath(path, paint);
  return recorder.finishRecordingAsPicture();
}

type PageEntry = { path: SkPath; pictures: Map<string, SkPicture> };

/**
 * Paths and pictures per page id, least recently used first out. A theme change clears the pictures and keeps the
 * paths: re-recording is a drawPath, not a re-parse.
 */
export class PagePictureCache {
  private readonly pages = new Map<string, PageEntry>();

  constructor(private readonly capacity: number = PAGE_MODEL_CACHE) {}

  picture(id: string, model: SvgPageModel, color: string): SkPicture {
    let entry = this.pages.get(id);
    if (entry === undefined) {
      entry = { path: buildPagePath(model), pictures: new Map() };
    } else {
      this.pages.delete(id);
    }
    this.pages.set(id, entry);
    while (this.pages.size > this.capacity) {
      this.pages.delete(this.pages.keys().next().value!);
    }
    let picture = entry.pictures.get(color);
    if (picture === undefined) {
      picture = recordPagePicture(entry.path, color);
      entry.pictures.set(color, picture);
    }
    return picture;
  }

  clearPictures(): void {
    for (const entry of this.pages.values()) {
      entry.pictures.clear();
    }
  }

  clear(): void {
    this.pages.clear();
  }
}
