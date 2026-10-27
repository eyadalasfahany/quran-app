const BASMALA_FIRST = new Set(['بِسْمِ', 'بِّسْمِ']);

const BASMALA_TAILS = new Set([
  'ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
  'اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ',
]);

export type BasmalaSplit = {
  bismillah: string | null;
  text: string;
};

export function splitBasmala(suraNumber: number, ayaNumber: number, text: string): BasmalaSplit {
  if (ayaNumber !== 1 || suraNumber === 1 || suraNumber === 9) {
    return { bismillah: null, text };
  }

  const tokens = text.split(' ');

  if (tokens.length < 5 || tokens.some((token) => token === '')) {
    return { bismillah: null, text };
  }

  const first = tokens[0];
  const tail = tokens.slice(1, 4).join(' ');

  if (first === undefined || !BASMALA_FIRST.has(first) || !BASMALA_TAILS.has(tail)) {
    return { bismillah: null, text };
  }

  return {
    bismillah: tokens.slice(0, 4).join(' '),
    text: tokens.slice(4).join(' '),
  };
}
