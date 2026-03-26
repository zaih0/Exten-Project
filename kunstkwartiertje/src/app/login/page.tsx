// login screen
"use client";

import { FormEvent, useState } from "react";

export default function login() {
  const [role, setRole] = useState<"klant" | "artiest">("klant");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = formData.get("username");
    const password = formData.get("password");

    console.log("Login payload:", { username, password, role });
    alert("Login (demo)! Check console for submitted values");
  };

  return (
    <div
      className="flex flex-col min-h-screen items-center justify-center font-sans text-zinc-900"
      style={{
        backgroundImage:
          "radial-gradient(circle at 12% 18%, rgba(232, 121, 249, 0.34) 0%, rgba(196, 181, 253, 0.20) 30%, rgba(255,255,255,0) 62%), radial-gradient(circle at 86% 12%, rgba(168, 85, 247, 0.34) 0%, rgba(129, 140, 248, 0.18) 34%, rgba(255,255,255,0) 62%), radial-gradient(circle at 50% 92%, rgba(217, 70, 239, 0.26) 0%, rgba(139, 92, 246, 0.14) 38%, rgba(255,255,255,0) 68%), linear-gradient(135deg, rgba(250, 245, 255, 1) 0%, rgba(237, 233, 254, 1) 38%, rgba(243, 232, 255, 1) 68%, rgba(253, 242, 248, 1) 100%)",
      }}
    >
      <h1
        className="mb-5 text-center text-4xl font-extrabold tracking-tight"
        style={{
          color: "#ffffff",
          WebkitTextStroke: "2px rgb(147 51 234)",
          textShadow:
            "0 1px 0 rgba(147,51,234,0.25), 0 12px 30px rgba(147,51,234,0.20)",
        }}
      >
        Login
      </h1>

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white/88 p-6 shadow-xl backdrop-blur ring-1 ring-purple-200/80"
      >
        <input
          type="text"
          placeholder="Username"
          name="username"
          className="border border-purple-200 rounded px-4 py-2 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
        <input
          type="password"
          placeholder="Password"
          name="password"
          className="border border-purple-200 rounded px-4 py-2 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
        <select
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as "klant" | "artiest")}
          className="border border-purple-200 rounded px-4 py-2 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
          required
        >
          <option value="klant">Klant</option>
          <option value="artiest">Artiest</option>
        </select>
        <button
          type="submit"
          className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded px-4 py-2 hover:from-purple-700 hover:to-fuchsia-700 transition-colors"
        >
          Login
        </button>
      </form>
    </div>
  );
}