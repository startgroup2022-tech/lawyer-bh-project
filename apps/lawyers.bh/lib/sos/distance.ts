const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRad(b.lat - a.lat);
  const longitudeDelta = toRad(b.lng - a.lng);
  const firstLatitude = toRad(a.lat);
  const secondLatitude = toRad(b.lat);
  const sin =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(sin));
}
