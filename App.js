import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LanguageProvider } from "./src/context/LanguageContext";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import HomeScreen from "./src/screens/feed/HomeScreen";
import ListingDetailScreen from "./src/screens/details/ListingDetailScreen";
import PostAdScreen from "./src/screens/post-ad/PostAdScreen";
import LoginScreen from "./src/screens/auth/LoginScreen";
import ProfileScreen from "./src/screens/profile/ProfileScreen";
import AdminDashboardScreen from "./src/screens/admin/AdminDashboardScreen";

function MainNavigator() {
  const { isAuthenticated } = useAuth();
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [isPostingAd, setIsPostingAd] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isViewingProfile, setIsViewingProfile] = useState(false);
  const [isViewingAdmin, setIsViewingAdmin] = useState(false);
  const [pendingPostAd, setPendingPostAd] = useState(false);

  const handlePostAdPress = () => {
    if (!isAuthenticated) {
      // SRD FR-04: Seller-Gated Authentication when tapping + Post Ad
      setPendingPostAd(true);
      setIsAuthenticating(true);
    } else {
      setIsPostingAd(true);
    }
  };

  return (
    <>
      <StatusBar style="light" backgroundColor="#2E7D32" />
      {isAuthenticating ? (
        <LoginScreen
          onBack={() => {
            setIsAuthenticating(false);
            setPendingPostAd(false);
          }}
          onLoginSuccess={() => {
            setIsAuthenticating(false);
            if (pendingPostAd) {
              setPendingPostAd(false);
              setIsPostingAd(true);
            }
          }}
        />
      ) : isViewingAdmin ? (
        <AdminDashboardScreen
          onBack={() => setIsViewingAdmin(false)}
          onListingPress={(animal) => {
            setIsViewingAdmin(false);
            setSelectedAnimal(animal);
          }}
        />
      ) : isViewingProfile ? (
        <ProfileScreen
          onBack={() => setIsViewingProfile(false)}
          onLoginPress={() => setIsAuthenticating(true)}
          onListingPress={(animal) => {
            setIsViewingProfile(false);
            setSelectedAnimal(animal);
          }}
          onAdminPress={() => {
            setIsViewingProfile(false);
            setIsViewingAdmin(true);
          }}
        />
      ) : isPostingAd ? (
        <PostAdScreen
          onBack={() => setIsPostingAd(false)}
          onSuccess={() => setIsPostingAd(false)}
        />
      ) : selectedAnimal ? (
        <ListingDetailScreen
          animal={selectedAnimal}
          onBack={() => setSelectedAnimal(null)}
        />
      ) : (
        <HomeScreen
          onPostAdPress={handlePostAdPress}
          onListingPress={(animal) => setSelectedAnimal(animal)}
          onProfilePress={() => setIsViewingProfile(true)}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LanguageProvider>
          <MainNavigator />
        </LanguageProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
