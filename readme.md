Software Requirements Document (SRD)1. Project Overview & Operational Logic1.1 Product NameMadrasa Mandi1.2 Mission StatementMadrasa Mandi is a high-speed, visual-first digital livestock marketplace tailored for livestock farmers, traders, and buyers in Pakistan. The application eliminates the traditional high-friction hurdles of digital marketplaces by offering open guest browsing, dual camera/gallery media capture, instant ad publication, and official platform trust verification.1.3 Core Business & Access RulesGuest-First Browsing (No Login Barrier): Anyone can open the app, search, filter, and view animal ads without logging in or creating an account.Instant Public Publication: When an authenticated seller submits an animal listing, it publishes directly and immediately to the live public feed with standard unverified status (isVerified: false).Admin Verification & Moderation Gate: All submitted ads automatically mirror to an admin moderation console. Admins review live ads and can award an official Verified Badge (isVerified: true) or delete any fraudulent, inappropriate, or spam listing.Platform-Mediated Contact (Zero Direct Chat): Direct seller-to-buyer chat and seller phone numbers are hidden from public view. All inquiries route directly to official Madrasa Mandi agents via WhatsApp or direct phone calls to prevent scams and broker transactions safely.Seller-Gated Authentication: Authentication is triggered strictly when a user taps + Post Ad or opens My Ads.Zero Voice Dependency: All audio note features are excluded; listing media relies entirely on compressed photos.Unified Native Tech Stack: Cloudinary is excluded. All database documents and media assets reside in Firebase (Firestore + Firebase Storage), with strict client-side compression on device.2. Technical Stack & Free-Tier Operational BoundsLayerTechnologyQuota / StrategyMobile ClientReact Native (Expo)Cross-platform runtime targeting Android.AuthenticationFirebase AuthenticationPhone OTP (or Mobile + Password) scoped strictly to sellers.DatabaseCloud FirestoreFree tier: 50,000 document reads, 20,000 document writes/day.Media StorageFirebase Cloud StorageFree tier: 5 GB total storage, 1 GB/day download egress.Client Compressorreact-native-image-resizerResizes every photo to max 1080p and compresses to ~150 KB JPEG before upload to preserve the 1 GB/day download budget.Push NotificationsExpo Notifications / FCMTriggers alerts when an ad is verified by an admin.3. Cloud Firestore Data Schema3.1 Collection: usersTypeScriptinterface UserDocument {
uid: string; // Primary Key (Firebase Auth UID)
name: string; // Seller full name
phone: string; // Pakistani mobile number (+923XXXXXXXXX)
city: string; // Operating district / tehsil
role: 'user' | 'admin'; // Access control level
fcmToken?: string; // Push notification device token
createdAt: Timestamp; // Account creation timestamp
}
3.2 Collection: animalsTypeScriptinterface AnimalDocument {
animalId: string; // Unique ad identifier
sellerId: string; // Reference to users.uid
sellerPhone: string; // Recorded for platform/admin use; hidden from public buyers
category: 'Cow' | 'Buffalo' | 'Goat' | 'Sheep' | 'Camel' | 'Other';
breed: string; // Breed name (e.g., Sahiwal, Gulabi, Kajli)
pricePKR: number; // Listing price in Pakistani Rupees
ageTeeth: string; // E.g., 'Khera / 0 Dant', 'Do Dant', 'Chaunda', 'Chhatra'
weightKg?: number; // Live animal weight (optional)
images: string[]; // Direct Firebase Storage download URLs
location: {
city: string; // District or tehsil name
latitude?: number;
longitude?: number;
};
status: 'active' | 'sold'; // Defaults to 'active' immediately upon submit
isVerified: boolean; // Defaults to false; toggled to true upon admin verification
viewCount: number; // Incremented on ad opening
createdAt: Timestamp; // Creation timestamp
} 4. Functional RequirementsFR-01: Localization EngineSingle-tap toggle between Urdu (اردو) and English accessible on the top navigation bar.Global language context mapping all UI strings dynamically.FR-02: Public Marketplace Feed (No Login Required)2-Column Responsive Card Grid: Displays animal photo thumbnail, price in PKR, city, breed/category, and verified badge indicator.Visual Category Scroller: Quick-filter shortcuts with livestock icons (Cow, Buffalo, Goat, Sheep, Camel).Filter & Search Modal:Free-text search by breed, title, or city.Category selector.Price range filter (Min / Max PKR).Age/teeth selector."Verified Only" toggle (filters listings where isVerified == true).Bandwidth & Read Optimization: Strict pagination using Firestore limit(20) per fetch to prevent quota exhaustion.FR-03: Listing Details & Platform Deal RelaySwipeable image carousel displaying all uploaded animal photos.Attribute breakdown table (Category, Breed, Age/Teeth, Live Weight, Price, Location, Verification Status).Direct Deal Relay Actions (Zero Login Needed):"Call Mandi Agent" Button: Opens device dialer (tel:+92XXXXXXXXXX) directly to platform representatives."Inquire via WhatsApp" Button: Opens WhatsApp chat with a pre-filled deal inquiry text containing the animal ID, title, and listed price.FR-04: Seller Authentication (Triggered on Demand)Triggered only when a guest attempts to tap + Post Ad or enter My Ads.Mobile number verification via Firebase Phone Auth (SMS OTP) or credentials.Persistent local session storage via AsyncStorage.FR-05: Visual "Post Ad" Engine for FarmersDual Media Input: Seller can either snap live photos using the device Camera or select existing photos from the Gallery (expo-image-picker).On-Device Compression Pipeline: Automatically resizes and compresses all selected images down to ~150 KB prior to sending across network.Zero-Typing Selectors: Large visual category cards, touch-friendly numeric keypad for price, and age/teeth steppers.Auto-Location: Automatically fetches device city via GPS (expo-location) with a manual fallback selector.Direct Instant Publish: Uploads compressed photos to Firebase Storage path /animals/{animalId}/{imageIndex}.jpg, captures download URLs, and writes the document to Firestore with status: 'active' and isVerified: false.FR-06: Seller Dashboard ("My Ads")Displays all listings belonging to the authenticated sellerId.Segmented status views: Active, Sold.Actions: Mark as Sold, Edit Price, or Permanently Delete Ad.FR-07: Admin Verification & Moderation ConsoleProtected view accessible strictly to users with role: 'admin'.Real-time stream of all live ads, sorted by creation date with unverified ads visually flagged.Actions:Verify Ad: Sets isVerified = true (instantly displays the Verified Badge on the live feed).Delete Ad: Deletes both the Firestore document and the associated images in Firebase Storage.FR-08: Push NotificationsAutomatic push notification dispatched to the seller's device token via Expo Notifications/FCM as soon as an admin awards their listing the Verified badge.5. Implementation Roadmap (Step-by-Step Delivery)Following our feature-by-feature rule, we will implement each feature's Front-End UI first, followed by its Back-End integration, before progressing to the next.Feature 1: Localization Engine & Public Feed UI
├── Step 1A: Front-End (Urdu/English Context, Top Bar, 2-Column Grid, Filter Modal)
└── Step 1B: Back-End (Public Firestore Read Queries with limit(20))

