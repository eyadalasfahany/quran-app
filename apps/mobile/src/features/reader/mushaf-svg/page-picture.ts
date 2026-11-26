// Model → one Skia path per page → one SkPicture per colour (ADR 0090 decision 8). The method is the one the step 1
// speed spike proved: PathBuilder.addPath with each piece's matrix, even-odd fill, then a recorded picture.
import { FillType, Skia, type SkPath, type SkPicture } from '@shopify/react-native-skia';

import { PAGE_VIEWBOX } from './page-layout';
import { PAGE_MODEL_CACHE } from './page-source';
import { type Matrix, type SvgPageModel, SvgPageParseError } from './svg-page-model';
import { TQP_GRID, type TqpDecoded } from './tqp-decoder';
import { absoluteCommands, type SubpathTable } from './tqp-subpaths';

/** The SVG matrix (a b c d e f) as Skia's 3 × 3 row-major array. */
export function toSkMatrix([a, b, c, d, e, f]: Matrix): number[] {
  return [a, c, e, b, d, f, 0, 0, 1];
}

/** Every piece in one path. A piece that Skia cannot read fails the whole page: never a page with holes. */
export function buildPagePath(model: SvgPageModel): SkPath {
  if (model.decoded !== undefined) {
    return buildTqpPath(model.decoded);
  }
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

/** Points per command, as tqp-decoder.ts: M L Q C Z. */
const POINT_COUNT = [1, 1, 2, 3, 0] as const;

/**
 * Builder (ii), the one the loader uses (step 12 C2: on Hermes it beat building and parsing an SVG string, about 10 ms
 * against 30 ms a page): the page's relative calls straight on a PathBuilder in grid units, then one addPath at the 1/32
 * scale. Skia's relative move after close() starts from the subpath start, as SVG's does.
 */
export function buildTqpPath(decoded: TqpDecoded): SkPath {
  const grid = Skia.PathBuilder.Make();
  const d = decoded.deltas;
  const cmds = decoded.cmds;
  let at = 0;
  // Indexed loops: Hermes iterates a typed array by index far faster than with for...of.
  for (let i = 0; i < cmds.length; i += 1) {
    const code = cmds[i]!;
    switch (code) {
      case 0:
        grid.rMoveTo(d[at]!, d[at + 1]!);
        break;
      case 1:
        grid.rLineTo(d[at]!, d[at + 1]!);
        break;
      case 2:
        grid.rQuadTo(d[at]!, d[at + 1]!, d[at + 2]!, d[at + 3]!);
        break;
      case 3:
        grid.rCubicTo(d[at]!, d[at + 1]!, d[at + 2]!, d[at + 3]!, d[at + 4]!, d[at + 5]!);
        break;
      default:
        grid.close();
    }
    at += POINT_COUNT[code]! * 2;
  }
  const scale = 1 / TQP_GRID;
  const out = Skia.PathBuilder.Make();
  out.addPath(grid.build(), Skia.Matrix(toSkMatrix([scale, 0, 0, scale, 0, 0])));
  return out.setFillType(FillType.EvenOdd).build();
}

/**
 * The path of one unit's subpath runs in page units (ADR 0090 step 13, B3): the absolute commands of each run, on the
 * grid, then one addPath at the 1/32 scale. Even-odd within the unit only; units are drawn one by one (rewrap-picture).
 */
export function buildRunsPath(decoded: TqpDecoded, table: SubpathTable, runs: readonly { first: number; count: number }[]): SkPath {
  const grid = Skia.PathBuilder.Make();
  for (const run of runs) {
    for (const { code, points } of absoluteCommands(decoded, table, run.first, run.count)) {
      if (code === 0) {
        grid.moveTo(points[0]!, points[1]!);
      } else if (code === 1) {
        grid.lineTo(points[0]!, points[1]!);
      } else if (code === 2) {
        grid.quadTo(points[0]!, points[1]!, points[2]!, points[3]!);
      } else if (code === 3) {
        grid.cubicTo(points[0]!, points[1]!, points[2]!, points[3]!, points[4]!, points[5]!);
      } else {
        grid.close();
      }
    }
  }
  const scale = 1 / TQP_GRID;
  const out = Skia.PathBuilder.Make();
  out.addPath(grid.build(), Skia.Matrix(toSkMatrix([scale, 0, 0, scale, 0, 0])));
  return out.setFillType(FillType.EvenOdd).build();
}

/** A placed unit to draw: its path (page units) and the SVG matrix that places it on the layout's picture. */
export type PlacedPath = { path: SkPath; matrix: Matrix };

/**
 * One picture of a zoomed page (rewrap-layout.ts). Each unit is its own drawPath under its own matrix, so an overlap
 * between two units paints as a union (a shared even-odd fill would cancel the overlap).
 */
export function recordZoomPicture(items: readonly PlacedPath[], width: number, height: number, color: string): SkPicture {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, width, height));
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(color));
  for (const item of items) {
    canvas.save();
    canvas.concat(Skia.Matrix(toSkMatrix(item.matrix)));
    canvas.drawPath(item.path, paint);
    canvas.restore();
  }
  return recorder.finishRecordingAsPicture();
}

/** Zoomed pictures per (page, zoom, colour). A zoom change drops every picture of the other zooms (clearZoom). */
export class ZoomPictureCache {
  private readonly entries = new Map<string, { zoom: number; picture: SkPicture }>();

  constructor(private readonly capacity: number = 12) {}

  picture(page: string, zoom: number, color: string, build: () => SkPicture): SkPicture {
    const key = `${page}|${zoom}|${color}`;
    const hit = this.entries.get(key);
    if (hit !== undefined) {
      this.entries.delete(key);
      this.entries.set(key, hit);
      return hit.picture;
    }
    const picture = build();
    this.entries.set(key, { picture, zoom });
    while (this.entries.size > this.capacity) {
      this.entries.delete(this.entries.keys().next().value!);
    }
    return picture;
  }

  /** Drops the pictures of every zoom but `except` (a zoom change: the old zoom's pictures are not needed). */
  clearZoom(except: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.zoom !== except) {
        this.entries.delete(key);
      }
    }
  }

  clear(): void {
    this.entries.clear();
  }
}

/** Word paths of the pages, least recently used first out. Four pages: the zoom works on the visible ones. */
export class PageUnitPathCache {
  private readonly pages = new Map<string, Map<string, SkPath>>();

  constructor(private readonly capacity: number = 4) {}

  pagePaths(page: string): Map<string, SkPath> {
    const hit = this.pages.get(page) ?? new Map<string, SkPath>();
    this.pages.delete(page);
    this.pages.set(page, hit);
    while (this.pages.size > this.capacity) {
      this.pages.delete(this.pages.keys().next().value!);
    }
    return hit;
  }

  clear(): void {
    this.pages.clear();
  }
}
