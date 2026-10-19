import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

export default function AdminDashboardScreen({ onBack, onListingPress }) {
  const { userProfile } = useAuth();
  const { locale } = useLanguage();

  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState("unverified"); // 'unverified' | 'verified' | 'all'

  // SRD FR-07: Real-time stream of all live ads sorted by creation date
  useEffect(() => {
    const animalsRef = collection(db, "animals");
    const unsubscribe = onSnapshot(
      animalsRef,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const createdDate = data.createdAt?.toDate
            ? data.createdAt.toDate()
            : new Date(0);
          return {
            id: docSnap.id,
            ...data,
            _timestamp: createdDate.getTime(),
          };
        });

        // Sort newest first
        list.sort((a, b) => b._timestamp - a._timestamp);
        setAds(list);
        setLoading(false);
      },
      (error) => {
        console.warn("Admin stream error:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Protect view strictly for role === 'admin' (SRD FR-07)
  if (userProfile?.role !== "admin") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Access Denied</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="lock-closed" size={54} color="#D32F2F" />
          <Text style={styles.deniedText}>
            Admin privileges are required to view this console.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredAds = useMemo(() => {
    return ads.filter((item) => {
      if (filterTab === "unverified") return !item.isVerified;
      if (filterTab === "verified") return !!item.isVerified;
      return true;
    });
  }, [ads, filterTab]);

  const unverifiedCount = ads.filter((a) => !a.isVerified).length;
  const verifiedCount = ads.filter((a) => !!a.isVerified).length;

  // SRD FR-07: Toggle isVerified status
  const handleToggleVerify = async (item) => {
    const nextState = !item.isVerified;
    try {
      const adRef = doc(db, "animals", item.id);
      await updateDoc(adRef, { isVerified: nextState });
      Alert.alert(
        nextState
          ? locale === "ur"
            ? "تصدیق ہو گئی"
            : "Ad Verified"
          : locale === "ur"
            ? "تصدیق ختم کر دی گئی"
            : "Verification Revoked",
        nextState
          ? locale === "ur"
            ? "اس اشتہار کو تصدیق شدہ بیج دے دیا گیا ہے۔"
            : "Official Verified Badge is now live on this listing."
          : locale === "ur"
            ? "تصدیق شدہ بیج ہٹا دیا گیا ہے۔"
            : "Verified badge has been removed.",
      );
    } catch (err) {
      Alert.alert("Error", "Could not update verification status.");
    }
  };

  // SRD FR-07: Delete fraudulent or spam listing
  const handleDeleteAd = (item) => {
    Alert.alert(
      locale === "ur" ? "اشتہار حذف کریں" : "Delete Listing (Moderation)",
      locale === "ur"
        ? `کیا آپ واقعی "${item.title}" کو مستقل طور پر حذف کرنا چاہتے ہیں؟`
        : `Permanently remove "${item.title}" from the marketplace?`,
      [
        { text: locale === "ur" ? "منسوخ" : "Cancel", style: "cancel" },
        {
          text: locale === "ur" ? "حذف کریں" : "Delete Ad",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "animals", item.id));
            } catch (err) {
              Alert.alert("Error", "Failed to delete listing.");
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.headerTitle}>
            {locale === "ur"
              ? "ایڈمن تصدیقی کنسول"
              : "Admin Moderation Console"}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats Summary Banner */}
      <View style={styles.statsBar}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{ads.length}</Text>
          <Text style={styles.statLabel}>
            {locale === "ur" ? "کل اشتہارات" : "Total Ads"}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: "#E65100" }]}>
            {unverifiedCount}
          </Text>
          <Text style={styles.statLabel}>
            {locale === "ur" ? "زیر التواء" : "Pending Review"}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: "#2E7D32" }]}>
            {verifiedCount}
          </Text>
          <Text style={styles.statLabel}>
            {locale === "ur" ? "تصدیق شدہ" : "Verified"}
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            filterTab === "unverified" && styles.tabBtnActive,
          ]}
          onPress={() => setFilterTab("unverified")}
        >
          <Text
            style={[
              styles.tabText,
              filterTab === "unverified" && styles.tabTextActive,
            ]}
          >
            {locale === "ur"
              ? `غیر تصدیق شدہ (${unverifiedCount})`
              : `Unverified (${unverifiedCount})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            filterTab === "verified" && styles.tabBtnActive,
          ]}
          onPress={() => setFilterTab("verified")}
        >
          <Text
            style={[
              styles.tabText,
              filterTab === "verified" && styles.tabTextActive,
            ]}
          >
            {locale === "ur"
              ? `تصدیق شدہ (${verifiedCount})`
              : `Verified (${verifiedCount})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, filterTab === "all" && styles.tabBtnActive]}
          onPress={() => setFilterTab("all")}
        >
          <Text
            style={[
              styles.tabText,
              filterTab === "all" && styles.tabTextActive,
            ]}
          >
            {locale === "ur" ? `تمام (${ads.length})` : `All (${ads.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Live Moderation Feed */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1B5E20" />
        </View>
      ) : filteredAds.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons
            name="checkmark-done-circle-outline"
            size={52}
            color="#AAA"
          />
          <Text style={styles.emptyText}>
            {locale === "ur"
              ? "اس حصے میں کوئی اشتہار نہیں ہے"
              : "No listings in this queue"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAds}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View
              style={[
                styles.modCard,
                !item.isVerified && styles.modCardUnverified,
              ]}
            >
              <TouchableOpacity
                style={styles.cardTopRow}
                onPress={() => onListingPress?.(item)}
                activeOpacity={0.85}
              >
                <Image
                  source={{
                    uri:
                      item.images?.[0] ||
                      "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e",
                  }}
                  style={styles.thumb}
                />
                <View style={styles.infoCol}>
                  <View style={styles.badgeRow}>
                    {item.isVerified ? (
                      <View style={styles.verifiedPill}>
                        <Ionicons
                          name="checkmark-circle"
                          size={13}
                          color="#2E7D32"
                        />
                        <Text style={styles.verifiedPillText}>VERIFIED</Text>
                      </View>
                    ) : (
                      <View style={styles.pendingPill}>
                        <Ionicons
                          name="alert-circle"
                          size={13}
                          color="#E65100"
                        />
                        <Text style={styles.pendingPillText}>
                          NEEDS VERIFICATION
                        </Text>
                      </View>
                    )}
                    <Text style={styles.categoryTag}>{item.category}</Text>
                  </View>

                  <Text style={styles.titleText} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.priceText}>
                    Rs {Number(item.pricePKR || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.sellerMeta}>
                    Seller: {item.sellerName || "Trader"} •{" "}
                    {item.sellerPhone || "N/A"} ({item.city})
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.modActionsRow}>
                <TouchableOpacity
                  style={[
                    styles.verifyBtn,
                    item.isVerified && styles.revokeBtn,
                  ]}
                  onPress={() => handleToggleVerify(item)}
                >
                  <Ionicons
                    name={
                      item.isVerified
                        ? "close-circle-outline"
                        : "shield-checkmark-outline"
                    }
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.verifyBtnText}>
                    {item.isVerified
                      ? locale === "ur"
                        ? "تصدیق ختم کریں"
                        : "Revoke Badge"
                      : locale === "ur"
                        ? "تصدیق کریں (Verify)"
                        : "Approve & Verify"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteAd(item)}
                >
                  <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.deleteBtnText}>
                    {locale === "ur" ? "حذف" : "Delete"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F4" },
  header: {
    backgroundColor: "#1B5E20",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  statsBar: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    paddingVertical: 12,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 10,
    elevation: 1,
  },
  statBox: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 18, fontWeight: "800", color: "#222" },
  statLabel: { fontSize: 11, color: "#666", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "#E0E0E0" },
  tabsRow: {
    flexDirection: "row",
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  tabBtnActive: { backgroundColor: "#FFFFFF", elevation: 1 },
  tabText: { fontSize: 12, fontWeight: "600", color: "#555" },
  tabTextActive: { color: "#1B5E20", fontWeight: "700" },
  listContent: { paddingHorizontal: 12, paddingBottom: 30 },
  modCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  modCardUnverified: {
    borderLeftWidth: 4,
    borderLeftColor: "#E65100",
  },
  cardTopRow: { flexDirection: "row" },
  thumb: { width: 84, height: 84, borderRadius: 8, backgroundColor: "#EEE" },
  infoCol: { flex: 1, marginLeft: 12, justifyContent: "center" },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  pendingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingPillText: { fontSize: 10, fontWeight: "700", color: "#E65100" },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedPillText: { fontSize: 10, fontWeight: "700", color: "#2E7D32" },
  categoryTag: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  titleText: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  priceText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2E7D32",
    marginTop: 2,
  },
  sellerMeta: { fontSize: 11, color: "#666", marginTop: 3 },
  modActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  verifyBtn: {
    flex: 2,
    backgroundColor: "#2E7D32",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  revokeBtn: {
    backgroundColor: "#757575",
  },
  verifyBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  deleteBtn: {
    flex: 1,
    backgroundColor: "#D32F2F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 8,
    gap: 5,
  },
  deleteBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: { color: "#888", fontSize: 14, marginTop: 10 },
  deniedText: {
    color: "#D32F2F",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 12,
  },
});
