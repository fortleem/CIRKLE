/**
 * Cirkle Brain AI — Egypt Location Knowledge
 *
 * Comprehensive database of events, malls, hotels, restaurants, and cafes
 * across Egypt's neighborhoods. This trains the Brain to give location-aware
 * recommendations when the user is in Egypt.
 *
 * Data sources: web search results + Google Maps data + local knowledge
 * This module is the Brain's "memory" of what's around the user.
 */

// ── Cairo Events (sports, political, fairs, cultural, entertainment) ──────
export interface CairoEvent {
  id: string;
  title: string;
  category: "sports" | "political" | "fair" | "cultural" | "entertainment" | "religious" | "tech";
  venue: string;
  neighborhood: string;
  date: string;
  description: string;
  price: string;
  url?: string;
}

export const CAIRO_EVENTS: CairoEvent[] = [
  // Sports
  { id: "evt-1", title: "Egypt Premier League Matches", category: "sports", venue: "Cairo International Stadium", neighborhood: "Nasr City", date: "Weekly", description: "Al Ahly & Zamalek home matches. Egypt's biggest football rivalry.", price: "50-500 EGP", url: "https://www.etickets.eg" },
  { id: "evt-2", title: "Cairo International Marathon", category: "sports", venue: "New Cairo", neighborhood: "New Cairo", date: "Annual (January)", description: "Full marathon, half marathon, and 5K fun run through New Cairo streets.", price: "200-600 EGP" },
  { id: "evt-3", title: "Squash International Tournament", category: "sports", venue: "Palm Hills Club", neighborhood: "6th of October", date: "Annual", description: "PSA World Tour squash event at one of Egypt's top squash facilities.", price: "Free-150 EGP" },
  { id: "evt-4", title: "Egypt Basketball League", category: "sports", venue: "Cairo Stadium Halls", neighborhood: "Nasr City", date: "October-April", description: "Regular season basketball games featuring Al Ahly, Zamalek, and Al Geish.", price: "30-100 EGP" },

  // Political / Conferences
  { id: "evt-5", title: "Cairo International Book Fair", category: "fair", venue: "Egypt International Exhibition Center", neighborhood: "New Cairo", date: "January-February", description: "One of the world's largest book fairs. Over 2 million visitors, 1,200+ publishers from 35 countries.", price: "Free entry", url: "https://www.cairobookfair.com" },
  { id: "evt-6", title: "Cairo ICT Exhibition", category: "tech", venue: "Egypt International Exhibition Center", neighborhood: "New Cairo", date: "November", description: "Middle East's leading tech expo. AI, fintech, cybersecurity, smart cities.", price: "Free-300 EGP", url: "https://www.cairoict.com" },
  { id: "evt-7", title: "Egypt Energy Show (EGYPES)", category: "fair", venue: "Egypt International Exhibition Center", neighborhood: "New Cairo", date: "February", description: "International energy conference + exhibition. Oil, gas, renewables.", price: "Trade only" },
  { id: "evt-8", title: "Arab African Conference", category: "political", venue: "Nile Ritz-Carlton", neighborhood: "Downtown Cairo", date: "Periodic", description: "Diplomatic conferences on regional cooperation and economic development.", price: "Invite only" },

  // Cultural
  { id: "evt-9", title: "Sound & Light Show at Pyramids", category: "cultural", venue: "Giza Pyramids Plateau", neighborhood: "Giza", date: "Nightly", description: "Spectacular narrated light show telling 5,000 years of Egyptian history at the Pyramids.", price: "150-300 EGP" },
  { id: "evt-10", title: "Cairo Opera House Performances", category: "cultural", venue: "Cairo Opera House", neighborhood: "Zamalek", date: "Year-round", description: "Ballet, opera, symphony, Arabic music concerts. Egypt's premier cultural venue.", price: "50-500 EGP", url: "https://www.cairoopera.org" },
  { id: "evt-11", title: "Wekalet El Ghouri Tannoura Show", category: "cultural", venue: "Wekalet El Ghouri", neighborhood: "Islamic Cairo", date: "Mon/Wed/Sat 8PM", description: "Free Sufi whirling dervish performance in a 500-year-old caravanserai.", price: "Free" },
  { id: "evt-12", title: "Cairo International Film Festival", category: "entertainment", venue: "Cairo Opera House", neighborhood: "Zamalek", date: "November", description: "Oldest film festival in the Arab world. International + Arab cinema premieres.", price: "50-200 EGP" },

  // Entertainment
  { id: "evt-13", title: "AUC Tahrir Cultural Center Events", category: "cultural", venue: "AUC Tahrir Campus", neighborhood: "Downtown Cairo", date: "Weekly", description: "Art exhibitions, book launches, lectures, concerts at the American University cultural center.", price: "Free-100 EGP" },
  { id: "evt-14", title: "Al-Azhar Park Concerts", category: "entertainment", venue: "Al-Azhar Park", neighborhood: "Islamic Cairo", date: "Seasonal", description: "Open-air concerts with Nile-view backdrop. Arabic music, jazz, family events.", price: "Park entry 10 EGP + ticket" },
  { id: "evt-15", title: "D-CAF Festival (Downtown Contemporary Arts)", category: "cultural", venue: "Various Downtown venues", neighborhood: "Downtown Cairo", date: "March-April", description: "Contemporary dance, theater, music, and visual arts across historic Downtown Cairo.", price: "50-200 EGP" },
  { id: "evt-16", title: "Cairo Jazz Festival", category: "entertainment", venue: "AUC Arts Center + venues", neighborhood: "New Cairo", date: "October", description: "International + Egyptian jazz artists across multiple stages.", price: "100-400 EGP" },

  // Tech / Startup
  { id: "evt-17", title: "RiseUp Summit", category: "tech", venue: "Greek Campus", neighborhood: "Downtown Cairo", date: "December", description: "Middle East's largest entrepreneurship summit. Startups, investors, tech leaders.", price: "500-2000 EGP", url: "https://www.riseupsummit.com" },
  { id: "evt-18", title: "Startup Grind Cairo", category: "tech", venue: "Various (AUC, Greek Campus)", neighborhood: "Downtown/New Cairo", date: "Monthly", description: "Monthly startup events with fireside chats, networking, and pitches.", price: "Free-150 EGP" },

  // Religious
  { id: "evt-19", title: "Moulid of Sayyida Zainab", category: "religious", venue: "Sayyida Zainab Mosque", neighborhood: "Sayyida Zainab", date: "Annual (varies)", description: "Egypt's largest religious festival. Sufi chants, street food, carnival rides.", price: "Free" },
  { id: "evt-20", title: "Coptic Christmas at St. Mark's", category: "religious", venue: "St. Mark's Coptic Cathedral", neighborhood: "Abbassiya", date: "January 7", description: "Coptic Christmas mass + celebrations. Largest Coptic cathedral in Egypt.", price: "Free" },
];

