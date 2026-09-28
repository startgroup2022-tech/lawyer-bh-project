import { View, Platform, Text } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";
import MockMap from "./MockMap";

/** Live map component. Same prop surface as MockMap so swap-in is
 *  zero-cost. When real coordinates are supplied, renders react-native-maps
 *  with a dark style. Falls back to MockMap on web (no native module)
 *  or when no coordinates have been captured yet. */
export default function LiveMap({
  height = 280,
  pin = true,
  path = false,
  carIcon = false,
  userLocation,
  advocateLocation,
}: {
  height?: number;
  pin?: boolean;
  path?: boolean;
  carIcon?: boolean;
  userLocation?: { lat: number; lng: number };
  advocateLocation?: { lat: number; lng: number };
}) {
  // Web bundler can't compile native map modules — fall back gracefully.
  if (Platform.OS === "web") {
    return <MockMap height={height} pin={pin} path={path} carIcon={carIcon} />;
  }

  // Default to Manama, Bahrain if no coords yet.
  const defaultLat = 26.2235;
  const defaultLng = 50.5876;
  const lat = userLocation?.lat ?? advocateLocation?.lat ?? defaultLat;
  const lng = userLocation?.lng ?? advocateLocation?.lng ?? defaultLng;

  return (
    <View
      style={{
        height,
        borderRadius: 18,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.cardBorder,
        backgroundColor: colors.mapBg,
      }}
    >
      <MapView
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={!!userLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        toolbarEnabled={false}
        customMapStyle={DARK_MAP_STYLE}
      >
        {userLocation && (
          <Marker
            coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
            title="You"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.sos,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderColor: "#fff",
                shadowColor: colors.sos,
                shadowOpacity: 0.6,
                shadowRadius: 10,
              }}
            >
              <Ionicons name="person" size={16} color="#fff" />
            </View>
          </Marker>
        )}
        {advocateLocation && (
          <Marker
            coordinate={{ latitude: advocateLocation.lat, longitude: advocateLocation.lng }}
            title="Lawyer"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.gold,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderColor: "#1A1F2E",
                shadowColor: colors.gold,
                shadowOpacity: 0.6,
                shadowRadius: 10,
              }}
            >
              <Ionicons name="car" size={16} color="#1A1F2E" />
            </View>
          </Marker>
        )}
        {/* No coords yet but caller asked for a pin — show a centred placeholder marker */}
        {pin && !userLocation && !advocateLocation && (
          <Marker
            coordinate={{ latitude: lat, longitude: lng }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.sos,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="location" size={18} color="#fff" />
            </View>
          </Marker>
        )}
      </MapView>
      <Text
        style={{
          position: "absolute",
          bottom: 8,
          right: 10,
          color: colors.textSubtle,
          fontSize: 10,
          backgroundColor: colors.bg + "AA",
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 4,
        }}
      >
        Live map
      </Text>
    </View>
  );
}

/** Dark map style for Google Maps (Android). Apple Maps on iOS picks up
 *  the system dark mode automatically because app.json sets
 *  userInterfaceStyle: "dark". */
const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
  {
    featureType: "administrative.country",
    elementType: "geometry.stroke",
    stylers: [{ color: "#4b6878" }],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [{ color: "#64779e" }],
  },
  {
    featureType: "administrative.province",
    elementType: "geometry.stroke",
    stylers: [{ color: "#4b6878" }],
  },
  {
    featureType: "landscape.man_made",
    elementType: "geometry.stroke",
    stylers: [{ color: "#334e87" }],
  },
  {
    featureType: "landscape.natural",
    elementType: "geometry",
    stylers: [{ color: "#023e58" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#283d6a" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6f9ba5" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#1d2c4d" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry.fill",
    stylers: [{ color: "#023e58" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#3C7680" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#304a7d" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#98a5be" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#1d2c4d" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#2c6675" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#255763" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#b0d5ce" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#023e58" }],
  },
  {
    featureType: "transit",
    elementType: "labels.text.fill",
    stylers: [{ color: "#98a5be" }],
  },
  {
    featureType: "transit",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#1d2c4d" }],
  },
  {
    featureType: "transit.line",
    elementType: "geometry.fill",
    stylers: [{ color: "#283d6a" }],
  },
  {
    featureType: "transit.station",
    elementType: "geometry",
    stylers: [{ color: "#3a4762" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0e1626" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4e6d70" }],
  },
];
