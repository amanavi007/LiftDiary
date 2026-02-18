"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { jsonFetch } from "@/lib/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await jsonFetch(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="glass-card-strong space-y-3 rounded-2xl p-5">
      <h1 className="text-2xl font-bold text-white">{mode === "login" ? "Welcome back" : "Create account"}</h1>
      <p className="text-sm text-zinc-200/80">LiftDiary keeps your sessions fast and coach-driven.</p>

      <label className="block text-sm">
        <span className="mb-1 block text-zinc-100/90">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="glass-input"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-zinc-100/90">Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={mode === "signup" ? 8 : 1}
          className="glass-input"
        />
      </label>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="glass-button"
      >
        {loading ? "Please wait..." : mode === "login" ? "Log In" : "Sign Up"}
      </button>

      <p className="text-center text-sm text-zinc-200/75">
        {mode === "login" ? "Need an account?" : "Already have an account?"}{" "}
        <Link href={mode === "login" ? "/signup" : "/login"} className="text-orange-200 underline">
          {mode === "login" ? "Sign up" : "Log in"}
        </Link>
      </p>
    </form>
  );
}
