// A recording stand-in for @shopify/react-native-skia (Jest only). Skia's native module cannot run in Jest. The mock
// logs every Skia call and every drawing component in render order, so tests can assert what was drawn and in what
// order. Components render their children inside a View, so the React tree still follows the JSX.
import type { ReactNode } from 'react';
import { View } from 'react-native';

export type SkiaCall = { op: string; [key: string]: unknown };

export const skiaCalls: SkiaCall[] = [];

export function resetSkiaCalls(): void {
  skiaCalls.length = 0;
}

let nextId = 1;

type FakePath = { kind: 'path'; id: number; d?: string; fill?: number };
type FakeMatrix = { values: readonly number[] };
type FakePicture = { kind: 'picture'; id: number; color: string };

const FillType = { EvenOdd: 1, Winding: 0 } as const;

function pathBuilder() {
  const builder = {
    addPoly(points: readonly { x: number; y: number }[], close: boolean) {
      skiaCalls.push({ close, op: 'addPoly', points: points.length });
      return builder;
    },
    addPath(path: FakePath, matrix?: FakeMatrix) {
      skiaCalls.push({ matrix: matrix?.values, op: 'addPath', path: path.id });
      return builder;
    },
    build(): FakePath {
      const built: FakePath = { id: nextId++, kind: 'path' };
      skiaCalls.push({ op: 'build', path: built.id });
      return built;
    },
    setFillType(fill: number) {
      skiaCalls.push({ fill, op: 'setFillType' });
      return builder;
    },
  };
  return builder;
}

const Skia = {
  Color: (color: string) => color,
  Matrix: (values: readonly number[] = []): FakeMatrix => ({ values }),
  Paint: () => {
    const paint = {
      color: '',
      setAntiAlias: () => undefined,
      setColor(color: string) {
        paint.color = color;
      },
    };
    return paint;
  },
  Path: {
    MakeFromSVGString: (d: string): FakePath | null => {
      if (d.includes('UNREADABLE')) {
        return null;
      }
      skiaCalls.push({ d, op: 'fromSvg' });
      return { d, id: nextId++, kind: 'path' };
    },
  },
  PathBuilder: {
    Make: () => {
      skiaCalls.push({ op: 'pathBuilder' });
      return pathBuilder();
    },
  },
  PictureRecorder: () => {
    let color = '';
    let path: FakePath | null = null;
    return {
      beginRecording: (rect: unknown) => {
        skiaCalls.push({ op: 'beginRecording', rect });
        return {
          drawPath(drawn: FakePath, paint: { color: string }) {
            path = drawn;
            color = paint.color;
            skiaCalls.push({ color, op: 'drawPath', path: drawn.id });
          },
        };
      },
      finishRecordingAsPicture: (): FakePicture => {
        const picture: FakePicture = { color, id: nextId++, kind: 'picture' };
        skiaCalls.push({ op: 'finishRecording', picture: picture.id, path: path?.id ?? null });
        return picture;
      },
    };
  },
  XYWHRect: (x: number, y: number, width: number, height: number) => ({ height, width, x, y }),
};

export { FillType, Skia };

type Props = Record<string, unknown> & { children?: ReactNode };

function drawing(op: string) {
  return function Drawing(props: Props) {
    skiaCalls.push({ op, ...pick(props) });
    return <View testID={typeof props.testID === 'string' ? props.testID : op}>{props.children}</View>;
  };
}

// Keeps the plain props, and reduces a Skia object prop (a path or picture) to its id and colour, for the logs.
function pick(props: Props): Record<string, unknown> {
  const { children: _children, ...rest } = props;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value !== null && typeof value === 'object' && 'kind' in value) {
      out[key] = (value as FakePath | FakePicture).id;
      if ((value as FakePicture).kind === 'picture') {
        out[`${key}Color`] = (value as FakePicture).color;
      }
    } else if (Array.isArray(value)) {
      out[key] = JSON.stringify(value);
    } else if (value === null || typeof value !== 'object') {
      out[key] = value;
    } else {
      // A Skia value without an id here (a shared value, a clip): its presence is what the tests check.
      out[key] = 'object';
    }
  }
  return out;
}

export const Canvas = drawing('Canvas');
export const Group = drawing('Group');
export const Path = drawing('Path');
export const Picture = drawing('Picture');
export const CornerPathEffect = drawing('CornerPathEffect');
export const Rect = drawing('Rect');
export const RoundedRect = drawing('RoundedRect');
