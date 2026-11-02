/**
 * The URL a recording streams from (ADR 0040, step 14). The API serves recordings from a path such as
 * `/api/v1/azkar/audio/0.0.2/OD-001.mp3`, which is joined to the API base. An absolute `http(s)` URL passes through
 * unchanged, so development fixtures keep working. Anything else is not a URL and resolves to an empty string.
 */
export function resolveAudioUrl(remoteUrl: string, apiBase: string): string {
  const url = remoteUrl.trim();
  if (url.length === 0) {
    return '';
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (url.startsWith('/')) {
    return `${apiBase.replace(/\/+$/, '')}${url}`;
  }
  return '';
}
