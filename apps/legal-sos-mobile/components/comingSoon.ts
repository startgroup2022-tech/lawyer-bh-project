import { Alert } from "react-native";

/** Tiny helper so every "not yet wired" button gives visible feedback
 *  instead of feeling broken. Replace with real routes/screens later. */
export function comingSoon(label: string) {
  Alert.alert("Coming soon", `${label} is part of the next iteration.`);
}
