// =====================================================================
// File: src/hooks/useIsAdmin.js
// (hook para consultar el rol admin y reusar en guardas de ruta)
// =====================================================================
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../services/firebase";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";

export function useIsAdmin() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      try {
        const byUidRef = doc(db, "administracion", user.uid);
        const byUidSnap = await getDoc(byUidRef);
        if (byUidSnap.exists()) {
          setIsAdmin(true);
          setLoading(false);
          return;
        }
        const q = query(
          collection(db, "administracion"),
          where("email", "==", user.email || ""),
          limit(1)
        );
        const snap = await getDocs(q);
        setIsAdmin(!snap.empty);
      } catch (e) {
        console.error(e);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return { loading, isAdmin };
}