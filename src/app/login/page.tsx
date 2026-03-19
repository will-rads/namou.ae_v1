"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push("/backend");
      } else {
        const data = await res.json();
        setError(data.error || "Invalid credentials.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-mint-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-forest font-heading">
            Backend Access
          </h1>
          <p className="text-sm text-muted mt-1">Sign in to continue</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-mint-light/60 shadow-sm p-6 space-y-4"
        >
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 font-medium">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-forest mb-1.5"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              className="w-full px-3 py-2.5 rounded-xl border border-mint-light/60 bg-white text-sm text-deep-forest focus:border-forest/40 focus:ring-1 focus:ring-forest/10 outline-none transition-colors"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-forest mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2.5 rounded-xl border border-mint-light/60 bg-white text-sm text-deep-forest focus:border-forest/40 focus:ring-1 focus:ring-forest/10 outline-none transition-colors"
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-forest text-white rounded-xl font-semibold text-sm hover:bg-deep-forest transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
