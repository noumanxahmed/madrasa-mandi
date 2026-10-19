import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../context/LanguageContext";
import AnimalGridCard from "../../components/cards/AnimalGridCard";
import { fetchActiveAnimals } from "../../services/firestoreService";

const CATEGORIES = [
  {
    id: "all",
    icon: "grid-outline",
    key: "categories.all",
    labelEn: "All",
    labelUr: "تمام",
  },
  {
    id: "Cow",
    icon: "paw-outline",
    key: "categories.cows",
    labelEn: "Cows & Bulls",
    labelUr: "گائے اور بیل",
  },
  {
    id: "Goat",
    icon: "nutrition-outline",
    key: "categories.goats",
    labelEn: "Goats / Bakray",
    labelUr: "بکرے اور بکریاں",
  },
  {
    id: "Sheep",
    icon: "leaf-outline",
    key: "categories.sheep",
    labelEn: "Sheep / Chhatray",
    labelUr: "چھترے اور دنبے",
  },
  {
    id: "Buffalo",
    icon: "shield-outline",
    key: "categories.buffaloes",
    labelEn: "Buffaloes",
    labelUr: "بھینسیں",
  },
  {
    id: "Camel",
    icon: "sunny-outline",
    key: "categories.camels",
    labelEn: "Camels / Oont",
    labelUr: "اونٹ",
  },
];

const CITIES = [
  "All",
  "Lahore",
  "Karachi",
  "Rawalpindi",
  "Multan",
  "Faisalabad",
  "Sahiwal",
];
const TEETH_OPTIONS = [
  { id: "all", labelEn: "All", labelUr: "تمام" },
  { id: "Khira", labelEn: "Khira", labelUr: "کھیرہ" },
  { id: "Do Danda", labelEn: "Do Danda (2)", labelUr: "دوندہ (2)" },
  { id: "Chaug", labelEn: "Chaug (4)", labelUr: "چوگہ (4)" },
  { id: "Chhatt", labelEn: "Chhatt (6)", labelUr: "چھٹا (6)" },
];
const GENDERS = [
  { id: "all", labelEn: "All", labelUr: "تمام" },
  { id: "Male", labelEn: "Male", labelUr: "نر" },
  { id: "Female", labelEn: "Female", labelUr: "مادہ" },
];