// ── Cairo Neighborhoods + Venues ──────────────────────────────────────────
export interface Venue {
  id: string;
  name: string;
  type: "mall" | "hotel" | "restaurant" | "cafe" | "landmark";
  neighborhood: string;
  area: string; // "Cairo" | "Giza" | "6th of October" | "New Cairo" | "Alexandria" etc.
  rating: number;
  priceRange: "$" | "$$" | "$$$" | "$$$$";
  description: string;
  address: string;
}

export const CAIRO_VENUES: Venue[] = [
  // ── MALLS ──────────────────────────────────────────────────────────────
  // Nasr City
  { id: "mall-1", name: "Citystars Heliopolis", type: "mall", neighborhood: "Heliopolis", area: "Cairo", rating: 4.5, priceRange: "$$$", description: "Egypt's largest mall. 600+ shops, 20 cinemas, hotels, indoor theme park.", address: "Omar Ibn El Khattab St, Heliopolis" },
  { id: "mall-2", name: "Sun City Mall", type: "mall", neighborhood: "Nasr City", area: "Cairo", rating: 4.2, priceRange: "$$", description: "Popular mid-range mall with Carrefour, cinema, food court.", address: "El Tagamoa El Khames, Nasr City" },
  { id: "mall-3", name: "Genena Mall", type: "mall", neighborhood: "Nasr City", area: "Cairo", rating: 3.8, priceRange: "$$", description: "Family-friendly mall with indoor amusement park.", address: "El Mosheer Tantawy, Nasr City" },
  { id: "mall-4", name: "Cairo Festival City Mall", type: "mall", neighborhood: "New Cairo", area: "New Cairo", rating: 4.6, priceRange: "$$$", description: "Premium mall with IKEA, Virgin Megastore, waterfront dining, Dancing Fountain show.", address: "Ring Road, New Cairo" },
  // Maadi / Zamalek / Downtown
  { id: "mall-5", name: "Maadi City Centre", type: "mall", neighborhood: "Maadi", area: "Cairo", rating: 4.3, priceRange: "$$", description: "Community mall with Carrefour, cinema, casual dining.", address: "Ring Road, Maadi" },
  { id: "mall-6", name: "Arkadia Mall", type: "mall", neighborhood: "Downtown Cairo", area: "Cairo", rating: 3.5, priceRange: "$", description: "Riverside budget mall near the Nile. Older but central.", address: "Corniche El Nil, Downtown" },
  // 6th of October
  { id: "mall-7", name: "Mall of Arabia", type: "mall", neighborhood: "6th of October", area: "6th of October", rating: 4.4, priceRange: "$$", description: "Large open-air mall with hypermarket, cinema, international brands.", address: "Mehwar Road, 6th of October" },
  { id: "mall-8", name: "Dandy Mega Mall", type: "mall", neighborhood: "6th of October", area: "6th of October", rating: 4.0, priceRange: "$$", description: "Family mall with food court, entertainment zone, retail.", address: "Central Axis, 6th of October" },
  // New Cairo
  { id: "mall-9", name: "Point 90 Mall", type: "mall", neighborhood: "New Cairo", area: "New Cairo", rating: 4.3, priceRange: "$$$", description: "Modern upscale mall with premium brands and dining.", address: "90th Street, New Cairo" },
  { id: "mall-10", name: "Waterway Market", type: "mall", neighborhood: "New Cairo", area: "New Cairo", rating: 4.5, priceRange: "$$$", description: "Open-air lifestyle center with upscale dining and retail.", address: "90th Street, New Cairo" },

  // ── HOTELS ─────────────────────────────────────────────────────────────
  { id: "hotel-1", name: "Four Seasons Hotel Cairo at Nile Plaza", type: "hotel", neighborhood: "Garden City", area: "Cairo", rating: 4.8, priceRange: "$$$$", description: "5-star luxury on the Nile. Rooftop pool, 9 restaurants, spa.", address: "1089 Corniche El Nil, Garden City" },
  { id: "hotel-2", name: "The Ritz-Carlton, Cairo", type: "hotel", neighborhood: "Downtown Cairo", area: "Cairo", rating: 4.7, priceRange: "$$$$", description: "Historic 5-star overlooking Nile + Tahrir Square.", address: "1081 Corniche El Nil, Downtown" },
  { id: "hotel-3", name: "Marriott Mena House", type: "hotel", neighborhood: "Giza", area: "Giza", rating: 4.7, priceRange: "$$$$", description: "Historic palace hotel with direct Pyramids view. Gardens + pool.", address: "Pyramids Road, Giza" },
  { id: "hotel-4", name: "Cairo Marriott Hotel & Omar Khayyam Casino", type: "hotel", neighborhood: "Zamalek", area: "Cairo", rating: 4.5, priceRange: "$$$", description: "Historic palace on Gezira Island. Gardens, casino, multiple restaurants.", address: "16 Saray El Gezira St, Zamalek" },
  { id: "hotel-5", name: "St. Regis Cairo", type: "hotel", neighborhood: "Downtown Cairo", area: "Cairo", rating: 4.8, priceRange: "$$$$", description: "Modern luxury hotel on the Nile with butler service.", address: "3 Nile City Towers, Corniche" },
  { id: "hotel-6", name: "Fairmont Nile City", type: "hotel", neighborhood: "Downtown Cairo", area: "Cairo", rating: 4.6, priceRange: "$$$$", description: "Riverside luxury with rooftop pool and panoramic Nile views.", address: "Nile City Towers, Corniche El Nil" },
  { id: "hotel-7", name: "Conrad Cairo", type: "hotel", neighborhood: "Downtown Cairo", area: "Cairo", rating: 4.5, priceRange: "$$$", description: "Nile-front hotel with spa, outdoor pool, multiple dining.", address: "1191 Corniche El Nil" },
  { id: "hotel-8", name: "Sofitel Cairo Nile El Gezira", type: "hotel", neighborhood: "Zamalek", area: "Cairo", rating: 4.5, priceRange: "$$$$", description: "Boutique luxury on Gezira Island. Spa, rooftop, Nile views.", address: "El Thawra Council St, Zamalek" },
  { id: "hotel-9", name: "Kempinski Nile Hotel", type: "hotel", neighborhood: "Garden City", area: "Cairo", rating: 4.6, priceRange: "$$$$", description: "Boutique 5-star with rooftop pool and fine dining.", address: "12 Ahmed Ragheb St, Garden City" },
  { id: "hotel-10", name: "Le Méridien Cairo Airport", type: "hotel", neighborhood: "Heliopolis", area: "Cairo", rating: 4.3, priceRange: "$$$", description: "Connected to Cairo Airport. Transit-friendly with pool and spa.", address: "Cairo International Airport, Heliopolis" },

  // ── RESTAURANTS (by neighborhood) ─────────────────────────────────────
  // Zamalek
  { id: "rest-1", name: "Abou El Sid", type: "restaurant", neighborhood: "Zamalek", area: "Cairo", rating: 4.5, priceRange: "$$", description: "Authentic Egyptian cuisine in elegant setting. Molokhia, mixed grill, stuffed vine leaves.", address: "157 26th of July St, Zamalek" },
  { id: "rest-2", name: "La Bodega", type: "restaurant", neighborhood: "Zamalek", area: "Cairo", rating: 4.4, priceRange: "$$$", description: "European-Mediterranean fine dining in a chic art gallery setting.", address: "Taha Hussein St, Zamalek" },
  { id: "rest-3", name: "Cairo Kitchen", type: "restaurant", neighborhood: "Zamalek", area: "Cairo", rating: 4.3, priceRange: "$", description: "Modern Egyptian street food. Koshari, hawawshi, foul, taameya.", address: "26th of July St, Zamalek" },
  // Downtown
  { id: "rest-4", name: "Taboula", type: "restaurant", neighborhood: "Downtown Cairo", area: "Cairo", rating: 4.4, priceRange: "$$", description: "Levantine cuisine with garden seating. Mezze, grills, shisha.", address: "1 Latin America St, Downtown" },
  { id: "rest-5", name: "Groppi Gardens", type: "restaurant", neighborhood: "Downtown Cairo", area: "Cairo", rating: 4.0, priceRange: "$", description: "Historic café-patisserie since 1909. Pastries, ice cream, coffee.", address: "Talaat Harb Sq, Downtown" },
  // Maadi
  { id: "rest-6", name: "Lucille's", type: "restaurant", neighborhood: "Maadi", area: "Cairo", rating: 4.5, priceRange: "$$", description: "American diner with burgers, ribs, milkshakes. Expat favorite.", address: "Road 9, Maadi" },
  { id: "rest-7", name: "Thai Green", type: "restaurant", neighborhood: "Maadi", area: "Cairo", rating: 4.3, priceRange: "$$", description: "Authentic Thai cuisine with garden dining.", address: "Road 9, Maadi" },
  { id: "rest-8", name: "Hodar", type: "restaurant", neighborhood: "Maadi", area: "Cairo", rating: 4.2, priceRange: "$$", description: "Syrian/Levantine restaurant with wood-fired grills.", address: "Road 9, Maadi" },
  // Heliopolis / Nasr City
  { id: "rest-9", name: "Koshary Abou Tarek", type: "restaurant", neighborhood: "Downtown Cairo", area: "Cairo", rating: 4.3, priceRange: "$", description: "Egypt's most famous koshary. Multi-floor institution since 1950.", address: "16 Champollion St, Downtown" },
  { id: "rest-10", name: "Koshary El Tahrir", type: "restaurant", neighborhood: "Downtown Cairo", area: "Cairo", rating: 4.4, priceRange: "$", description: "Best koshary near Tahrir Square. Quick, cheap, delicious.", address: "Tahrir Square, Downtown" },
  // New Cairo
  { id: "rest-11", name: "Sachi Heliopolis", type: "restaurant", neighborhood: "Heliopolis", area: "Cairo", rating: 4.5, priceRange: "$$$", description: "Japanese-Asian fusion. Sushi, teppanyaki, creative cocktails.", address: "Al-Ahram St, Heliopolis" },
  { id: "rest-12", name: "Sangria", type: "restaurant", neighborhood: "Downtown Cairo", area: "Cairo", rating: 4.2, priceRange: "$$", description: "Riverside Mediterranean dining with Nile views and live music.", address: "Corniche El Nil, Downtown" },
  // Giza
  { id: "rest-13", name: "Andrea El Haram", type: "restaurant", neighborhood: "Giza", area: "Giza", rating: 4.4, priceRange: "$$", description: "Famous grilled chicken near Pyramids. Garden seating, family-friendly.", address: "Pyramids Road, Giza" },
  { id: "rest-14", name: "Mena House Restaurant", type: "restaurant", neighborhood: "Giza", area: "Giza", rating: 4.6, priceRange: "$$$$", description: "Fine dining with Pyramids view inside the historic Mena House hotel.", address: "Pyramids Road, Giza" },

  // ── CAFES (by neighborhood) ───────────────────────────────────────────
  // Zamalek
  { id: "cafe-1", name: "Beano's Café Zamalek", type: "cafe", neighborhood: "Zamalek", area: "Cairo", rating: 4.2, priceRange: "$", description: "Popular local coffee chain. Good espresso, pastries, free WiFi.", address: "26th of July St, Zamalek" },
  { id: "cafe-2", name: "Sant'Egidio", type: "cafe", neighborhood: "Zamalek", area: "Cairo", rating: 4.4, priceRange: "$$", description: "Italian café with gelato, panini, and excellent coffee on a quiet street.", address: "4 Brazil St, Zamalek" },
  { id: "cafe-3", name: "TBS (The Bakery Shop)", type: "cafe", neighborhood: "Zamalek", area: "Cairo", rating: 4.3, priceRange: "$", description: "Artisan bakery + café. Croissants, cakes, specialty coffee.", address: "26th of July St, Zamalek" },
  // Maadi
  { id: "cafe-4", name: "Sip Coffee", type: "cafe", neighborhood: "Maadi", area: "Cairo", rating: 4.5, priceRange: "$", description: "Specialty coffee shop on Road 9. V60, flat white, cold brew.", address: "Road 9, Maadi" },
  { id: "cafe-5", name: "Vitamin Smoothies & More", type: "cafe", neighborhood: "Maadi", area: "Cairo", rating: 4.3, priceRange: "$", description: "Fresh juices, smoothies, healthy bowls. Popular with expats.", address: "Road 9, Maadi" },
  { id: "cafe-6", name: "Cilantro Maadi", type: "cafe", neighborhood: "Maadi", area: "Cairo", rating: 4.1, priceRange: "$", description: "Chain café with sandwiches, salads, coffee. Free WiFi.", address: "Road 9, Maadi" },
  // Downtown
  { id: "cafe-7", name: "Café Riche", type: "cafe", neighborhood: "Downtown Cairo", area: "Cairo", rating: 4.3, priceRange: "$$", description: "Historic café since 1908. Literary haunt, great food, old Cairo atmosphere.", address: "17 Talaat Harb St, Downtown" },
  { id: "cafe-8", name: "Groove Café", type: "cafe", neighborhood: "Downtown Cairo", area: "Cairo", rating: 4.2, priceRange: "$", description: "Modern café in the Greek Campus. Coffee, light meals, coworking.", address: "Greek Campus, Downtown" },
  // Heliopolis / Nasr City
  { id: "cafe-9", name: "Espresso Lab Heliopolis", type: "cafe", neighborhood: "Heliopolis", area: "Cairo", rating: 4.5, priceRange: "$$", description: "Specialty coffee roaster. Pour-over, espresso, flat white. Best coffee in Heliopolis.", address: "Al-Ahram St, Heliopolis" },
  { id: "cafe-10", name: "Costa Coffee Citystars", type: "cafe", neighborhood: "Heliopolis", area: "Cairo", rating: 4.0, priceRange: "$", description: "International chain. Reliable coffee, comfortable seating.", address: "Citystars, Heliopolis" },
  // New Cairo
  { id: "cafe-11", name: "Brew & Bake", type: "cafe", neighborhood: "New Cairo", area: "New Cairo", rating: 4.4, priceRange: "$$", description: "Specialty coffee + fresh bakery. Popular with AUC students.", address: "90th Street, New Cairo" },
  { id: "cafe-12", name: "Overdose Coffee", type: "cafe", neighborhood: "New Cairo", area: "New Cairo", rating: 4.3, priceRange: "$", description: "Third-wave coffee shop. Cold brew, nitro, single-origin beans.", address: "90th Street, New Cairo" },
  // 6th of October
  { id: "cafe-13", name: "Bikya Bookstore Café", type: "cafe", neighborhood: "6th of October", area: "6th of October", rating: 4.2, priceRange: "$", description: "Bookstore + café hybrid. Read, browse, sip coffee.", address: "Mall of Arabia, 6th of October" },
  { id: "cafe-14", name: "Mince Coffee", type: "cafe", neighborhood: "6th of October", area: "6th of October", rating: 4.1, priceRange: "$", description: "Casual coffee shop with light bites and desserts.", address: "Dandy Mall, 6th of October" },
];

