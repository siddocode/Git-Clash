"use client";

import { useEffect } from "react";

export function useFingerPrint() {
  useEffect(() => {
    try {
      let anonId = localStorage.getItem("anon_id");
      if (!anonId) {
        anonId = crypto.randomUUID();
        localStorage.setItem("anon_id", anonId);
      }
      if (!document.cookie.includes("anon_id=")) {
        document.cookie = `anon_id=${anonId}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch {}
  }, []);
}