export default function HomeScreen({
  onPostAdPress,
  onListingPress,
  onProfilePress,
}) {
  const { t, locale, toggleLanguage } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [animals, setAnimals] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedCity, setSelectedCity] = useState("All");
  const [selectedTeeth, setSelectedTeeth] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const loadFeed = useCallback(
    async (isRefresh = false, category = selectedCategory) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const result = await fetchActiveAnimals({
          category,
          lastVisible: null,
          pageSize: 20,
        });

        setAnimals(result.animals);
        setLastDoc(result.lastVisible);
        setHasMore(result.animals.length === 20);
      } catch (err) {
        console.warn(
          "Could not load livestock feed. Verify Firebase config or Firestore rules:",
          err,
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedCategory],
  );

  useEffect(() => {
    loadFeed(false, selectedCategory);
  }, [selectedCategory, loadFeed]);

  const handleLoadMore = async () => {
    if (loading || loadingMore || !hasMore || !lastDoc) return;
    setLoadingMore(true);
    try {
      const result = await fetchActiveAnimals({
        category: selectedCategory,
        lastVisible: lastDoc,
        pageSize: 20,
      });
      setAnimals((prev) => [...prev, ...result.animals]);
      setLastDoc(result.lastVisible);
      setHasMore(result.animals.length === 20);
    } catch (err) {
      console.warn("Error loading more listings:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedCity("All");
    setSelectedTeeth("all");
    setSelectedGender("all");
    setMinPrice("");
    setMaxPrice("");
    setVerifiedOnly(false);
    setFilterModalVisible(false);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      selectedCity !== "All" ||
      selectedTeeth !== "all" ||
      selectedGender !== "all" ||
      minPrice.trim() !== "" ||
      maxPrice.trim() !== "" ||
      verifiedOnly
    );
  }, [
    selectedCity,
    selectedTeeth,
    selectedGender,
    minPrice,
    maxPrice,
    verifiedOnly,
  ]);

  const filteredAnimals = useMemo(() => {
    return animals.filter((item) => {
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(query);
        const matchesBreed = item.breed?.toLowerCase().includes(query);
        const matchesCity = item.city?.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesBreed && !matchesCity && !matchesDesc) {
          return false;
        }
      }

      // Verified Only filter (SRD FR-02)
      if (verifiedOnly && !item.isVerified) {
        return false;
      }

      // City filter
      if (selectedCity !== "All") {
        if (item.city?.toLowerCase() !== selectedCity.toLowerCase()) {
          return false;
        }
      }

      // Teeth filter
      if (selectedTeeth !== "all") {
        if (item.teeth !== selectedTeeth) {
          return false;
        }
      }

      // Gender filter
      if (selectedGender !== "all") {
        if (item.gender !== selectedGender) {
          return false;
        }
      }

      // Price filter
      const price = Number(item.pricePKR) || 0;
      if (minPrice.trim() && !isNaN(Number(minPrice))) {
        if (price < Number(minPrice)) return false;
      }
      if (maxPrice.trim() && !isNaN(Number(maxPrice))) {
        if (price > Number(maxPrice)) return false;
      }

      return true;
    });
  }, [
    animals,
    searchQuery,
    verifiedOnly,
    selectedCity,
    selectedTeeth,
    selectedGender,
    minPrice,
    maxPrice,
  ]);

  const getCategoryTitle = (cat) => {
    const translated = t(cat.key);
    if (translated === cat.key) {
      return locale === "ur" ? cat.labelUr : cat.labelEn;
    }
    return translated;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="options-outline" size={22} color="#FFFFFF" />
          {hasActiveFilters && <View style={styles.filterBadgeDot} />}
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#777" />
          <TextInput
            placeholder={t("searchPlaceholder")}
            placeholderTextColor="#999"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.langButton} onPress={toggleLanguage}>
          <Text style={styles.langText}>
            {locale === "ur" ? "English" : "اردو"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.profileButton} onPress={onProfilePress}>
          <Ionicons name="person-circle-outline" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* FlatList stays mounted at all times so Header & Categories never disappear */}
      <FlatList
        data={loading ? [] : filteredAnimals}
        numColumns={2}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadFeed(true, selectedCategory)}
            colors={["#2E7D32"]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("selectCategory")}</Text>
              <TouchableOpacity onPress={() => setSelectedCategory("all")}>
                <Text style={styles.viewAllText}>{t("viewAll")}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    selectedCategory === cat.id && styles.categoryCardActive,
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Ionicons
                    name={cat.icon}
                    size={24}
                    color={selectedCategory === cat.id ? "#FFFFFF" : "#2E7D32"}
                  />
                  <Text
                    style={[
                      styles.categoryTitle,
                      selectedCategory === cat.id && styles.categoryTitleActive,
                    ]}
                  >
                    {getCategoryTitle(cat)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.nearbyBanner} activeOpacity={0.8}>
              <View style={styles.nearbyContent}>
                <Ionicons name="locate-outline" size={20} color="#FFFFFF" />
                <Text style={styles.nearbyText}>{t("viewNearby")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#2E7D32" />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="file-tray-outline" size={48} color="#BBB" />
              <Text style={styles.emptyText}>
                {locale === "ur"
                  ? "کوئی جانور دستیاب نہیں ہے"
                  : "No animals match your search or filter criteria"}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <AnimalGridCard item={item} onPress={() => onListingPress?.(item)} />
        )}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator size="small" color="#2E7D32" />
            </View>
          ) : null
        }
      />

      {/* Floating Post Ad Button */}
      <View style={styles.postAdContainer}>
        <TouchableOpacity
          style={styles.postAdButton}
          activeOpacity={0.9}
          onPress={onPostAdPress}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
          <Text style={styles.postAdText}>{t("postAd")}</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {locale === "ur" ? "فلٹرز منتخب کریں" : "Filter Livestock"}
              </Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Verified Only Toggle (SRD FR-02) */}
              <View style={styles.verifiedToggleRow}>
                <View style={styles.verifiedLabelGroup}>
                  <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.verifiedToggleTitle}>
                      {locale === "ur"
                        ? "صرف تصدیق شدہ جانور"
                        : "Verified Listings Only"}
                    </Text>
                    <Text style={styles.verifiedToggleSub}>
                      {locale === "ur"
                        ? "مدثرہ منڈی ٹیم کی جانب سے تصدیق شدہ"
                        : "Inspected & verified by Madrasa Mandi admins"}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={verifiedOnly}
                  onValueChange={setVerifiedOnly}
                  trackColor={{ false: "#DCDCDC", true: "#A5D6A7" }}
                  thumbColor={verifiedOnly ? "#2E7D32" : "#F5F5F5"}
                />
              </View>

              {/* City Selection */}
              <Text style={styles.filterSectionTitle}>
                {locale === "ur" ? "شہر / منڈی" : "City / Mandi"}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipRow}
              >
                {CITIES.map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={[
                      styles.filterChip,
                      selectedCity === city && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedCity(city)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedCity === city && styles.filterChipTextActive,
                      ]}
                    >
                      {city}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Teeth Selection */}
              <Text style={styles.filterSectionTitle}>
                {locale === "ur" ? "دانت (دوندہ / چوگہ)" : "Teeth Status"}
              </Text>
              <View style={styles.chipWrapRow}>
                {TEETH_OPTIONS.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.filterChip,
                      selectedTeeth === item.id && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedTeeth(item.id)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedTeeth === item.id &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      {locale === "ur" ? item.labelUr : item.labelEn}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Gender Selection */}
              <Text style={styles.filterSectionTitle}>
                {locale === "ur" ? "جنس" : "Gender"}
              </Text>
              <View style={styles.chipWrapRow}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={[
                      styles.filterChip,
                      selectedGender === g.id && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedGender(g.id)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedGender === g.id && styles.filterChipTextActive,
                      ]}
                    >
                      {locale === "ur" ? g.labelUr : g.labelEn}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Price Range */}
              <Text style={styles.filterSectionTitle}>
                {locale === "ur" ? "قیمت کی حد (PKR)" : "Price Range (PKR)"}
              </Text>
              <View style={styles.priceRow}>
                <TextInput
                  style={styles.priceInput}
                  placeholder={locale === "ur" ? "کم سے کم" : "Min Price"}
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={minPrice}
                  onChangeText={setMinPrice}
                />
                <Text style={styles.priceDash}>-</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder={locale === "ur" ? "زیادہ سے زیادہ" : "Max Price"}
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                />
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleResetFilters}
              >
                <Text style={styles.resetButtonText}>
                  {locale === "ur" ? "ری سیٹ کریں" : "Reset All"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.applyButtonText}>
                  {locale === "ur" ? "لاگو کریں" : "Apply Filters"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F5F5F5" },
  headerContainer: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: { padding: 6, position: "relative" },
  filterBadgeDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF5252",
  },
  searchBar: {
    flex: 1,
    paddingHorizontal: 10,
    height: 38,
    gap: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: "#000" },
  langButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  langText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 12 },
  profileButton: {
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  centerContainer: {
    paddingVertical: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: { paddingHorizontal: 6, paddingBottom: 80 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 6,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#222" },
  viewAllText: { fontSize: 13, color: "#2E7D32", fontWeight: "600" },
  categoryScroll: { paddingLeft: 6, marginBottom: 10 },
  categoryCard: {
    width: 105,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  categoryCardActive: { backgroundColor: "#2E7D32", borderColor: "#2E7D32" },
  categoryTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
    marginTop: 4,
    textAlign: "center",
  },
  categoryTitleActive: { color: "#FFFFFF" },
  nearbyBanner: {
    backgroundColor: "#388E3C",
    marginHorizontal: 8,
    marginBottom: 10,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nearbyContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  nearbyText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: { color: "#888", fontSize: 14, marginTop: 8 },
  postAdContainer: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  postAdButton: {
    backgroundColor: "#E65100",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 25,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    gap: 6,
  },
  postAdText: { color: "#FFFFFF", fontSize: 15, fontWeight: "bold" },

  /* Filter Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: "82%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A1A" },
  verifiedToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  verifiedLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  verifiedToggleTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1B5E20",
  },
  verifiedToggleSub: {
    fontSize: 11,
    color: "#388E3C",
    marginTop: 1,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#444",
    marginTop: 12,
    marginBottom: 8,
  },
  chipRow: { flexDirection: "row", marginBottom: 6 },
  chipWrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  filterChip: {
    backgroundColor: "#F4F6F4",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filterChipActive: {
    backgroundColor: "#2E7D32",
    borderColor: "#2E7D32",
  },
  filterChipText: { fontSize: 12, color: "#444", fontWeight: "600" },
  filterChipTextActive: { color: "#FFFFFF" },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: "#FAFAFA",
  },
  priceDash: { fontSize: 16, fontWeight: "700", color: "#777" },
  modalActionRow: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CCC",
    alignItems: "center",
  },
  resetButtonText: { color: "#555", fontSize: 14, fontWeight: "600" },
  applyButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#2E7D32",
    alignItems: "center",
  },
  applyButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
