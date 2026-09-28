import { useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import SignatureCanvas, { type SignatureViewRef } from "react-native-signature-canvas";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";

/** Reusable signature pad backed by react-native-signature-canvas (WebView).
 *  Calls `onCapture(dataUrl)` with a base64 PNG every time the user lifts
 *  their finger and we capture a non-empty signature. Calls `onClear()`
 *  when the user clears the canvas. */
export default function SignaturePadField({
  height = 200,
  onCapture,
  onClear,
}: {
  height?: number;
  onCapture: (dataUrl: string) => void;
  onClear?: () => void;
}) {
  const ref = useRef<SignatureViewRef>(null);
  const [hasSignature, setHasSignature] = useState(false);

  // The canvas web styling — keeps the pad consistent with our dark theme.
  const webStyle = `
    .m-signature-pad {
      box-shadow: none;
      border: none;
      background: transparent;
    }
    .m-signature-pad--body {
      border: none;
      background: ${colors.bgElevated};
      border-radius: 12px;
    }
    .m-signature-pad--body canvas {
      background: ${colors.bgElevated};
      border-radius: 12px;
    }
    .m-signature-pad--footer { display: none; }
    body, html { background: ${colors.card}; }
  `;

  function clear() {
    ref.current?.clearSignature();
    setHasSignature(false);
    onClear?.();
  }

  function done() {
    ref.current?.readSignature();
  }

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: hasSignature ? colors.gold + "55" : colors.cardBorder,
        padding: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>
          SIGN HERE
        </Text>
        <View style={{ flexDirection: "row", gap: 14 }}>
          <Pressable hitSlop={6} onPress={clear}>
            <Text style={{ color: colors.sos, fontSize: 12, fontWeight: "700" }}>Clear</Text>
          </Pressable>
          {hasSignature ? (
            <Pressable hitSlop={6} onPress={done}>
              <Text style={{ color: colors.gold, fontSize: 12, fontWeight: "700" }}>Save</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={{ height, borderRadius: 12, overflow: "hidden" }}>
        <SignatureCanvas
          ref={ref}
          onOK={(sig) => {
            setHasSignature(true);
            onCapture(sig);
          }}
          onEmpty={() => {
            setHasSignature(false);
            onClear?.();
          }}
          onBegin={() => {
            setHasSignature(true);
          }}
          autoClear={false}
          imageType="image/png"
          backgroundColor={colors.bgElevated}
          penColor={colors.gold}
          webStyle={webStyle}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginTop: 8,
        }}
      >
        <Ionicons
          name={hasSignature ? "checkmark-circle" : "create-outline"}
          size={14}
          color={hasSignature ? colors.success : colors.textSubtle}
        />
        <Text style={{ color: colors.textMuted, fontSize: 11 }}>
          {hasSignature
            ? "Tap Save above to confirm your signature."
            : "Draw your signature with your finger or stylus."}
        </Text>
      </View>
    </View>
  );
}