// ── Alexandria venues (bonus) ─────────────────────────────────────────────
export const ALEX_VENUES: Venue[] = [
  { id: "alex-mall-1", name: "San Stefano Grand Plaza", type: "mall", neighborhood: "San Stefano", area: "Alexandria", rating: 4.3, priceRange: "$$$", description: "Beachfront mall with cinema, food court, international brands.", address: "Corniche, San Stefano" },
  { id: "alex-rest-1", name: "Felfela", type: "restaurant", neighborhood: "Mahat El Raml", area: "Alexandria", rating: 4.2, priceRange: "$", description: "Alexandria's favorite for seafood and Egyptian classics.", address: "Corniche, Alexandria" },
  { id: "alex-cafe-1", name: "Délices", type: "cafe", neighborhood: "Mahat El Raml", area: "Alexandria", rating: 4.4, priceRange: "$$", description: "Historic patisserie since 1922. French pastries, ice cream, coffee.", address: "Saad Zaghloul Sq, Alexandria" },
  { id: "alex-cafe-2", name: "Cap d'Or", type: "cafe", neighborhood: "Mahat El Raml", area: "Alexandria", rating: 4.5, priceRange: "$", description: "Historic bar-café since 1905. Sea view, beer, mezze.", address: "Corniche, Alexandria" },
];

