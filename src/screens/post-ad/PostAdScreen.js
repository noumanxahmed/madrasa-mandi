import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { uploadMultipleImages } from "../../utils/cloudinary";

const CATEGORIES = [
  { id: "Cow", labelEn: "Cow / Bull", labelUr: "گائے / بیل" },
  { id: "Goat", labelEn: "Bakray", labelUr: "بکرا" },
  { id: "Sheep", labelEn: "Chhatray", labelUr: "چھترا" },
  { id: "Buffalo", labelEn: "Buffalo", labelUr: "بھینس" },
  { id: "Camel", labelEn: "Camel / Oont", labelUr: "اونٹ" },
];

const TEETH_OPTIONS = [
  { id: "Khira", labelEn: "Khira (Milk teeth)", labelUr: "کھیرہ" },
  { id: "Do Danda", labelEn: "2 Teeth (Do Danda)", labelUr: "دوندہ (2)" },
  { id: "Chaug", labelEn: "4 Teeth (Chaug)", labelUr: "چوگہ (4)" },
  { id: "Chhatt", labelEn: "6 Teeth (Chhatt)", labelUr: "چھٹا (6)" },
];

const GENDERS = [
  { id: "Male", labelEn: "Male (نر)", labelUr: "نر" },
  { id: "Female", labelEn: "Female (مادہ)", labelUr: "مادہ" },
];

const QUICK_CITIES = [
  "Lahore",
  "Karachi",
  "Rawalpindi",
  "Multan",
  "Faisalabad",
  "Sahiwal",
];

