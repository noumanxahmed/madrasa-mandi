import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Linking,
  FlatList,
  Alert,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useLanguage } from "../../context/LanguageContext";

const { width } = Dimensions.get("window");

// SRD FR-03: Official Madrasa Mandi Agent Contact (Platform-Mediated Relay)
const MANDI_AGENT_PHONE = "+923001234567";

export default function ListingDetailScreen({ animal, onBack }) {
  const { locale } = useLanguage();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [views, setViews] = useState((animal?.viewCount || 0) + 1);

  // SRD Section 3.2: Increment viewCount on ad opening
  useEffect(() => {
    const incrementView = async () => {
      if (!animal?.id) return;
      try {
        const animalRef = doc(db, "animals", animal.id);
        await updateDoc(animalRef, {
          viewCount: increment(1),
        });
      } catch (err) {
        console.warn("Could not increment viewCount:", err.message);
      }
    };
    incrementView();
  }, [animal?.id]);

  const images =
    animal?.images && animal.images.length > 0
      ? animal.images
      : ["https://images.unsplash.com/photo-1570042225831-d98fa7577f1e"];

  const formatPrice = (price) => {
    if (!price && price !== 0) return "0";
    return Number(price).toLocaleString("en-PK");
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${animal?.title || "Livestock"} - Rs ${formatPrice(animal?.pricePKR)} on Madrasa Mandi\nLocation: ${animal?.city || "Pakistan"}`,
      });
    } catch (error) {
      console.warn("Share error:", error);
    }
  };

  // SRD FR-03: "Call Mandi Agent" Button routes directly to platform representative
  const handleCall = () => {
    Linking.openURL(`tel:${MANDI_AGENT_PHONE}`).catch(() => {
      Alert.alert("Error", "Unable to initiate call on this device.");
    });
  };

  // SRD FR-03: "Inquire via WhatsApp" routes to Mandi Agent with pre-filled deal inquiry
  const handleWhatsApp = () => {
    const cleanPhone = MANDI_AGENT_PHONE.replace(/[^0-9]/g, "");
    const adId = animal?.id ? animal.id.slice(0, 6).toUpperCase() : "N/A";
    const message = encodeURIComponent(
      locale === "ur"
        ? `السلام علیکم مدثرہ منڈی ایجنٹ! میں اس جانور کی خریداری میں دلچسپی رکھتا ہوں:\nجانور: ${animal?.title || "مویشی"}\nآئی ڈی: ${adId}\nنسل: ${animal?.breed || "مقامی"}\nشہر: ${animal?.city || "پاکستان"}\nدرج قیمت: Rs ${formatPrice(animal?.pricePKR)}`
        : `Assalam-o-Alaikum Madrasa Mandi Agent! I want to inquire about buying this animal:\nTitle: ${animal?.title || "Livestock"}\nAd ID: ${adId}\nBreed: ${animal?.breed || "Local"}\nCity: ${animal?.city || "Pakistan"}\nListed Price: Rs ${formatPrice(animal?.pricePKR)}`,
    );
    const whatsappUrl = `whatsapp://send?phone=${cleanPhone}&text=${message}`;

    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          return Linking.openURL(`https://wa.me/${cleanPhone}?text=${message}`);
        }
      })
      .catch(() => {
        Alert.alert("Error", "WhatsApp is not installed on this device.");
      });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Image Gallery Header */}
        <View style={styles.imageContainer}>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => index.toString()}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveImageIndex(index);
            }}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={styles.image}
                resizeMode="cover"
              />
            )}
          />

          {/* Floating Header Actions */}
          <SafeAreaView style={styles.floatingNav} edges={["top"]}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={onBack}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navButton}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Image Pagination Indicator */}
          {images.length > 1 && (
            <View style={styles.paginationBadge}>
              <Text style={styles.paginationText}>
                {activeImageIndex + 1}/{images.length}
              </Text>
            </View>
          )}
        </View>

        {/* Content Body */}
        <View style={styles.contentBody}>
          {/* Price & Verified Row */}
          <View style={styles.headerInfo}>
            <View>
              <Text style={styles.priceLabel}>
                {locale === "ur" ? "قیمت" : "Price"}
              </Text>
              <Text style={styles.priceValue}>
                {locale === "ur" ? "روپے " : "Rs "}
                {formatPrice(animal?.pricePKR)}
              </Text>
            </View>
            {animal?.isVerified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#2E7D32" />
                <Text style={styles.verifiedText}>
                  {locale === "ur" ? "تصدیق شدہ" : "Verified"}
                </Text>
              </View>
            ) : (
              <View style={styles.unverifiedBadge}>
                <Ionicons name="time-outline" size={14} color="#777" />
                <Text style={styles.unverifiedText}>
                  {locale === "ur" ? "معائنہ زیر التواء" : "Standard Ad"}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{animal?.title || "Livestock"}</Text>

          {/* Location & View Count Row */}
          <View style={styles.metaRow}>
            <View style={styles.locationRow}>
              <Ionicons name="location-sharp" size={16} color="#666" />
              <Text style={styles.locationText}>
                {animal?.city || "Pakistan"}
              </Text>
            </View>
            <View style={styles.viewsRow}>
              <Ionicons name="eye-outline" size={16} color="#777" />
              <Text style={styles.viewsText}>
                {views} {locale === "ur" ? "مشاہدات" : "views"}
              </Text>
            </View>
          </View>

          {/* Key Attributes Grid */}
          <View style={styles.specsSection}>
            <Text style={styles.sectionHeading}>
              {locale === "ur" ? "خصوصیات" : "Attributes"}
            </Text>
            <View style={styles.specsGrid}>
              <View style={styles.specCard}>
                <Text style={styles.specLabel}>
                  {locale === "ur" ? "قسم" : "Category"}
                </Text>
                <Text style={styles.specValue}>
                  {animal?.category || "General"}
                </Text>
              </View>
              <View style={styles.specCard}>
                <Text style={styles.specLabel}>
                  {locale === "ur" ? "نسل" : "Breed"}
                </Text>
                <Text style={styles.specValue}>{animal?.breed || "Local"}</Text>
              </View>
              <View style={styles.specCard}>
                <Text style={styles.specLabel}>
                  {locale === "ur" ? "دانت" : "Teeth"}
                </Text>
                <Text style={styles.specValue}>
                  {animal?.teeth || "2 (دوندہ)"}
                </Text>
              </View>
              <View style={styles.specCard}>
                <Text style={styles.specLabel}>
                  {locale === "ur" ? "وزن" : "Weight"}
                </Text>
                <Text style={styles.specValue}>
                  {animal?.weight ? `${animal.weight} KG` : "N/A"}
                </Text>
              </View>
              <View style={styles.specCard}>
                <Text style={styles.specLabel}>
                  {locale === "ur" ? "جنس" : "Gender"}
                </Text>
                <Text style={styles.specValue}>{animal?.gender || "Male"}</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descSection}>
            <Text style={styles.sectionHeading}>
              {locale === "ur" ? "تفصیل" : "Description"}
            </Text>
            <Text style={styles.descText}>
              {animal?.description ||
                (locale === "ur"
                  ? "صحت مند اور عمدہ جانور، ہر قسم کے عیب سے پاک۔ قربانی اور افزائش نسل کے لیے بہترین انتخاب۔"
                  : "Healthy and well-maintained livestock. Excellent quality with no health defects. Perfect for farm breeding or Qurbani.")}
            </Text>
          </View>

          {/* Platform-Mediated Trust Card (SRD Section 1.3 & FR-03) */}
          <View style={styles.sellerCard}>
            <View style={styles.sellerAvatar}>
              <Ionicons name="shield-checkmark" size={24} color="#2E7D32" />
            </View>
            <View style={styles.sellerDetails}>
              <Text style={styles.sellerName}>
                {locale === "ur"
                  ? "مدثرہ منڈی محفوظ سودا"
                  : "Madrasa Mandi Safe Deal Relay"}
              </Text>
              <Text style={styles.sellerSubtext}>
                {locale === "ur"
                  ? `فروخت کنندہ: ${animal?.sellerName || "منڈی ٹریڈر"} (نمائندے کے ذریعے رابطہ کریں)`
                  : `Listed by ${animal?.sellerName || "Mandi Trader"} • Mediated by Official Agent`}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Dock (SRD FR-03) */}
      <SafeAreaView style={styles.actionDock} edges={["bottom"]}>
        <TouchableOpacity
          style={styles.callButton}
          onPress={handleCall}
          activeOpacity={0.85}
        >
          <Ionicons name="call" size={18} color="#FFFFFF" />
          <Text style={styles.callButtonText}>
            {locale === "ur" ? "منڈی ایجنٹ کو کال کریں" : "Call Mandi Agent"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.whatsappButton}
          onPress={handleWhatsApp}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
          <Text style={styles.whatsappButtonText}>
            {locale === "ur" ? "واٹس ایپ رابطہ" : "Inquire via WhatsApp"}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  scrollContent: { paddingBottom: 100 },
  imageContainer: {
    width: width,
    height: 320,
    backgroundColor: "#000",
    position: "relative",
  },
  image: { width: width, height: 320 },
  floatingNav: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  paginationBadge: {
    position: "absolute",
    bottom: 12,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paginationText: { color: "#FFFFFF", fontSize: 12, fontWeight: "bold" },
  contentBody: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  headerInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  priceLabel: { fontSize: 12, color: "#777", fontWeight: "500" },
  priceValue: { fontSize: 24, fontWeight: "800", color: "#2E7D32" },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  verifiedText: { fontSize: 12, color: "#2E7D32", fontWeight: "700" },
  unverifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  unverifiedText: { fontSize: 11, color: "#666", fontWeight: "600" },
  title: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", marginBottom: 8 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: { fontSize: 13, color: "#666", fontWeight: "500" },
  viewsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewsText: { fontSize: 12, color: "#777", fontWeight: "500" },
  specsSection: { marginBottom: 18 },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
    marginBottom: 10,
  },
  specsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  specCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#F4F6F4",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8ECE8",
  },
  specLabel: { fontSize: 11, color: "#777", marginBottom: 2 },
  specValue: { fontSize: 13, fontWeight: "700", color: "#222" },
  descSection: { marginBottom: 18 },
  descText: { fontSize: 13, color: "#555", lineHeight: 20 },
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F8E9",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C8E6C9",
    gap: 12,
    marginBottom: 20,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  sellerDetails: { flex: 1 },
  sellerName: { fontSize: 14, fontWeight: "700", color: "#1B5E20" },
  sellerSubtext: { fontSize: 12, color: "#388E3C", marginTop: 2 },
  actionDock: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 12,
  },
  callButton: {
    flex: 1,
    backgroundColor: "#1E88E5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 10,
  },
  callButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  whatsappButton: {
    flex: 1,
    backgroundColor: "#25D366",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 10,
  },
  whatsappButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
