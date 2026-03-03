"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import {
  Video,
  Shield,
  Zap,
  Users,
  Monitor,
  MessageSquare,
  Copy,
  Check,
  ArrowRight,
} from "lucide-react";
import dynamic from "next/dynamic";
import ScrollReveal from "@/components/ScrollReveal";

// Lazy load 3D particle field (heavy)
const ParticleField = dynamic(() => import("@/components/ParticleField"), {
  ssr: false,
  loading: () => (
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse at 30% 50%, rgba(99, 102, 241, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, rgba(34, 211, 238, 0.08) 0%, transparent 50%)",
      }}
    />
  ),
});

export default function HomePage() {
  const router = useRouter();
  const [joinLink, setJoinLink] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [copied, setCopied] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);

  const handleCreateMeeting = () => {
    const roomId = uuidv4().split("-")[0]; // Short ID
    const name = displayName.trim() || "Host";
    sessionStorage.setItem("flowmeet-name", name);
    setCreatedRoomId(roomId);
  };

  const handleJoinMeeting = () => {
    if (!joinLink.trim()) return;
    const name = displayName.trim() || "Guest";
    sessionStorage.setItem("flowmeet-name", name);

    // Extract room ID from link or use directly
    const roomId = joinLink.includes("/room/")
      ? joinLink.split("/room/")[1]?.split("?")[0]
      : joinLink.trim();

    if (roomId) {
      router.push(`/room/${roomId}`);
    }
  };

  const handleCopyLink = () => {
    if (!createdRoomId) return;
    const link = `${window.location.origin}/room/${createdRoomId}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      // Fallback for non-secure contexts (HTTP)
      alert(`Copy this link manually: ${link}`);
    }
  };

  const handleGoToRoom = () => {
    if (createdRoomId) {
      router.push(`/room/${createdRoomId}`);
    }
  };

  const features = [
    { icon: Video, title: "Crystal Clear Video", desc: "HD video & audio powered by WebRTC peer-to-peer technology" },
    { icon: Shield, title: "No Account Needed", desc: "Join instantly with a link. No sign-ups, no passwords, no friction" },
    { icon: Zap, title: "Lightning Fast", desc: "Connect in under 3 seconds. Direct peer-to-peer, no middleman servers" },
    { icon: Users, title: "Up to 10 People", desc: "Perfect for team standups, study groups, and small team meetings" },
    { icon: Monitor, title: "Screen Sharing", desc: "Share your entire screen or a specific window with one click" },
    { icon: MessageSquare, title: "Live Chat", desc: "Send messages alongside video. Never miss a link or note" },
  ];

  const steps = [
    { num: "01", title: "Create a Room", desc: "Click 'New Meeting' to generate a unique room link instantly" },
    { num: "02", title: "Share the Link", desc: "Copy and share the link with your team via chat, email, or anywhere" },
    { num: "03", title: "Start Talking", desc: "Everyone joins the same room. Video, audio, chat — all in one place" },
  ];

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      {/* ========== HERO SECTION ========== */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        {/* 3D Background */}
        <Suspense fallback={null}>
          <ParticleField />
        </Suspense>

        {/* Gradient overlays */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center bottom, rgba(99, 102, 241, 0.1) 0%, transparent 60%)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-3xl text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 animate-fade-in"
            style={{
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              fontFamily: "var(--fm-font-mono)",
              fontSize: "0.8rem",
              color: "var(--fm-accent)",
            }}
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            100% Free · No Sign Up Required
          </div>

          {/* Heading */}
          <h1
            className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in-up"
            style={{
              fontFamily: "var(--fm-font-display)",
              lineHeight: 1.1,
            }}
          >
            Video Meetings,{" "}
            <span className="gradient-text">Reimagined</span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-lg md:text-xl mb-10 max-w-xl mx-auto animate-fade-in-up"
            style={{
              color: "var(--fm-text-secondary)",
              animationDelay: "0.15s",
              lineHeight: 1.7,
            }}
          >
            Crystal-clear video calls for up to 10 people. No downloads,
            no accounts, no cost. Just share a link and start talking.
          </p>

          {/* Name input */}
          <div
            className="max-w-sm mx-auto mb-6 animate-fade-in-up"
            style={{ animationDelay: "0.25s" }}
          >
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              className="w-full px-5 py-3 rounded-xl text-center text-sm outline-none focus:ring-2 transition-shadow"
              style={{
                background: "var(--fm-bg-card)",
                border: "1px solid var(--fm-border)",
                color: "var(--fm-text-primary)",
                fontFamily: "var(--fm-font-body)",
                boxShadow: "none",
              }}
              onFocus={(e) =>
                (e.target.style.boxShadow = "0 0 0 2px var(--fm-primary)")
              }
              onBlur={(e) => (e.target.style.boxShadow = "none")}
              aria-label="Your display name"
            />
          </div>

          {/* CTA Buttons */}
          {!createdRoomId ? (
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 animate-fade-in-up"
              style={{ animationDelay: "0.35s" }}
            >
              <button
                onClick={handleCreateMeeting}
                className="btn-primary text-lg px-8 py-3.5 flex items-center gap-2"
                id="new-meeting-btn"
              >
                <Video size={20} />
                New Meeting
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={joinLink}
                  onChange={(e) => setJoinLink(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinMeeting()}
                  placeholder="Paste a room link or code"
                  className="flex-1 sm:w-64 px-5 py-3.5 rounded-xl text-sm outline-none"
                  style={{
                    background: "var(--fm-bg-card)",
                    border: "1px solid var(--fm-border)",
                    color: "var(--fm-text-primary)",
                    fontFamily: "var(--fm-font-mono)",
                  }}
                  aria-label="Room link or code"
                  id="join-input"
                />
                <button
                  onClick={handleJoinMeeting}
                  className="btn-secondary py-3.5 px-5"
                  disabled={!joinLink.trim()}
                  id="join-btn"
                >
                  Join
                </button>
              </div>
            </div>
          ) : (
            /* Room created — show link */
            <div
              className="glass-card max-w-md mx-auto p-6 mb-8 animate-fade-in-up"
              style={{ animationDelay: "0.1s" }}
            >
              <p
                className="text-sm mb-3"
                style={{ color: "var(--fm-text-muted)" }}
              >
                Your meeting is ready!
              </p>
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg mb-4"
                style={{
                  background: "var(--fm-bg-surface)",
                  fontFamily: "var(--fm-font-mono)",
                  fontSize: "0.85rem",
                }}
              >
                <span className="flex-1 truncate" style={{ color: "var(--fm-accent)" }}>
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/room/${createdRoomId}`
                    : `/room/${createdRoomId}`}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="toolbar-btn w-8 h-8 flex-shrink-0"
                  title={copied ? "Copied!" : "Copy link"}
                  aria-label="Copy room link"
                >
                  {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
              <button
                onClick={handleGoToRoom}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                Join Room <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
          <div
            className="w-6 h-10 rounded-full border-2 flex justify-center pt-2"
            style={{ borderColor: "var(--fm-text-dim)" }}
          >
            <div
              className="w-1.5 h-3 rounded-full"
              style={{ background: "var(--fm-text-dim)" }}
            />
          </div>
        </div>
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal className="text-center mb-16">
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: "var(--fm-font-display)" }}
            >
              Everything you need.{" "}
              <span className="gradient-text">Nothing you don&apos;t.</span>
            </h2>
            <p style={{ color: "var(--fm-text-muted)", maxWidth: "500px", margin: "0 auto" }}>
              Built for simplicity. Powered by WebRTC. Completely free, forever.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, idx) => (
              <ScrollReveal key={feature.title} delay={idx * 100}>
                <div className="glass-card glass-card-hover p-6 h-full cursor-pointer transition-all">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(34, 211, 238, 0.1))",
                    }}
                  >
                    <feature.icon size={22} style={{ color: "var(--fm-primary-hover)" }} />
                  </div>
                  <h3
                    className="text-lg font-semibold mb-2"
                    style={{ fontFamily: "var(--fm-font-display)" }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--fm-text-muted)" }}>
                    {feature.desc}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className="py-24 px-4" style={{ background: "var(--fm-bg-dark)" }}>
        <div className="max-w-4xl mx-auto">
          <ScrollReveal className="text-center mb-16">
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: "var(--fm-font-display)" }}
            >
              Up and running in{" "}
              <span className="gradient-text">seconds</span>
            </h2>
          </ScrollReveal>

          <div className="space-y-8">
            {steps.map((step, idx) => (
              <ScrollReveal key={step.num} delay={idx * 150}>
                <div className="flex items-start gap-6 group">
                  <div
                    className="text-4xl font-bold flex-shrink-0 w-16 text-right"
                    style={{
                      fontFamily: "var(--fm-font-display)",
                      color: "var(--fm-primary)",
                      opacity: 0.5,
                    }}
                  >
                    {step.num}
                  </div>
                  <div
                    className="flex-1 glass-card p-6 group-hover:border-indigo-500/30 transition-colors"
                  >
                    <h3
                      className="text-xl font-semibold mb-2"
                      style={{ fontFamily: "var(--fm-font-display)" }}
                    >
                      {step.title}
                    </h3>
                    <p style={{ color: "var(--fm-text-muted)" }}>{step.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FOOTER CTA ========== */}
      <section className="py-24 px-4 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(99, 102, 241, 0.08) 0%, transparent 60%)",
          }}
        />
        <ScrollReveal className="relative z-10">
          <h2
            className="text-3xl md:text-5xl font-bold mb-6"
            style={{ fontFamily: "var(--fm-font-display)" }}
          >
            Ready to <span className="gradient-text">FlowMeet</span>?
          </h2>
          <p className="mb-8 text-lg" style={{ color: "var(--fm-text-muted)" }}>
            No downloads. No sign-ups. Just click and connect.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="btn-primary text-lg px-10 py-4"
          >
            Start a Free Meeting
          </button>
        </ScrollReveal>

        {/* Footer */}
        <div className="mt-20 pt-8" style={{ borderTop: "1px solid var(--fm-border)" }}>
          <p style={{ color: "var(--fm-text-dim)", fontSize: "0.85rem" }}>
            Built with Next.js · WebRTC · Socket.IO · Three.js
          </p>
          <p
            style={{
              color: "var(--fm-text-dim)",
              fontSize: "0.75rem",
              marginTop: "4px",
              fontFamily: "var(--fm-font-mono)",
            }}
          >
            FlowMeet © {new Date().getFullYear()} — 100% Free, Forever
          </p>
        </div>
      </section>
    </main>
  );
}
