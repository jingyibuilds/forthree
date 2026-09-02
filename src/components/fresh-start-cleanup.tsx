"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function FreshStartCleanup({ target = "/" }: { target?: string }) {
  const router = useRouter();

  useEffect(() => {
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
        const key = sessionStorage.key(i);
        if (key?.startsWith("forthree:")) sessionStorage.removeItem(key);
      }
    } catch {
      // Local cleanup is best-effort; the database reset already happened.
    }
    router.replace(target);
  }, [router, target]);

  return null;
}