Feature 2: Listing Detail Screen & Platform Contact Relay
├── Step 2A: Front-End (Photo Carousel, Specs Table, Call/WhatsApp Floating Actions)
└── Step 2B: Back-End (Dynamic Firestore Document Fetch, Linking WhatsApp/Dialer URLs)

Feature 3: Seller Authentication & Profile Setup
├── Step 3A: Front-End (Gated Access Modal, Phone Input, OTP/Password Form)
└── Step 3B: Back-End (Firebase Phone Auth, Firestore Users Collection Hook)

Feature 4: Farmer "Post Ad" Flow with Dual Image Input
├── Step 4A: Front-End (Camera/Gallery Selectors, Category Grid, Numeric Inputs)
└── Step 4B: Back-End (Image Compression, Firebase Storage Upload, Firestore Instant Active Write)

Feature 5: Seller Dashboard ("My Ads")
├── Step 5A: Front-End (Seller Ads Grid, Price Edit Modal, Mark as Sold Button)
└── Step 5B: Back-End (Seller-Scoped Firestore Queries, Update and Delete Handlers)

Feature 6: Admin Verification & Moderation Console
├── Step 6A: Front-End (Admin Dashboard, Moderation Cards, Verify/Delete Controls)
└── Step 6B: Back-End (Admin Security Rules, Firestore isVerified Update & Storage Deletion)

Feature 7: Push Notifications & Release Preparation
├── Step 7A: Integration (Expo Push Token Hook, Verification Push Notification Trigger)
└── Step 7B: Production Polish (EAS Build configuration, Play Store Closed Testing Setup)
