const EARTH_RADIUS_MILES = 3958.8;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function getDistanceMiles(
  origin: [number, number],
  destination: [number, number],
) {
  const [originLng, originLat] = origin;
  const [destinationLng, destinationLat] = destination;
  const latitudeDelta = toRadians(destinationLat - originLat);
  const longitudeDelta = toRadians(destinationLng - originLng);
  const startLatitude = toRadians(originLat);
  const endLatitude = toRadians(destinationLat);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  const angularDistance = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return EARTH_RADIUS_MILES * angularDistance;
}
