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
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

export default function ProfileScreen({
  onBack,
  onLoginPress,
  onListingPress,
  onAdminPress,
}) {
  const { currentUser, userProfile, logout, isAuthenticated, setDirectUser } =
    useAuth();
  const { locale } = useLanguage();

  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("active"); // 'active' | 'sold'

  // Edit Price Modal State (SRD FR-06)
  const [editingItem, setEditingItem] = useState(null);
  const [newPrice, setNewPrice] = useState("");
  const [updatingPrice, setUpdatingPrice] = useState(false);

  const fetchMyListings = async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "animals"),
        where("sellerId", "==", currentUser.uid),
      );
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setMyListings(items);
    } catch (err) {
      console.warn("Could not fetch user listings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyListings();
    }
  }, [isAuthenticated, currentUser]);

  // Filter listings based on Segmented Status Tab (Active vs Sold)
  const displayedListings = useMemo(() => {
    return myListings.filter((item) => {
      const status = item.status || "active";
      return activeTab === "active" ? status === "active" : status === "sold";
    });
  }, [myListings, activeTab]);

  const handleToggleSold = async (item) => {
    const newStatus = item.status === "sold" ? "active" : "sold";
    try {
      const itemRef = doc(db, "animals", item.id);
      await updateDoc(itemRef, { status: newStatus });
      setMyListings((prev) =>
        prev.map((ad) =>
          ad.id === item.id ? { ...ad, status: newStatus } : ad,
        ),
      );
    } catch (err) {
      Alert.alert("Error", "Could not update status.");
    }
  };

  const handleOpenEditPrice = (item) => {
    setEditingItem(item);
    setNewPrice(String(item.pricePKR || ""));
  };

  const handleSaveNewPrice = async () => {
    if (!newPrice.trim() || isNaN(Number(newPrice)) || Number(newPrice) <= 0) {
      Alert.alert(
        locale === "ur" ? "غلط قیمت" : "Invalid Price",
        locale === "ur"
          ? "براہ کرم درست قیمت درج کریں۔"
          : "Please enter a valid numeric price in PKR.",
      );
      return;
    }

    setUpdatingPrice(true);
    try {
      const numericPrice = Number(newPrice);
      const itemRef = doc(db, "animals", editingItem.id);
      await updateDoc(itemRef, { pricePKR: numericPrice });

      setMyListings((prev) =>
        prev.map((ad) =>
          ad.id === editingItem.id ? { ...ad, pricePKR: numericPrice } : ad,
        ),
      );
      setEditingItem(null);
      Alert.alert(
        locale === "ur" ? "کامیابی" : "Updated",
        locale === "ur"
          ? "قیمت کامیابی سے تبدیل کر دی گئی ہے!"
          : "Listing price updated successfully!",
      );
    } catch (err) {
      Alert.alert("Error", "Could not update price.");
    } finally {
      setUpdatingPrice(false);
    }
  };

  const handleDeleteListing = (itemId) => {
    Alert.alert(
      locale === "ur" ? "اشتہار حذف کریں" : "Delete Listing",
      locale === "ur"
        ? "کیا آپ واقعی یہ اشتہار ختم کرنا چاہتے ہیں؟"
        : "Are you sure you want to delete this listing?",
      [
        { text: locale === "ur" ? "منسوخ" : "Cancel", style: "cancel" },
        {
          text: locale === "ur" ? "حذف کریں" : "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "animals", itemId));
              setMyListings((prev) => prev.filter((ad) => ad.id !== itemId));
            } catch (err) {
              Alert.alert("Error", "Failed to delete listing.");
            }
          },
        },
      ],
    );
  };

  // Helper to toggle Admin Role for testing Feature 6
  const handleToggleAdminRole = async () => {
    if (!userProfile || !currentUser) return;
    const nextRole = userProfile.role === "admin" ? "seller" : "admin";
    const updatedProfile = { ...userProfile, role: nextRole };
    await setDirectUser(updatedProfile);
    Alert.alert(
      "Role Switched",
      `Your account role is now "${nextRole.toUpperCase()}".`,
    );
  };

  const activeCount = myListings.filter(
    (i) => (i.status || "active") === "active",
  ).length;
  const soldCount = myListings.filter((i) => i.status === "sold").length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {locale === "ur" ? "میری پروفائل اور اشتہارات" : "Profile & My Ads"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* User Info Card */}
      <View style={styles.userCard}>
        <TouchableOpacity
          style={styles.avatar}
          onLongPress={handleToggleAdminRole}
          activeOpacity={0.8}
        >
          <Ionicons name="person" size={32} color="#2E7D32" />
        </TouchableOpacity>
        <View style={styles.userInfo}>
          {isAuthenticated ? (
            <>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>
                  {userProfile?.displayName || "Mandi Trader"}
                </Text>
                {userProfile?.role === "admin" && (
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>ADMIN</Text>
                  </View>
                )}
              </View>
              <Text style={styles.userPhone}>
                {currentUser?.phoneNumber || "No phone linked"}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.userName}>
                {locale === "ur" ? "لاگ ان نہیں ہے" : "Guest User"}
              </Text>
              <Text style={styles.userPhone}>
                {locale === "ur"
                  ? "اشتہارات سنبھالنے کے لیے لاگ ان کریں"
                  : "Sign in to manage your listings"}
              </Text>
            </>
          )}
        </View>
        {isAuthenticated ? (
          <TouchableOpacity style={styles.authBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={22} color="#D32F2F" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.loginBtn} onPress={onLoginPress}>
            <Text style={styles.loginBtnText}>
              {locale === "ur" ? "لاگ ان" : "Login"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Admin Console Entry Button (Visible when role === 'admin') */}
      {isAuthenticated && userProfile?.role === "admin" && onAdminPress && (
        <TouchableOpacity style={styles.adminBanner} onPress={onAdminPress}>
          <View style={styles.adminBannerLeft}>
            <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
            <Text style={styles.adminBannerText}>
              {locale === "ur"
                ? "ایڈمن تصدیقی کنسول کھولیں"
                : "Open Admin Moderation Console"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {locale === "ur" ? "میرے پوسٹ کردہ اشتہارات" : "My Posted Ads"}
        </Text>
        {isAuthenticated && (
          <TouchableOpacity onPress={fetchMyListings} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={18} color="#2E7D32" />
          </TouchableOpacity>
        )}
      </View>

      {/* SRD FR-06: Segmented Status Tabs (Active vs Sold) */}
      {isAuthenticated && (
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[
              styles.segmentTab,
              activeTab === "active" && styles.segmentTabActive,
            ]}
            onPress={() => setActiveTab("active")}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === "active" && styles.segmentTextActive,
              ]}
            >
              {locale === "ur"
                ? `فعال اشتہارات (${activeCount})`
                : `Active (${activeCount})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentTab,
              activeTab === "sold" && styles.segmentTabActive,
            ]}
            onPress={() => setActiveTab("sold")}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === "sold" && styles.segmentTextActive,
              ]}
            >
              {locale === "ur"
                ? `فروخت شدہ (${soldCount})`
                : `Sold (${soldCount})`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Listings List */}
      {!isAuthenticated ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={48} color="#BBB" />
          <Text style={styles.emptyText}>
            {locale === "ur"
              ? "اپنے اشتہارات دیکھنے کے لیے لاگ ان کریں"
              : "Please login to see your listings"}
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
        </View>
      ) : displayedListings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={48} color="#BBB" />
          <Text style={styles.emptyText}>
            {activeTab === "active"
              ? locale === "ur"
                ? "کوئی فعال اشتہار موجود نہیں ہے"
                : "You have no active listings"
              : locale === "ur"
                ? "کوئی فروخت شدہ اشتہار نہیں ہے"
                : "No sold listings yet"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedListings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.adCard}>
              <TouchableOpacity
                style={styles.adRow}
                onPress={() => onListingPress?.(item)}
              >
                <Image
                  source={{
                    uri:
                      item.images?.[0] ||
                      "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e",
                  }}
                  style={styles.adImage}
                />
                <View style={styles.adDetails}>
                  <View style={styles.statusBadgeRow}>
                    <Text style={styles.adTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.isVerified && (
                      <View style={styles.verifiedMiniBadge}>
                        <Ionicons
                          name="checkmark-circle"
                          size={12}
                          color="#2E7D32"
                        />
                        <Text style={styles.verifiedMiniText}>
                          {locale === "ur" ? "تصدیق شدہ" : "Verified"}
                        </Text>
                      </View>
                    )}
                    {item.status === "sold" && (
                      <View style={styles.soldBadge}>
                        <Text style={styles.soldBadgeText}>
                          {locale === "ur" ? "فروخت شدہ" : "SOLD"}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.adPrice}>
                    Rs {Number(item.pricePKR).toLocaleString()}
                  </Text>
                  <Text style={styles.adSub}>
                    {item.city} • {item.teeth} • {item.viewCount || 0}{" "}
                    {locale === "ur" ? "مشاہدات" : "views"}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.actionRow}>
                {/* Edit Price Action (SRD FR-06) */}
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleOpenEditPrice(item)}
                >
                  <Ionicons name="create-outline" size={18} color="#1E88E5" />
                  <Text style={[styles.actionBtnText, { color: "#1E88E5" }]}>
                    {locale === "ur" ? "قیمت بدلیں" : "Edit Price"}
                  </Text>
                </TouchableOpacity>

                {/* Mark Sold / Active Toggle */}
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleToggleSold(item)}
                >
                  <Ionicons
                    name={
                      item.status === "sold"
                        ? "refresh-circle-outline"
                        : "checkmark-circle-outline"
                    }
                    size={18}
                    color={item.status === "sold" ? "#2E7D32" : "#E65100"}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      { color: item.status === "sold" ? "#2E7D32" : "#E65100" },
                    ]}
                  >
                    {item.status === "sold"
                      ? locale === "ur"
                        ? "دوبارہ کھولیں"
                        : "Mark Active"
                      : locale === "ur"
                        ? "فروخت شدہ"
                        : "Mark Sold"}
                  </Text>
                </TouchableOpacity>

                {/* Delete Ad */}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteListing(item.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#D32F2F" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Edit Price Modal (SRD FR-06) */}
      <Modal
        visible={!!editingItem}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {locale === "ur" ? "نئی قیمت درج کریں" : "Update Listing Price"}
            </Text>
            <Text style={styles.modalSubtitle} numberOfLines={1}>
              {editingItem?.title}
            </Text>

            <TextInput
              style={styles.priceInput}
              placeholder="Price in PKR"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={newPrice}
              onChangeText={setNewPrice}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setEditingItem(null)}
              >
                <Text style={styles.cancelModalText}>
                  {locale === "ur" ? "منسوخ" : "Cancel"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveModalBtn}
                onPress={handleSaveNewPrice}
                disabled={updatingPrice}
              >
                {updatingPrice ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveModalText}>
                    {locale === "ur" ? "محفوظ کریں" : "Save Price"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    backgroundColor: "#2E7D32",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  userCard: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: { flex: 1, marginLeft: 14 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  userName: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  adminBadge: {
    backgroundColor: "#1B5E20",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  userPhone: { fontSize: 13, color: "#666", marginTop: 2 },
  authBtn: { padding: 8 },
  loginBtn: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  loginBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  adminBanner: {
    backgroundColor: "#1B5E20",
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  adminBannerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  adminBannerText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#333" },
  refreshBtn: { padding: 4 },
  segmentedContainer: {
    flexDirection: "row",
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
    padding: 3,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  segmentTabActive: {
    backgroundColor: "#FFFFFF",
    elevation: 1,
  },
  segmentText: { fontSize: 13, fontWeight: "600", color: "#666" },
  segmentTextActive: { color: "#2E7D32", fontWeight: "700" },
  listContent: { paddingHorizontal: 12, paddingBottom: 24 },
  adCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginBottom: 10,
    padding: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  adRow: { flexDirection: "row" },
  adImage: { width: 75, height: 75, borderRadius: 8 },
  adDetails: { flex: 1, marginLeft: 12, justifyContent: "center" },
  statusBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  adTitle: { fontSize: 15, fontWeight: "700", color: "#222", flex: 1 },
  verifiedMiniBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
    gap: 3,
  },
  verifiedMiniText: { color: "#2E7D32", fontSize: 10, fontWeight: "700" },
  soldBadge: {
    backgroundColor: "#D32F2F",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  soldBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  adPrice: { fontSize: 14, fontWeight: "700", color: "#2E7D32", marginTop: 2 },
  adSub: { fontSize: 12, color: "#777", marginTop: 2 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    marginTop: 10,
    paddingTop: 8,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionBtnText: { fontSize: 12, fontWeight: "600" },
  deleteBtn: { padding: 4 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
  },
  emptyText: { color: "#888", fontSize: 14, marginTop: 10 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A1A" },
  modalSubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    marginBottom: 14,
  },
  priceInput: {
    borderWidth: 1.5,
    borderColor: "#2E7D32",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    marginBottom: 16,
  },
  modalActions: { flexDirection: "row", gap: 10 },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CCC",
    alignItems: "center",
  },
  cancelModalText: { color: "#555", fontWeight: "600", fontSize: 14 },
  saveModalBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: "#2E7D32",
    alignItems: "center",
  },
  saveModalText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
