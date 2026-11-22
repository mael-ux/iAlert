import * as Location from "expo-location";

// Best-effort current position without prompting again; null if unknown.
export async function getCoordsQuiet() {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== "granted") return null;
    const p = (await Location.getLastKnownPositionAsync()) || (await Location.getCurrentPositionAsync({}));
    return p ? { latitude: p.coords.latitude, longitude: p.coords.longitude } : null;
  } catch {
    return null;
  }
}