export default function PostAdScreen({ onBack, onSuccess }) {
  const { locale } = useLanguage();
  const { currentUser, userProfile } = useAuth();

  const [images, setImages] = useState([]);
  const [category, setCategory] = useState("Cow");
  const [teeth, setTeeth] = useState("Do Danda");
  const [gender, setGender] = useState("Male");
  const [title, setTitle] = useState("");
  const [breed, setBreed] = useState("");
  const [weight, setWeight] = useState("");
  const [pricePKR, setPricePKR] = useState("");
  const [city, setCity] = useState("Lahore");
  const [sellerName, setSellerName] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (userProfile?.displayName) {
      setSellerName(userProfile.displayName);
    }
    if (currentUser?.phoneNumber) {
      setSellerPhone(currentUser.phoneNumber);
    }
    if (userProfile?.city) {
      setCity(userProfile.city);
    }
  }, [currentUser, userProfile]);

  // SRD FR-05: Dual Media Input — 1. Gallery Picker with Compression (quality: 0.6)
  const handlePickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        locale === "ur" ? "اجازت درکار ہے" : "Permission Required",
        locale === "ur"
          ? "تصاویر منتخب کرنے کے لیے گیلری کی اجازت ضروری ہے۔"
          : "Photo library access is required to upload images.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.6,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  // SRD FR-05: Dual Media Input — 2. Live Camera Capture with Compression (quality: 0.6)
  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        locale === "ur"
          ? "کیمرہ کی اجازت درکار ہے"
          : "Camera Permission Needed",
        locale === "ur"
          ? "لائیو تصویر کھینچنے کے لیے کیمرے کی اجازت دیں۔"
          : "Camera permission is required to take live animal photos.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.6,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Info", "Please provide a title for the animal.");
      return;
    }
    if (!pricePKR.trim() || isNaN(Number(pricePKR))) {
      Alert.alert(
        "Invalid Price",
        "Please enter a valid numeric price in PKR.",
      );
      return;
    }
    if (!sellerPhone.trim()) {
      Alert.alert(
        "Contact Missing",
        "Please provide a valid seller phone number.",
      );
      return;
    }

    setSubmitting(true);
    setStatusMessage(
      locale === "ur"
        ? "تصاویر اپلوڈ ہو رہی ہیں..."
        : "Compressing & uploading photos...",
    );

    try {
      let finalImages = [];

      if (images.length > 0) {
        finalImages = await uploadMultipleImages(images);
      } else {
        finalImages = [
          "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e",
        ];
      }

      setStatusMessage(
        locale === "ur" ? "اشتہار محفوظ کیا جا رہا ہے..." : "Saving listing...",
      );

      const payload = {
        title: title.trim(),
        category,
        teeth,
        gender,
        breed: breed.trim() || "Local",
        weight: weight.trim() ? Number(weight) : null,
        pricePKR: Number(pricePKR),
        city: city.trim() || "Pakistan",
        location: {
          city: city.trim() || "Pakistan",
        },
        sellerName: sellerName.trim() || "Mandi Trader",
        sellerPhone: sellerPhone.trim(),
        sellerId: currentUser?.uid || null,
        description: description.trim(),
        images: finalImages,
        status: "active",
        isVerified: false,
        viewCount: 0,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "animals"), payload);
      Alert.alert(
        locale === "ur" ? "کامیابی" : "Success",
        locale === "ur"
          ? "اشتہار کامیابی سے شائع ہو گیا!"
          : "Listing posted successfully!",
      );
      onSuccess?.();
    } catch (err) {
      console.error("Submission error:", err);
      Alert.alert(
        "Submission Failed",
        err.message || "Could not publish listing.",
      );
    } finally {
      setSubmitting(false);
      setStatusMessage("");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {locale === "ur" ? "اشتہار شائع کریں" : "Post Livestock Ad"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* SRD FR-05: Dual Media Input (Camera + Gallery) */}
        <Text style={styles.sectionTitle}>
          {locale === "ur" ? "تصاویر شامل کریں" : "Upload Animal Photos"}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.mediaRow}
        >
          {/* Live Camera Button */}
          <TouchableOpacity style={styles.uploadCard} onPress={handleTakePhoto}>
            <Ionicons name="camera" size={28} color="#2E7D32" />
            <Text style={styles.uploadText}>
              {locale === "ur" ? "کیمرہ" : "Take Photo"}
            </Text>
          </TouchableOpacity>

          {/* Gallery Button */}
          <TouchableOpacity
            style={styles.uploadCard}
            onPress={handlePickFromGallery}
          >
            <Ionicons name="images-outline" size={28} color="#2E7D32" />
            <Text style={styles.uploadText}>
              {locale === "ur" ? "گیلری" : "From Gallery"}
            </Text>
          </TouchableOpacity>

          {images.map((uri, index) => (
            <View key={index} style={styles.previewContainer}>
              <Image source={{ uri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.deleteBadge}
                onPress={() => handleRemoveImage(index)}
              >
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {/* Category Selector */}
        <Text style={styles.sectionTitle}>
          {locale === "ur" ? "جانور کی قسم" : "Select Category"}
        </Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, category === cat.id && styles.chipActive]}
              onPress={() => setCategory(cat.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  category === cat.id && styles.chipTextActive,
                ]}
              >
                {locale === "ur" ? cat.labelUr : cat.labelEn}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mandi Teeth (Danda) Selection */}
        <Text style={styles.sectionTitle}>
          {locale === "ur" ? "دانت (دوندہ / چوگہ)" : "Teeth Status"}
        </Text>
        <View style={styles.chipRow}>
          {TEETH_OPTIONS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.chip, teeth === item.id && styles.chipActive]}
              onPress={() => setTeeth(item.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  teeth === item.id && styles.chipTextActive,
                ]}
              >
                {locale === "ur" ? item.labelUr : item.labelEn}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Gender Selection */}
        <Text style={styles.sectionTitle}>
          {locale === "ur" ? "جنس" : "Gender"}
        </Text>
        <View style={styles.chipRow}>
          {GENDERS.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[styles.chip, gender === g.id && styles.chipActive]}
              onPress={() => setGender(g.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  gender === g.id && styles.chipTextActive,
                ]}
              >
                {locale === "ur" ? g.labelUr : g.labelEn}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input Fields */}
        <Text style={styles.sectionTitle}>
          {locale === "ur" ? "جانور کی معلومات" : "Animal Information"}
        </Text>

        <TextInput
          style={styles.input}
          placeholder={
            locale === "ur"
              ? "اشتہار کا عنوان (مثال: ساہیوال بچھڑا)"
              : "Listing Title (e.g. Sahiwal Pure Calf)"
          }
          placeholderTextColor="#999"
          value={title}
          onChangeText={setTitle}
        />

        <View style={styles.twoColumn}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder={
              locale === "ur"
                ? "نسل (مثال: ساہیوال، بیوٹل)"
                : "Breed (e.g. Sahiwal)"
            }
            placeholderTextColor="#999"
            value={breed}
            onChangeText={setBreed}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder={locale === "ur" ? "وزن (کلوگرام)" : "Weight (in KG)"}
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={weight}
            onChangeText={setWeight}
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder={locale === "ur" ? "قیمت (روپے PKR)" : "Price (PKR)"}
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={pricePKR}
          onChangeText={setPricePKR}
        />

        {/* Quick City Chips + City Input */}
        <Text style={styles.sectionTitle}>
          {locale === "ur" ? "شہر / منڈی" : "City / Mandi Location"}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 8 }}
        >
          {QUICK_CITIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.cityChip,
                city.toLowerCase() === c.toLowerCase() && styles.chipActive,
              ]}
              onPress={() => setCity(c)}
            >
              <Text
                style={[
                  styles.chipText,
                  city.toLowerCase() === c.toLowerCase() &&
                    styles.chipTextActive,
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TextInput
          style={styles.input}
          placeholder={
            locale === "ur" ? "شہر کا نام لکھیں" : "Or type city / tehsil name"
          }
          placeholderTextColor="#999"
          value={city}
          onChangeText={setCity}
        />

        {/* Contact Info */}
        <Text style={styles.sectionTitle}>
          {locale === "ur" ? "رابطہ کی تفصیلات" : "Seller Contact"}
        </Text>

        <TextInput
          style={styles.input}
          placeholder={locale === "ur" ? "بیچنے والے کا نام" : "Seller Name"}
          placeholderTextColor="#999"
          value={sellerName}
          onChangeText={setSellerName}
        />

        <TextInput
          style={styles.input}
          placeholder={
            locale === "ur"
              ? "واٹس ایپ / فون نمبر (03001234567)"
              : "WhatsApp Phone (e.g. 03001234567)"
          }
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          value={sellerPhone}
          onChangeText={setSellerPhone}
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={
            locale === "ur"
              ? "مزید تفصیلات (اختیاری)"
              : "Description / Details (Optional)"
          }
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>
              {locale === "ur" ? "اشتہار پوسٹ کریں" : "Publish Listing"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
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
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginTop: 14,
    marginBottom: 8,
  },
  mediaRow: { flexDirection: "row", marginBottom: 10 },
  uploadCard: {
    width: 88,
    height: 88,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#2E7D32",
    borderStyle: "dashed",
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  uploadText: {
    fontSize: 11,
    color: "#2E7D32",
    fontWeight: "700",
    marginTop: 4,
  },
  previewContainer: { position: "relative", marginRight: 12 },
  previewImage: { width: 88, height: 88, borderRadius: 10 },
  deleteBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#D32F2F",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  chip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCDCDC",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cityChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCDCDC",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#2E7D32", borderColor: "#2E7D32" },
  chipText: { fontSize: 13, color: "#444", fontWeight: "500" },
  chipTextActive: { color: "#FFFFFF", fontWeight: "700" },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#222",
    marginBottom: 10,
  },
  twoColumn: { flexDirection: "row", gap: 10 },
  halfInput: { flex: 1 },
  textArea: { height: 90, textAlignVertical: "top" },
  submitButton: {
    backgroundColor: "#E65100",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  loadingContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});
