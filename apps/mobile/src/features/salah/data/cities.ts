import citiesData from '../../../../assets/salah/cities.json';

export interface City {
  id: string;
  ar: string;
  en: string;
  lat: number;
  lng: number;
  country_ar?: string;
  country_en?: string;
}

const allCities: City[] = citiesData;

// Function to normalize Arabic text for search
const normalizeArabic = (text: string): string => {
  return text
    .replace(/[\u064B-\u065F]/g, '') // Remove diacritics
    .replace(/\u0640/g, '') // Remove tatweel
    .replace(/[أإآ]/g, 'ا') // Normalize أإآ to ا
    .replace(/ة/g, 'ه') // Normalize ة to ه
    .replace(/ى/g, 'ي') // Normalize ى to ي
    .trim();
};

export const searchCities = (query: string, limit: number = 10): City[] => {
  if (!query) {
    return [];
  }

  const lowerCaseQuery = query.toLowerCase();
  const normalizedArabicQuery = normalizeArabic(query);

  const results = allCities.filter(city => {
    const matchEnglish = city.en.toLowerCase().includes(lowerCaseQuery);
    const matchArabic = normalizeArabic(city.ar).includes(normalizedArabicQuery);
    return matchEnglish || matchArabic;
  });

  return results.slice(0, limit);
};

export const getCityById = (id: string): City | undefined => {
  return allCities.find(city => city.id === id);
};
