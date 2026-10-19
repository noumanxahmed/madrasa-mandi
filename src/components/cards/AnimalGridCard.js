import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../context/LanguageContext";

export default function AnimalGridCard({ item, onPress }) {
  const { t } = useLanguage();

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
        {item.isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
            <Text style={styles.verifiedText}>{t("verified")}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.metaRow}>
          <Text style={styles.viewsText}>
            <Ionicons name="eye-outline" size={12} color="#777" />{" "}
            {item.viewCount}
          </Text>
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {t("currency")} {Number(item.pricePKR).toLocaleString()}
          </Text>
          <Text style={styles.timeAgo}>{item.timeAgo}</Text>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color="#666" />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.city}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    margin: 5,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  imageContainer: {
    width: "100%",
    height: 140,
    position: "relative",
    backgroundColor: "#F0F0F0",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  verifiedBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#2E7D32",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  verifiedText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  content: {
    padding: 8,
  },
  metaRow: {
    alignItems: "flex-end",
    marginBottom: 2,
  },
  viewsText: {
    fontSize: 11,
    color: "#777",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 4,
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1B5E20",
  },
  timeAgo: {
    fontSize: 10,
    color: "#888",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 2,
  },
  locationText: {
    fontSize: 12,
    color: "#666",
  },
});