// ── Helper functions ──────────────────────────────────────────────────────

/**
 * Get events for a city, optionally filtered by category.
 */
export function getEvents(city: string, category?: string): CairoEvent[] {
  const cityLower = city.toLowerCase();
  if (cityLower.includes("cairo") || cityLower.includes("giza") || cityLower.includes("october") || cityLower.includes("new cairo")) {
    const events = category ? CAIRO_EVENTS.filter(e => e.category === category) : CAIRO_EVENTS;
    return events;
  }
  if (cityLower.includes("alexandria") || cityLower.includes("alex")) {
    return []; // Alex events would go here
  }
  return CAIRO_EVENTS; // Default to Cairo
}

/**
 * Get nearby venues based on city + neighborhood + type.
 */
export function getNearbyVenues(city: string, neighborhood?: string, type?: string): Venue[] {
  const allVenues = [...CAIRO_VENUES, ...ALEX_VENUES];
  let filtered = allVenues;

  // Filter by city
  const cityLower = city.toLowerCase();
  if (cityLower.includes("cairo") || cityLower.includes("giza") || cityLower.includes("october") || cityLower.includes("new cairo")) {
    filtered = filtered.filter(v => v.area === "Cairo" || v.area === "Giza" || v.area === "New Cairo" || v.area === "6th of October");
  } else if (cityLower.includes("alex")) {
    filtered = filtered.filter(v => v.area === "Alexandria");
  }

  // Filter by neighborhood if provided
  if (neighborhood) {
    const nLower = neighborhood.toLowerCase();
    const nMatch = filtered.filter(v => v.neighborhood.toLowerCase().includes(nLower));
    if (nMatch.length > 0) filtered = nMatch;
  }

  // Filter by type
  if (type) {
    filtered = filtered.filter(v => v.type === type);
  }

  return filtered;
}

