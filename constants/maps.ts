import { getDefaultProfilePic } from "./images";

export const GOOGLE_MAPS_API_KEY =
  "AIzaSyD5fhA50lBTXtvXbwlwJGVNUxNgPtdJbOA";

export const DEFAULT_MAP_REGION = {
  latitude: 3.848,
  longitude: 11.502,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const defaultAvatar = getDefaultProfilePic(true);

export const BARBER_MAP_LOCATIONS = [
  {
    id: "1",
    name: "Marcus Vance",
    brand: "Master Barber • Fade Specialist",
    rating: "4.9",
    amount: 25,
    distance: "1.2 km",
    latitude: 3.852,
    longitude: 11.505,
    avatar: defaultAvatar,
  },
  {
    id: "2",
    name: "Elena Rossi",
    brand: "Stylist • Braids & Locs",
    rating: "4.8",
    amount: 35,
    distance: "2.5 km",
    latitude: 3.845,
    longitude: 11.498,
    avatar: defaultAvatar,
  },
  {
    id: "3",
    name: "David Kim",
    brand: "Classic Cuts • Hot Towel Shave",
    rating: "4.7",
    amount: 20,
    distance: "3.1 km",
    latitude: 3.858,
    longitude: 11.512,
    avatar: defaultAvatar,
  },
  {
    id: "4",
    name: "Julian Woods",
    brand: "Beard Grooming • Lineup",
    rating: "4.9",
    amount: 30,
    distance: "4.0 km",
    latitude: 3.839,
    longitude: 11.509,
    avatar: defaultAvatar,
  },
];

// Dark aesthetic custom JSON styling for Google Maps
export const DARK_MAP_STYLE = [
  {
    elementType: "geometry",
    stylers: [{ color: "#1c1e1b" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#a8b5ad" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#1c1e1b" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#a8b5ad" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#252b22" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#a8b5a0" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2d312a" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#21251e" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a968e" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#383d34" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f231b" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#a8b5a0" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f332a" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#a8b5ad" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#181f1a" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4f6052" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#181f1a" }],
  },
];