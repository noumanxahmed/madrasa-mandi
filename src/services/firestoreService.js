import {
  collection,
  query,
  where,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { db } from "../config/firebase";

const ANIMALS_COLLECTION = "animals";

/**
 * Fetch active animal listings with pagination and optional category filtering.
 * Uses single-field queries + client-side sorting to avoid composite index errors.
 */
export async function fetchActiveAnimals({
  category = "all",
  lastVisible = null,
  pageSize = 20,
} = {}) {
  try {
    let constraints = [where("status", "==", "active")];

    if (category && category !== "all") {
      constraints.push(where("category", "==", category));
    }

    if (lastVisible) {
      constraints.push(startAfter(lastVisible));
    }

    constraints.push(limit(pageSize));

    const q = query(collection(db, ANIMALS_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    const animals = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const createdDate = data.createdAt?.toDate
        ? data.createdAt.toDate()
        : new Date(0);

      return {
        id: docSnap.id,
        ...data,
        _timestamp: createdDate.getTime(),
        imageUrl: data.images && data.images.length > 0 ? data.images[0] : null,
        timeAgo: formatTimeAgo(
          data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        ),
      };
    });

    // Sort newest first in memory so no Firestore composite index is required
    animals.sort((a, b) => b._timestamp - a._timestamp);

    const newLastVisible =
      snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

    return { animals, lastVisible: newLastVisible };
  } catch (error) {
    console.error("Error fetching animals:", error);
    throw error;
  }
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
