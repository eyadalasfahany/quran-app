import { QURAN_QUOTE_CLASS, wrapQuranQuotes } from './tafsir-quotes';

describe('wrapQuranQuotes', () => {
  it('wraps a {…} fragment in the quote span', () => {
    expect(wrapQuranQuotes('<p>قوله {إِيَّاكَ نَعْبُدُ} مناسب</p>')).toBe(
      `<p>قوله <span class="${QURAN_QUOTE_CLASS}">{إِيَّاكَ نَعْبُدُ}</span> مناسب</p>`,
    );
  });

  it('wraps a ﴿…﴾ citation in the quote span', () => {
    expect(wrapQuranQuotes('<p>كقوله ﴿بِسْمِ ٱللَّهِ ١﴾ هنا</p>')).toBe(
      `<p>كقوله <span class="${QURAN_QUOTE_CLASS}">﴿بِسْمِ ٱللَّهِ ١﴾</span> هنا</p>`,
    );
  });

  it('wraps every quote and keeps the delimiters and text byte for byte', () => {
    const html = '<p>{أ} ثم ﴿ب ٢﴾ ثم {ج}</p>';
    const wrapped = wrapQuranQuotes(html);

    expect(wrapped.match(/quran-quote/g)).toHaveLength(3);
    expect(wrapped.replace(/<span class="quran-quote">|<\/span>/g, '')).toBe(html);
  });

  it('leaves prose without quotes untouched', () => {
    expect(wrapQuranQuotes('<p>الحمد لله <b>رب</b> العالمين</p>')).toBe('<p>الحمد لله <b>رب</b> العالمين</p>');
  });
});