/**
 * Get the Brain's location summary for a city.
 * Used by the Brain to provide context-aware recommendations.
 */
export function getLocationSummary(city: string, neighborhood?: string): string {
  const events = getEvents(city);
  const malls = getNearbyVenues(city, neighborhood, "mall");
  const hotels = getNearbyVenues(city, neighborhood, "hotel");
  const restaurants = getNearbyVenues(city, neighborhood, "restaurant");
  const cafes = getNearbyVenues(city, neighborhood, "cafe");

  const summary = [
    `Location: ${city}${neighborhood ? `, ${neighborhood}` : ""}`,
    `Events: ${events.length} events available (sports: ${events.filter(e => e.category === "sports").length}, cultural: ${events.filter(e => e.category === "cultural").length}, tech: ${events.filter(e => e.category === "tech").length}, fairs: ${events.filter(e => e.category === "fair").length})`,
    `Malls: ${malls.length} (${malls.slice(0, 3).map(m => m.name).join(", ")})`,
    `Hotels: ${hotels.length} (${hotels.slice(0, 3).map(h => h.name).join(", ")})`,
    `Restaurants: ${restaurants.length} (${restaurants.slice(0, 3).map(r => r.name).join(", ")})`,
    `Cafes: ${cafes.length} (${cafes.slice(0, 3).map(c => c.name).join(", ")})`,
  ].join(". ");

  return summary;
}

/**
 * Get featured events for the home page.
 * Returns the top events happening now/soon.
 */
export function getFeaturedEvents(city: string, limit: number = 4): CairoEvent[] {
  const events = getEvents(city);
  // Sort by category priority: entertainment > cultural > sports > tech > fair > political > religious
  const priority: Record<string, number> = { entertainment: 1, cultural: 2, sports: 3, tech: 4, fair: 5, political: 6, religious: 7 };
  return events.sort((a, b) => (priority[a.category] || 8) - (priority[b.category] || 8)).slice(0, limit);
}
