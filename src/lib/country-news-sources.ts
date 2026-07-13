/**
 * Country-specific news sources with real URLs.
 *
 * These are the most-visited news websites in each country.
 * The Cirkle Brain AI uses these to fetch real, location-relevant news
 * via web_search — querying the actual sites users trust.
 *
 * Sources are organized by country code (ISO-2). Each source has:
 *   - name: display name
 *   - url: the real website URL
 *   - type: government | media | business
 *
 * When a user is in Egypt, the Brain searches masrawy.com, alahram.org, etc.
 * When in Saudi, it searches arabnews.com, alarabiya.net, etc.
 * When in the US, it searches nytimes.com, cnn.com, reuters.com, etc.
 */

export interface CountryNewsSource {
  name: string;
  url: string;
  type: "government" | "media" | "business";
}

export const COUNTRY_NEWS_SOURCES: Record<string, CountryNewsSource[]> = {
  // Egypt — most visited news sites
  EG: [
    { name: "Masrawy", url: "https://www.masrawy.com", type: "media" },
    { name: "Al Ahram", url: "https://gate.ahram.org.eg", type: "media" },
    { name: "Youm7", url: "https://www.youm7.com", type: "media" },
    { name: "Egypt Today", url: "https://www.egypttoday.com", type: "media" },
    { name: "Daily News Egypt", url: "https://www.dailynewsegypt.com", type: "media" },
    { name: "Al Masry Al Youm", url: "https://www.almasryalyoum.com", type: "media" },
  ],
  // Saudi Arabia
  SA: [
    { name: "Arab News", url: "https://www.arabnews.com", type: "media" },
    { name: "Al Arabiya", url: "https://www.alarabiya.net", type: "media" },
    { name: "Saudi Gazette", url: "https://www.saudigazette.com.sa", type: "media" },
    { name: "Asharq Al-Awsat", url: "https://aawsat.com", type: "media" },
    { name: "Al Ekhbariya", url: "https://www.ekhbariya.net", type: "media" },
  ],
  // UAE
  AE: [
    { name: "The National", url: "https://www.thenationalnews.com", type: "media" },
    { name: "Gulf News", url: "https://gulfnews.com", type: "media" },
    { name: "Khaleej Times", url: "https://www.khaleejtimes.com", type: "media" },
    { name: "Emirates News Agency", url: "https://www.wam.ae", type: "government" },
  ],
  // United States
  US: [
    { name: "The New York Times", url: "https://www.nytimes.com", type: "media" },
    { name: "CNN", url: "https://www.cnn.com", type: "media" },
    { name: "Reuters", url: "https://www.reuters.com", type: "media" },
    { name: "Bloomberg", url: "https://www.bloomberg.com", type: "media" },
    { name: "The Washington Post", url: "https://www.washingtonpost.com", type: "media" },
    { name: "Associated Press", url: "https://apnews.com", type: "media" },
  ],
  // United Kingdom
  GB: [
    { name: "BBC News", url: "https://www.bbc.com/news", type: "media" },
    { name: "The Guardian", url: "https://www.theguardian.com", type: "media" },
    { name: "Reuters UK", url: "https://www.reuters.com/world/uk", type: "media" },
    { name: "The Times", url: "https://www.thetimes.co.uk", type: "media" },
    { name: "Sky News", url: "https://news.sky.com", type: "media" },
  ],
  // France
  FR: [
    { name: "Le Monde", url: "https://www.lemonde.fr", type: "media" },
    { name: "Le Figaro", url: "https://www.lefigaro.fr", type: "media" },
    { name: "France 24", url: "https://www.france24.com", type: "media" },
    { name: "Libération", url: "https://www.liberation.fr", type: "media" },
  ],
  // Germany
  DE: [
    { name: "Der Spiegel", url: "https://www.spiegel.de", type: "media" },
    { name: "Die Zeit", url: "https://www.zeit.de", type: "media" },
    { name: "Deutsche Welle", url: "https://www.dw.com", type: "media" },
    { name: "Bild", url: "https://www.bild.de", type: "media" },
  ],
  // India
  IN: [
    { name: "Times of India", url: "https://timesofindia.indiatimes.com", type: "media" },
    { name: "The Hindu", url: "https://www.thehindu.com", type: "media" },
    { name: "NDTV", url: "https://www.ndtv.com", type: "media" },
    { name: "India Today", url: "https://www.indiatoday.in", type: "media" },
    { name: "Hindustan Times", url: "https://www.hindustantimes.com", type: "media" },
  ],
  // China
  CN: [
    { name: "Xinhua", url: "https://www.xinhuanet.com", type: "media" },
    { name: "China Daily", url: "https://www.chinadaily.com.cn", type: "media" },
    { name: "Global Times", url: "https://www.globaltimes.cn", type: "media" },
    { name: "South China Morning Post", url: "https://www.scmp.com", type: "media" },
  ],
  // Japan
  JP: [
    { name: "NHK World", url: "https://www3.nhk.or.jp/nhkworld", type: "media" },
    { name: "The Japan Times", url: "https://www.japantimes.co.jp", type: "media" },
    { name: "Asahi Shimbun", url: "https://www.asahi.com", type: "media" },
    { name: "Yomiuri Shimbun", url: "https://www.yomiuri.co.jp", type: "media" },
  ],
  // Brazil
  BR: [
    { name: "Folha de S.Paulo", url: "https://www1.folha.uol.com.br", type: "media" },
    { name: "O Globo", url: "https://oglobo.globo.com", type: "media" },
    { name: "Estadão", url: "https://www.estadao.com.br", type: "media" },
    { name: "BBC Brasil", url: "https://www.bbc.com/portuguese", type: "media" },
  ],
  // Turkey
  TR: [
    { name: "Hürriyet Daily News", url: "https://www.hurriyetdailynews.com", type: "media" },
    { name: "Daily Sabah", url: "https://www.dailysabah.com", type: "media" },
    { name: "Anadolu Agency", url: "https://www.aa.com.tr", type: "media" },
    { name: "TRT World", url: "https://www.trtworld.com", type: "media" },
  ],
  // Nigeria
  NG: [
    { name: "Premium Times", url: "https://www.premiumtimesng.com", type: "media" },
    { name: "The Guardian Nigeria", url: "https://guardian.ng", type: "media" },
    { name: "Vanguard", url: "https://www.vanguardngr.com", type: "media" },
    { name: "Punch", url: "https://punchng.com", type: "media" },
  ],
  // Kenya
  KE: [
    { name: "Daily Nation", url: "https://nation.africa", type: "media" },
    { name: "The Standard", url: "https://www.standardmedia.co.ke", type: "media" },
    { name: "Capital News", url: "https://www.capitalfm.co.ke", type: "media" },
  ],
  // Russia
  RU: [
    { name: "TASS", url: "https://tass.com", type: "media" },
    { name: "Russia Today", url: "https://www.rt.com", type: "media" },
    { name: "The Moscow Times", url: "https://www.themoscowtimes.com", type: "media" },
  ],
  // South Africa
  ZA: [
    { name: "News24", url: "https://www.news24.com", type: "media" },
    { name: "IOL", url: "https://www.iol.co.za", type: "media" },
    { name: "Times Live", url: "https://www.timeslive.co.za", type: "media" },
  ],
  // Canada
  CA: [
    { name: "CBC News", url: "https://www.cbc.ca/news", type: "media" },
    { name: "The Globe and Mail", url: "https://www.theglobeandmail.com", type: "media" },
    { name: "Toronto Star", url: "https://www.thestar.com", type: "media" },
  ],
  // Australia
  AU: [
    { name: "ABC News", url: "https://www.abc.net.au/news", type: "media" },
    { name: "The Sydney Morning Herald", url: "https://www.smh.com.au", type: "media" },
    { name: "The Guardian Australia", url: "https://www.theguardian.com/au", type: "media" },
  ],
  // Pakistan
  PK: [
    { name: "Dawn", url: "https://www.dawn.com", type: "media" },
    { name: "The Express Tribune", url: "https://tribune.com.pk", type: "media" },
    { name: "Geo News", url: "https://www.geo.tv", type: "media" },
  ],
  // Indonesia
  ID: [
    { name: "The Jakarta Post", url: "https://www.thejakartapost.com", type: "media" },
    { name: "Tempo", url: "https://en.tempo.co", type: "media" },
    { name: "Antara News", url: "https://en.antaranews.com", type: "media" },
  ],
};

