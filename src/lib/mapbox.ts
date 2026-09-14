const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || "";
export function isMapboxConfigured(): boolean { return Boolean(MAPBOX_TOKEN); }
export function getStaticMapUrl(lat: number, lng: number, zoom = 13, width = 400, height = 200): string {
  if (!MAPBOX_TOKEN) return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}`;
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${lng},${lat},${zoom}/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}`;
}
export function getMapTileUrl(): string {
  if (!MAPBOX_TOKEN) return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`;
}
