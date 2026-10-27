const deviceLanguage = globalThis as typeof globalThis & {
  __quranDeviceLanguage?: string | null;
};

export function deviceLanguageCode(): string | null {
  return deviceLanguage.__quranDeviceLanguage === undefined ? 'en' : deviceLanguage.__quranDeviceLanguage;
}

export function setDeviceLanguageCode(code: string | null): void {
  deviceLanguage.__quranDeviceLanguage = code;
}