/**
 * Get news sources for a country.
 * Falls back to international sources if the country isn't in the map.
 */
export function getCountryNewsSources(countryCode: string): CountryNewsSource[] {
  return COUNTRY_NEWS_SOURCES[countryCode.toUpperCase()] || [
    { name: "Reuters", url: "https://www.reuters.com", type: "media" },
    { name: "BBC News", url: "https://www.bbc.com/news", type: "media" },
    { name: "Al Jazeera", url: "https://www.aljazeera.com", type: "media" },
    { name: "Associated Press", url: "https://apnews.com", type: "media" },
  ];
}

/**
 * Build a web_search query that targets the country's most visited news sites.
 * Example for Egypt: "site:masrawy.com OR site:gate.ahram.org.eg OR site:youm7.com Egypt news today"
 */
export function buildCountryNewsQuery(country: string, city?: string, category?: string, language: string = "en"): string {
  const sources = getCountryNewsSources(country);
  const siteClauses = sources.slice(0, 5).map(s => `site:${new URL(s.url).hostname}`).join(" OR ");
  const locationPart = city ? `${city}` : "";
  const categoryPart = category && category !== "breaking" ? `${category}` : "news";
  const langPart = language === "ar" ? "بالعربية" : "in English";
  return `${categoryPart} ${langPart} ${locationPart} today (${siteClauses})`;
}
