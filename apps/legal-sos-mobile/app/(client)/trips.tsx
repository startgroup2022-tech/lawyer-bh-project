import { useCallback, useState } from "react";
import { View, Text, Pressable, RefreshControl, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useRouter, useFocusEffect } from "expo-router";
import { Ic } from "../../components/design/Icons";
import { Btn, IconBtn, TopNav } from "../../components/design/Primitives";
import { listTrips, type Trip } from "../../lib/tripsHistory";
import { getCaseType, formatFee } from "../../constants/caseTypes";
import { colors } from "../../constants/theme";

export default function TripsScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setTrips(await listTrips());
    setLoaded(true);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalBhd = trips.reduce((s, t) => s + t.baseFeeBhd, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        <TopNav
          left={<IconBtn onPress={() => router.back()}><Ic.back/></IconBtn>}
          title="My cases"
          right={<IconBtn><Ic.search/></IconBtn>}
        />
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.gold} />}
        >
          <Text style={{ color: colors.white, fontSize: 22, fontWeight: "500", letterSpacing: -0.4, marginBottom: 4 }}>
            Your legal{" "}
            <Text style={{ color: colors.gold2, fontStyle: "italic" }}>history</Text>
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>
            {trips.length} cases · BHD {totalBhd} spent · all resolved
          </Text>

          {/* summary card */}
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              marginTop: 18,
              marginBottom: 6,
              flexDirection: "row",
              gap: 16,
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSubtle, fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase" }}>
                This year
              </Text>
              <Text style={{ color: colors.gold2, fontSize: 24, fontWeight: "500", marginTop: 4, fontVariant: ["tabular-nums"] }}>
                BHD {totalBhd}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 11.5, marginTop: 2 }}>
                across {trips.length} {trips.length === 1 ? "case" : "cases"}
              </Text>
            </View>
            <Svg width={120} height={50} viewBox="0 0 120 50">
              <Path
                d="M0 35 L20 30 L40 32 L60 18 L80 22 L100 10 L120 14"
                stroke={colors.gold2}
                strokeWidth={1.6}
                fill="none"
                strokeLinecap="round"
              />
              <Path
                d="M0 35 L20 30 L40 32 L60 18 L80 22 L100 10 L120 14 L120 50 L0 50 Z"
                fill={colors.gold2}
                opacity={0.15}
              />
            </Svg>
          </View>

          {loaded && trips.length === 0 ? (
            <EmptyState onCallSos={() => router.push("/(client)/select-emergency")} />
          ) : (
            groupByMonth(trips).map((g) => (
              <View key={g.label}>
                <Text
                  style={{
                    color: colors.textSubtle,
                    fontSize: 11.5,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    fontWeight: "500",
                    marginTop: 18,
                    marginBottom: 10,
                  }}
                >
                  {g.label}
                </Text>
                {g.trips.map((t) => (
                  <TripRow key={t.id} t={t} />
                ))}
              </View>
            ))
          )}

          {trips.length > 0 && (
            <>
              <Text
                style={{
                  color: colors.textSubtle,
                  fontSize: 11,
                  textAlign: "center",
                  marginTop: 14,
                  marginBottom: 12,
                }}
              >
                Older cases archived after 24 months · request export below
              </Text>
              <Btn
                label="Export case history"
                variant="secondary"
                height={44}
                fontSize={13}
                iconLeft={<Ic.share color={colors.white} />}
              />
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function TripRow({ t }: { t: Trip }) {
  const c = getCaseType(t.caseSlug);
  const isRemote = t.fulfillment === "remote";
  const created = new Date(t.createdAt);
  const date = created.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        borderRadius: 16,
        padding: 14,
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: isRemote ? colors.goldTint16 : colors.whiteAlpha04,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isRemote ? (
          <Ic.phone size={18} color={colors.gold2} />
        ) : (
          <Ic.doc size={18} color={colors.textMuted} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: colors.white, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>
          {t.caseLabel}
        </Text>
        <Text style={{ color: colors.textSubtle, fontSize: 12 }} numberOfLines={1}>
          {t.lawyerName ?? "—"} · {t.ratingStars ? `★ ${t.ratingStars}/5` : "rated"}
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 11.5,
            marginTop: 3,
            fontVariant: ["tabular-nums"],
          }}
        >
          {date} · {t.id} · {formatFee(t.baseFeeBhd)}
        </Text>
      </View>
      <Ic.chevron color={colors.textSubtle} />
    </View>
  );
}

function groupByMonth(trips: Trip[]) {
  const map = new Map<string, Trip[]>();
  for (const t of trips) {
    const d = new Date(t.createdAt);
    const key = d
      .toLocaleDateString(undefined, { year: "numeric", month: "long" })
      .toUpperCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return Array.from(map.entries()).map(([label, trips]) => ({ label, trips }));
}

function EmptyState({ onCallSos }: { onCallSos: () => void }) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: 28,
        alignItems: "center",
        marginTop: 22,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.goldTint16,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ic.clock size={30} color={colors.gold2} />
      </View>
      <Text style={{ color: colors.white, fontWeight: "500", fontSize: 16, marginTop: 14 }}>
        No cases yet
      </Text>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: 13,
          textAlign: "center",
          marginTop: 6,
          lineHeight: 18,
        }}
      >
        When you complete a consultation or field service, it will appear here.
      </Text>
      <Pressable
        onPress={onCallSos}
        style={({ pressed }) => ({
          marginTop: 18,
          backgroundColor: colors.sos,
          borderRadius: 12,
          paddingHorizontal: 22,
          paddingVertical: 12,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ color: "#fff", fontWeight: "600" }}>Get Legal Help</Text>
      </Pressable>
    </View>
  );
}
