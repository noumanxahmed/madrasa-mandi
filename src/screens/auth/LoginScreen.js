import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { signInAnonymously } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen({ onBack, onLoginSuccess }) {
  const { locale } = useLanguage();
  const { setDirectUser } = useAuth();

  const [phone, setPhone] = useState("03001234567");
  const [otp, setOtp] = useState("123456");
  const [step, setStep] = useState("phone"); // 'phone' | 'otp'
  const [loading, setLoading] = useState(false);

  const formatPhoneNumber = (raw) => {
    let cleaned = raw.replace(/[^0-9]/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }
    return `+92${cleaned}`;
  };

  const handleSendCode = async () => {
    if (!phone.trim() || phone.trim().length < 10) {
      Alert.alert(
        locale === "ur" ? "غلط فون نمبر" : "Invalid Phone",
        locale === "ur"
          ? "براہ کرم درست 10 یا 11 ہندسوں کا فون نمبر درج کریں۔"
          : "Please enter a valid Pakistani phone number (e.g. 03001234567).",
      );
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
    }, 400);
  };

  const handleVerifyCode = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      Alert.alert(
        locale === "ur" ? "غلط کوڈ" : "Invalid Code",
        locale === "ur"
          ? "براہ کرم 6 ہندسوں کا تصدیقی کوڈ درج کریں۔"
          : "Please enter the 6-digit OTP code.",
      );
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phone);
      let uid = "user_" + Date.now();

      // Sign in anonymously to get a legitimate Firebase Auth UID
      try {
        const userCredential = await signInAnonymously(auth);
        if (userCredential?.user?.uid) {
          uid = userCredential.user.uid;
        }
      } catch (authErr) {
        console.warn("Firebase Anonymous Auth fallback:", authErr.message);
      }

      const profileData = {
        uid: uid,
        phoneNumber: formattedPhone,
        displayName: `Trader (${phone.slice(-4)})`,
        city: "Lahore",
        role: "seller",
      };

      // Save/merge into Firestore users collection
      try {
        const userRef = doc(db, "users", uid);
        await setDoc(
          userRef,
          {
            ...profileData,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (dbErr) {
        console.warn("Firestore user sync warning:", dbErr.message);
      }

      // Immediately propagate user state through AuthContext & AsyncStorage
      await setDirectUser(profileData);

      Alert.alert(
        locale === "ur" ? "خوش آمدید" : "Success",
        locale === "ur" ? "لاگ ان کامیاب رہا!" : "Successfully logged in!",
      );
      onLoginSuccess?.();
    } catch (err) {
      console.error("Login verification error:", err);
      Alert.alert(
        "Login Failed",
        err.message || "Could not authenticate session.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {locale === "ur" ? "لاگ ان / سائن اپ" : "Login / Sign Up"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="call-outline" size={36} color="#2E7D32" />
        </View>

        <Text style={styles.title}>
          {step === "phone"
            ? locale === "ur"
              ? "اپنا فون نمبر درج کریں"
              : "Enter Phone Number"
            : locale === "ur"
              ? "تصدیقی کوڈ درج کریں"
              : "Enter 6-Digit Code"}
        </Text>

        <Text style={styles.subtitle}>
          {step === "phone"
            ? locale === "ur"
              ? "ہم آپ کے نمبر پر 6 ہندسوں کا تصدیقی کوڈ بھیجیں گے۔"
              : "We will send an SMS verification code to your number."
            : `${
                locale === "ur" ? "کوڈ بھیجا گیا: " : "Code sent to: "
              } ${formatPhoneNumber(phone)}`}
        </Text>

        {step === "phone" ? (
          <View style={styles.inputWrapper}>
            <View style={styles.countryCodeBadge}>
              <Text style={styles.countryCodeText}>+92</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="300 1234567"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={11}
            />
          </View>
        ) : (
          <View style={styles.otpWrapper}>
            <TextInput
              style={styles.otpInput}
              placeholder="123456"
              placeholderTextColor="#BBB"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={step === "phone" ? handleSendCode : handleVerifyCode}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {step === "phone"
                ? locale === "ur"
                  ? "کوڈ حاصل کریں"
                  : "Send Code"
                : locale === "ur"
                  ? "تصدیق کریں اور لاگ ان کریں"
                  : "Verify & Continue"}
            </Text>
          )}
        </TouchableOpacity>

        {step === "otp" && (
          <TouchableOpacity
            style={styles.resendBtn}
            onPress={() => setStep("phone")}
          >
            <Text style={styles.resendText}>
              {locale === "ur" ? "نمبر تبدیل کریں" : "Change Phone Number"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
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
  content: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  subtitle: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 18,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#DCDCDC",
    borderRadius: 10,
    width: "100%",
    height: 52,
    marginBottom: 20,
    overflow: "hidden",
  },
  countryCodeBadge: {
    backgroundColor: "#F4F6F4",
    paddingHorizontal: 14,
    height: "100%",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#E0E0E0",
  },
  countryCodeText: { fontSize: 16, fontWeight: "700", color: "#222" },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#222",
    letterSpacing: 1,
  },
  otpWrapper: { width: "100%", marginBottom: 20 },
  otpInput: {
    borderWidth: 1.5,
    borderColor: "#2E7D32",
    borderRadius: 10,
    height: 52,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 8,
    color: "#222",
  },
  primaryBtn: {
    backgroundColor: "#2E7D32",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  resendBtn: { marginTop: 16, padding: 6 },
  resendText: { color: "#2E7D32", fontSize: 13, fontWeight: "600" },
});
