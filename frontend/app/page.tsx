"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem("mb_token");
    router.replace(token ? "/dashboard" : "/login");
  }, []);
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#0a0e1a" }}>
      <div className="text-center">
        <div className="text-blue-500 text-4xl mb-3">🚇</div>
        <p style={{ color: "#64748b" }} className="text-sm">Loading MetroBuddy...</p>
      </div>
    </div>
  );
}
