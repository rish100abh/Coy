"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "framer-motion";
import Image from "next/image";
import {
  ArrowRight, Heart, House, Sparkles, Users, X, MapPin, RotateCcw,
  CircleUserRound, Compass, LogOut, Check, LockKeyhole,
  MessageCircle, Send, Trash2, ArrowLeft, Search, Camera, ImagePlus,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { ChatMessage, DemoProfile, MatchProfile, Profile } from "@/types";
import { z } from "zod";

type Tab = "home" | "discover" | "matches" | "profile";
type AuthMode = "signin" | "signup";

const FEMALE_PHOTO = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85";
const MALE_PHOTO = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85";
const GENDER_OPTIONS = [
  ["WOMAN", "Woman"],
  ["MAN", "Man"],
  ["NON_BINARY", "Non-binary"],
  ["ANOTHER_IDENTITY", "Another identity"],
  ["UNDISCLOSED", "Prefer not to say"],
];
const DISCOVERY_OPTIONS = [
  ["EVERYONE", "Everyone"],
  ["WOMEN", "Women"],
  ["MEN", "Men"],
  ["NON_BINARY_AND_OTHER", "Non-binary & other identities"],
  ["PREFER_NOT_TO_SAY", "Prefer not to say"],
];
const INDIAN_CITIES = [
  "Ahmedabad", "Amritsar", "Bengaluru", "Bhopal", "Bhubaneswar", "Chandigarh",
  "Chennai", "Coimbatore", "Dehradun", "Delhi", "Faridabad", "Ghaziabad", "Goa",
  "Gurugram", "Guwahati", "Hyderabad", "Indore", "Jaipur", "Jalandhar", "Jodhpur",
  "Kanpur", "Kochi", "Kolkata", "Kota", "Lucknow", "Ludhiana", "Madurai",
  "Mangaluru", "Meerut", "Mumbai", "Mysuru", "Nagpur", "Nashik", "Noida",
  "Patna", "Pune", "Raipur", "Rajkot", "Ranchi", "Surat", "Thane",
  "Thiruvananthapuram", "Udaipur", "Vadodara", "Varanasi", "Visakhapatnam",
];
const INTEREST_OPTIONS = [
  "Coffee", "Travel", "Music", "Food", "Fitness", "Movies",
  "Books", "Art", "Nature", "Photography", "Dancing", "Pets",
  "Cooking", "Yoga", "Cricket", "Board games",
];
const MAX_PROFILE_PHOTO_BYTES = 700 * 1024;
const clientProfileSchema = z.object({
  name: z.string().trim().min(2).max(40),
  id: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().min(18).max(99),
  city: z.string().trim().min(1).max(60),
  gender: z.enum(["WOMAN", "MAN", "NON_BINARY", "ANOTHER_IDENTITY", "UNDISCLOSED"]),
  interestedIn: z.array(z.enum([
    "EVERYONE",
    "WOMEN",
    "MEN",
    "NON_BINARY_AND_OTHER",
    "PREFER_NOT_TO_SAY",
  ])).min(1),
  bio: z.string().max(240),
  occupation: z.string().max(60),
  photo: z.string().max(MAX_PROFILE_PHOTO_BYTES).optional(),
  interests: z.array(z.string().trim().min(1).max(30)).max(6).optional(),
});

function profilePhoto(gender: string) {
  return gender === "MAN" ? MALE_PHOTO : FEMALE_PHOTO;
}

async function resizeProfilePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is unavailable");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.82, 0.74, 0.66, 0.58, 0.5]) {
      const photo = canvas.toDataURL("image/jpeg", quality);
      if (photo.length <= MAX_PROFILE_PHOTO_BYTES) return photo;
    }
    throw new Error("This photo is too large to save. Choose a smaller image.");
  } finally {
    bitmap.close();
  }
}

function IndianCitySuggestions() {
  return (
    <datalist id="coy-indian-cities">
      {INDIAN_CITIES.map((city) => <option key={city} value={city} />)}
    </datalist>
  );
}

function AuthScreen({ onComplete, serviceError }: {
  onComplete: (profile: DemoProfile) => void;
  serviceError: string;
}) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("24");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("UNDISCLOSED");
  const [interestedIn, setInterestedIn] = useState<string[]>(["EVERYONE"]);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not sign in.");
      const parsed = clientProfileSchema.safeParse(data.profile);
      if (!parsed.success) throw new Error("The server returned an invalid profile.");
      onComplete(parsed.data);
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Could not sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (Number(age) < 18 || Number(age) > 99) {
      setError("Coy is for adults. Please enter an age between 18 and 99.");
      return;
    }
    if (interestedIn.length === 0) {
      setError("Choose at least one discovery preference.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          age: Number(age),
          city,
          gender,
          interestedIn,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create your account.");
      const parsed = clientProfileSchema.safeParse(data.profile);
      if (!parsed.success) throw new Error("The server returned an invalid profile.");
      onComplete(parsed.data);
    } catch (signUpError) {
      setError(signUpError instanceof Error ? signUpError.message : "Could not create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function togglePreference(value: string) {
    setInterestedIn((current) => {
      if (value === "EVERYONE") return ["EVERYONE"];
      const selected = current.filter((item) => item !== "EVERYONE");
      const updated = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
      return updated;
    });
  }

  return (
    <main className="auth-page">
      <div className="auth-decoration auth-decoration-one" />
      <div className="auth-decoration auth-decoration-two" />
      <section className="auth-showcase" aria-label="Welcome to Coy">
        <div className="auth-showcase-brand"><span><Heart size={20} fill="currentColor" /></span> coy <i>MEET WITH MEANING</i></div>
        <div className="auth-showcase-copy">
          <span className="auth-showcase-kicker"><Sparkles size={14} /> A LITTLE MORE MEANINGFUL</span>
          <h2>Less swiping.<br />More <em>something real.</em></h2>
          <p>Meet people who feel like your kind of people. Take your time, find your spark, and let a good conversation begin.</p>
        </div>
        <div className="auth-showcase-art" aria-hidden="true">
          <div className="auth-art-glow" />
          <div className="auth-art-orbit auth-art-orbit-one" />
          <div className="auth-art-orbit auth-art-orbit-two" />
          <div className="auth-photo-card auth-photo-main">
            <Image src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=720&q=85" alt="" fill sizes="(max-width: 760px) 0px, 310px" priority />
            <span className="auth-photo-caption"><Heart size={13} fill="currentColor" /> A little spark</span>
          </div>
          <div className="auth-photo-card auth-photo-secondary">
            <Image src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=360&q=85" alt="" fill sizes="(max-width: 760px) 0px, 120px" />
          </div>
          <div className="auth-match-note"><span><Heart size={14} fill="currentColor" /></span><div><strong>It starts with hello</strong><small>Make room for a real connection</small></div></div>
          <span className="auth-art-star auth-art-star-one">✦</span>
          <span className="auth-art-star auth-art-star-two">✧</span>
        </div>
        <div className="auth-showcase-foot"><span><i /> A more thoughtful way to meet</span><span>Made for genuine connection</span></div>
      </section>
      <section className="auth-card">
        <div className="auth-mobile-brand"><span><Heart size={17} fill="currentColor" /></span> coy</div>
        <div className="auth-intro">
          <p className="auth-kicker">{mode === "signin" ? "WELCOME BACK" : "YOUR NEXT CHAPTER"}</p>
          <h1>{mode === "signin" ? "Good to see you." : "Your next story starts here."}</h1>
          <p>{mode === "signin" ? "Sign in to pick up where you left off." : "Create your profile and meet people who feel right."}</p>
        </div>
        {serviceError && <p className="form-error" role="alert">{serviceError}</p>}
        <div className="auth-tabs" role="tablist" aria-label="Account options">
          <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "selected" : ""} onClick={() => { setMode("signin"); setError(""); }}>Sign in</button>
          <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "selected" : ""} onClick={() => { setMode("signup"); setError(""); }}>Create account</button>
        </div>
        {mode === "signin" ? (
          <form className="auth-form" onSubmit={submitSignIn}>
            <label>Email address<input type="email" placeholder="you@example.com" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<input type="password" autoComplete="current-password" required minLength={10} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <p className="demo-note"><LockKeyhole size={15} /> Your profile is saved to your account. Passwords are hashed before storage.</p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button auth-submit" type="submit" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"} {!submitting && <ArrowRight size={17} />}</button>
          </form>
        ) : (
          <form className="auth-form signup-form" onSubmit={submitSignUp}>
            <div className="form-row">
              <label>Your name<input autoComplete="name" placeholder="Name" required minLength={2} maxLength={40} value={name} onChange={(event) => setName(event.target.value)} /></label>
              <label>Age<input type="number" min="18" max="99" required value={age} onChange={(event) => setAge(event.target.value)} /></label>
            </div>
            <label>Email address<input type="email" placeholder="you@example.com" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<input type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /><span className="password-hint">Use at least 10 characters.</span></label>
            <label>City<input list="coy-indian-cities" placeholder="Type or choose an Indian city" required maxLength={60} value={city} onChange={(event) => setCity(event.target.value)} /></label>
            <IndianCitySuggestions />
            <label>How do you describe your gender?
              <select value={gender} onChange={(event) => setGender(event.target.value)}>
                {GENDER_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <fieldset className="preference-field">
              <legend>Who would you like to meet?</legend>
              <div className="preference-options">
                {DISCOVERY_OPTIONS.map(([value, label]) => (
                  <label key={value} className="check-option">
                    <input type="checkbox" checked={interestedIn.includes(value)} onChange={() => togglePreference(value)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {error && <p className="form-error" role="alert">{error}</p>}
            <p className="demo-note"><LockKeyhole size={15} /> Your profile details are saved securely to your account.</p>
            <button className="primary-button auth-submit" type="submit" disabled={submitting}>{submitting ? "Creating account…" : "Create account"} {!submitting && <ArrowRight size={17} />}</button>
          </form>
        )}
        <div className="auth-footer"><span className="auth-footer-icon"><LockKeyhole size={13} /></span><span><strong>Your account, your profile</strong><small>Your profile is available when you sign in on another device.</small></span></div>
      </section>
    </main>
  );
}

function ProfileCard({
  profile,
  onSwipe,
  busy,
}: {
  profile: Profile;
  onSwipe: (action: "LIKE" | "PASS") => Promise<boolean>;
  busy: boolean;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-12, 12]);
  const likeOpacity = useTransform(x, [20, 130], [0, 1]);
  const passOpacity = useTransform(x, [-130, -20], [1, 0]);
  const submitted = useRef(false);
  const [animating, setAnimating] = useState(false);

  async function commitSwipe(action: "LIKE" | "PASS") {
    if (submitted.current || busy) return;
    submitted.current = true;
    setAnimating(true);
    await animate(x, action === "LIKE" ? window.innerWidth : -window.innerWidth, {
      duration: 0.24,
      ease: "easeOut",
    });
    const saved = await onSwipe(action);
    if (!saved) {
      submitted.current = false;
      await animate(x, 0, { duration: 0.18, ease: "easeOut" });
    }
    setAnimating(false);
  }

  return (
    <>
      <motion.article
        drag={!busy && !animating ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.9}
        style={{ x, rotate }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 100) void commitSwipe("LIKE");
          else if (info.offset.x < -100) void commitSwipe("PASS");
        }}
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.28 }}
        className="profile-card"
      >
        <motion.div style={{ opacity: likeOpacity }} className="swipe-stamp like-stamp">LIKE</motion.div>
        <motion.div style={{ opacity: passOpacity }} className="swipe-stamp pass-stamp">PASS</motion.div>
        <Image src={profile.photo} alt={profile.name} className="profile-photo" fill sizes="(max-width: 760px) 100vw, 530px" priority draggable={false} />
        <div className="photo-gradient" />
        <div className="profile-info">
          <div className="name-row">
            <h2>{profile.name}, {profile.age}</h2>
            {profile.occupation && <span className="verified-dot" title="Verified">✓</span>}
          </div>
          <div className="location"><MapPin size={15} /> {profile.city}</div>
          {profile.occupation && <p className="occupation">{profile.occupation}</p>}
          <p className="bio">{profile.bio}</p>
          <div className="interest-row">
            {profile.interests.map((interest) => <span key={interest}>{interest}</span>)}
          </div>
        </div>
      </motion.article>
      <div className="swipe-actions">
        <button className="pass-button" onClick={() => void commitSwipe("PASS")} aria-label="Pass" disabled={busy || animating}><X size={28} /></button>
        <button className="like-button" onClick={() => void commitSwipe("LIKE")} aria-label="Like" disabled={busy || animating}><Heart size={29} fill="currentColor" /></button>
      </div>
    </>
  );
}

function MatchModal({
  match,
  demoPhoto,
  onClose,
}: {
  match: { id: string; user: { id: string; name: string; photo: string } };
  demoPhoto: string;
  onClose: () => void;
}) {
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="match-modal" initial={{ scale: 0.82, y: 30 }} animate={{ scale: 1, y: 0 }}>
        <motion.div className="celebrate" initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }}>✦</motion.div>
        <p className="eyebrow">YOU BOTH LIKED EACH OTHER</p>
        <h2>It&apos;s a Match!</h2>
        <div className="match-photos">
          <Image src={demoPhoto} alt="Your profile" width={112} height={112} />
          <span><Heart size={18} fill="white" /></span>
          <Image src={match.user.photo} alt={match.user.name} width={112} height={112} />
        </div>
        <p>You and <strong>{match.user.name}</strong> just matched.</p>
        <button className="primary-button" onClick={onClose}>Continue discovering</button>
      </motion.div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="profile-card skeleton-card" aria-label="Loading profile">
      <div className="skeleton-photo" />
      <div className="skeleton-line wide" />
      <div className="skeleton-line" />
    </div>
  );
}

function ChatModal({ match, currentUserId, onClose }: {
  match: MatchProfile;
  currentUserId: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messageListRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(`/api/matches/${encodeURIComponent(match.id)}/messages`);
      if (!response.ok) throw new Error("Could not load messages");
      const data = await response.json();
      setMessages(data.messages);
    } catch {
      setError("Could not load this conversation. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [match.id]);

  useEffect(() => {
    void Promise.resolve().then(loadMessages);
  }, [loadMessages]);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const messageText = text.trim();
    if (!messageText || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/matches/${encodeURIComponent(match.id)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: messageText }),
      });
      if (!response.ok) throw new Error("Could not send message");
      const data = await response.json();
      setMessages((current) => [...current, data.message]);
      setText("");
    } catch {
      setError("Message wasn’t sent. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <motion.div
      className="chat-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.section
        className="chat-window"
        role="dialog"
        aria-modal="true"
        aria-label={`Chat with ${match.name}`}
        initial={{ opacity: 0, y: 24, scale: .98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16 }}
      >
        <header className="chat-header">
          <button className="chat-back" onClick={onClose} aria-label="Back to matches"><ArrowLeft /></button>
          <Image src={match.photo} alt="" width={44} height={44} className="chat-avatar" />
          <div className="chat-person"><strong>{match.name}, {match.age}</strong><span><i /> Your mutual match</span></div>
          <button className="chat-close" onClick={onClose} aria-label="Close chat"><X /></button>
        </header>
        <div className="chat-date"><span>YOU MATCHED ON {new Date(match.matchedAt).toLocaleDateString(undefined, { month: "long", day: "numeric" }).toUpperCase()}</span></div>
        <div className="chat-messages" ref={messageListRef} aria-live="polite">
          {loading ? (
            <div className="chat-state">Opening your conversation…</div>
          ) : messages.length === 0 ? (
            <div className="chat-welcome">
              <Image src={match.photo} alt="" width={72} height={72} />
              <h2>Say hello to {match.name}</h2>
              <p>You matched because you both liked each other. Start with a friendly hello.</p>
              <button type="button" onClick={() => setText(`Hi ${match.name}!`)}>Send a friendly hello</button>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`message-row ${message.senderId === currentUserId ? "mine" : "theirs"}`}>
                <p>{message.text}</p>
                <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
              </div>
            ))
          )}
        </div>
        {error && <p className="chat-error" role="alert">{error}<button onClick={() => void loadMessages()}>Retry</button></p>}
        <form className="chat-composer" onSubmit={sendMessage}>
          <input
            aria-label={`Message ${match.name}`}
            placeholder={`Message ${match.name}…`}
            maxLength={1000}
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={loading || sending}
          />
          <button type="submit" aria-label="Send message" disabled={!text.trim() || sending || loading}>
            <Send size={18} />
          </button>
        </form>
        <p className="chat-note">A thoughtful first message goes a long way ✨</p>
      </motion.section>
    </motion.div>
  );
}

function HomePage({ profile, matchesCount, profilesCount, onDiscover, onProfile }: {
  profile: DemoProfile;
  matchesCount: number;
  profilesCount: number;
  onDiscover: () => void;
  onProfile: () => void;
}) {
  return (
    <div className="home-page">
      <header className="home-topbar">
        <div className="brand-mark"><Heart fill="currentColor" size={20} /> coy</div>
        <button className="avatar-button" onClick={onProfile} aria-label="Open profile">
          {profile.photo ? <Image src={profile.photo} alt="" fill sizes="40px" unoptimized /> : profile.name.slice(0, 1).toUpperCase()}
        </button>
      </header>
      <section className="welcome-hero">
        <div className="hero-copy">
          <span className="hero-label"><Sparkles size={14} /> YOUR SPACE TO CONNECT</span>
          <h1>Hi {profile.name.split(" ")[0]},<br />good things start <em>here.</em></h1>
          <p>Make room for a little serendipity. Your next great conversation could be one swipe away.</p>
          <button className="primary-button" onClick={onDiscover}>Start discovering <ArrowRight size={17} /></button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
          <div className="hero-heart"><Heart fill="currentColor" /></div>
          <span className="hero-spark spark-one">✦</span><span className="hero-spark spark-two">✧</span>
        </div>
      </section>
      <section className="home-lower">
        <div className="section-heading"><div><p>YOUR JOURNEY</p><h2>Connection starts with you</h2></div><button onClick={onProfile}>Edit profile <ArrowRight size={15} /></button></div>
        <div className="home-stat-grid">
          <article className="home-stat"><span className="stat-icon pink"><Compass /></span><div><strong>{profilesCount}</strong><p>people to discover</p></div></article>
          <article className="home-stat"><span className="stat-icon purple"><Heart /></span><div><strong>{matchesCount}</strong><p>mutual connections</p></div></article>
        </div>
        <div className="profile-tip"><div className="tip-icon"><Sparkles size={19} /></div><div><strong>A little about you goes a long way</strong><p>Add a bio and interests to help your future connections get to know you.</p></div><button onClick={onProfile} aria-label="Complete your profile"><ArrowRight size={18} /></button></div>
      </section>
    </div>
  );
}

function ProfilePage({ profile, onSave, onSignOut, onResetFeed, resetting }: {
  profile: DemoProfile;
  onSave: (profile: DemoProfile) => Promise<boolean>;
  onSignOut: () => Promise<void>;
  onResetFeed: () => Promise<void>;
  resetting: boolean;
}) {
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [interestError, setInterestError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const profileSections = [
    Boolean(draft.photo?.startsWith("data:image/")),
    Boolean(draft.bio.trim()),
    Boolean(draft.occupation.trim()),
    (draft.interests?.length ?? 0) >= 3,
    Boolean(draft.city.trim()),
  ];
  const completion = Math.round(profileSections.filter(Boolean).length / profileSections.length * 100);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError("");
    const success = await onSave({
      ...draft,
      name: draft.name.trim(),
      city: draft.city.trim(),
      bio: draft.bio.trim(),
      occupation: draft.occupation.trim(),
      interests: draft.interests ?? [],
    });
    setSaved(success);
    if (!success) setSaveError("Your changes couldn’t be saved. Check your connection and try again.");
    else window.setTimeout(() => setSaved(false), 2200);
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setPhotoError("");
    setSaved(false);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError("That image is over 10 MB. Choose a smaller file.");
      return;
    }

    setUploadingPhoto(true);
    try {
      const photo = await resizeProfilePhoto(file);
      setDraft((current) => ({ ...current, photo }));
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Could not process this image. Try another one.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  function toggleInterest(interest: string) {
    setInterestError("");
    const selected = draft.interests ?? [];
    if (selected.includes(interest)) {
      setDraft((current) => ({ ...current, interests: selected.filter((item) => item !== interest) }));
    } else if (selected.length >= 6) {
      setInterestError("Choose up to 6 interests.");
    } else {
      setDraft((current) => ({ ...current, interests: [...selected, interest] }));
    }
  }

  function togglePreference(value: string) {
    setDraft((current) => {
      if (value === "EVERYONE") return { ...current, interestedIn: ["EVERYONE"] };
      const selected = current.interestedIn.filter((item) => item !== "EVERYONE");
      const updated = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
      return { ...current, interestedIn: updated.length ? updated : ["EVERYONE"] };
    });
  }

  return (
    <div className="profile-page">
      <header className="profile-page-header">
        <div><p>YOUR SPACE</p><h1>Your profile</h1></div>
        <button className="signout-button" onClick={() => void onSignOut()}><LogOut size={16} /> Sign out</button>
      </header>
      <section className="profile-hero">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar">
            <Image src={draft.photo ?? profilePhoto(draft.gender)} alt={`${draft.name} profile photo`} width={104} height={104} unoptimized />
          </div>
          <button type="button" className="photo-upload-button" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} aria-label="Upload a profile photo">
            {uploadingPhoto ? <span className="photo-spinner" /> : <Camera size={17} />}
          </button>
          <input ref={photoInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} />
        </div>
        <div className="profile-hero-copy">
          <span className="profile-preview-tag"><CircleUserRound size={13} /> YOUR PROFILE PREVIEW</span>
          <h2>{draft.name || "Your name"}, {draft.age}</h2>
          <p><MapPin size={14} /> {draft.city || "Add your city"} <span>·</span> {GENDER_OPTIONS.find(([value]) => value === draft.gender)?.[1]}</p>
          <div className="profile-hero-actions">
            <button type="button" className="photo-action" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>
              <ImagePlus size={15} /> {uploadingPhoto ? "Preparing photo…" : draft.photo ? "Change photo" : "Add a photo"}
            </button>
            {draft.photo?.startsWith("data:image/") && <button type="button" className="remove-photo-action" onClick={() => { setDraft((current) => ({ ...current, photo: profilePhoto(current.gender) })); setPhotoError(""); }}>Remove</button>}
          </div>
          {photoError && <p className="photo-error" role="alert">{photoError}</p>}
        </div>
        <div className="profile-completion">
          <div><span>Profile strength</span><strong>{completion}%</strong></div>
          <div className="completion-track"><span style={{ width: `${completion}%` }} /></div>
          <p>{completion === 100 ? "Looking great — your profile is complete." : "A little more detail helps make a genuine connection."}</p>
        </div>
      </section>
      <form className="profile-form" onSubmit={submit}>
        <div className="profile-form-heading"><div><span className="profile-section-kicker">THE BASICS</span><h2>About you</h2><p>Share the details that make you, you.</p></div><span className="form-lock"><LockKeyhole size={14} /> Your account profile</span></div>
        <div className="form-row">
          <label>Your name<input required minLength={2} maxLength={40} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label>Age<input type="number" min={18} max={99} required value={draft.age} onChange={(event) => setDraft({ ...draft, age: Number(event.target.value) })} /></label>
        </div>
        <label>Email address<input type="email" disabled value={draft.email} /></label>
        <label>City<input list="coy-indian-cities" required maxLength={60} value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} /></label>
        <IndianCitySuggestions />
        <label>Gender
          <select value={draft.gender} onChange={(event) => setDraft({
            ...draft,
            gender: event.target.value,
            photo: draft.photo?.startsWith("data:image/") ? draft.photo : profilePhoto(event.target.value),
          })}>
            {GENDER_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <fieldset className="preference-field profile-preferences">
          <legend>Who would you like to meet?</legend>
          <div className="preference-options">
            {DISCOVERY_OPTIONS.map(([value, label]) => (
              <label key={value} className="check-option">
                <input type="checkbox" checked={draft.interestedIn.includes(value)} onChange={() => togglePreference(value)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label>About me<textarea rows={3} maxLength={240} placeholder="What are you into? What makes you, you?" value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} /></label>
        <label>Occupation <span className="optional-label">Optional</span><input maxLength={60} value={draft.occupation} onChange={(event) => setDraft({ ...draft, occupation: event.target.value })} /></label>
        <fieldset className="interest-field">
          <legend>Your interests <span className="optional-label">Choose up to 6</span></legend>
          <p className="interest-help">Pick a few things you love — they make great conversation starters.</p>
          <div className="interest-options">
            {INTEREST_OPTIONS.map((interest) => {
              const selected = (draft.interests ?? []).includes(interest);
              return <button key={interest} type="button" className={`interest-chip ${selected ? "selected" : ""}`} aria-pressed={selected} onClick={() => toggleInterest(interest)}>{selected && <Check size={13} />}{interest}</button>;
            })}
          </div>
          {interestError && <p className="field-note-error" role="alert">{interestError}</p>}
        </fieldset>
        <div className="profile-form-actions">
          {saveError && <span className="profile-save-error" role="alert">{saveError}</span>}
          {saved && <span className="saved-message"><Check size={16} /> Saved</span>}
          <button className="primary-button" type="submit">Save changes</button>
        </div>
      </form>
      <section className="reset-demo-card">
        <div><h2>Your discovery</h2><p>Clear your saved likes and passes to see profiles again. Your confirmed matches and conversations stay saved.</p></div>
        <button className="secondary-button" type="button" disabled={resetting} onClick={onResetFeed}>
          {resetting ? "Resetting…" : "Reset my swipes"}
        </button>
      </section>
    </div>
  );
}

export default function App() {
  const [profile, setProfile] = useState<DemoProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoadError, setAuthLoadError] = useState("");
  const [tab, setTab] = useState<Tab>("home");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<MatchProfile[]>([]);
  const [activeChat, setActiveChat] = useState<MatchProfile | null>(null);
  const [matchSearch, setMatchSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [error, setError] = useState("");
  const [matchesError, setMatchesError] = useState("");
  const [match, setMatch] = useState<{ id: string; user: { id: string; name: string; photo: string } } | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) return;
        if (!response.ok) throw new Error("Could not check your account.");
        const data = await response.json();
        const parsed = clientProfileSchema.safeParse(data.profile);
        if (!parsed.success) throw new Error("The server returned an invalid profile.");
        if (active) setProfile(parsed.data);
      })
      .catch(() => {
        if (active) setAuthLoadError("We couldn’t connect to your account. You can still try signing in.");
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });
    return () => { active = false; };
  }, []);

  const loadFeed = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/feed?limit=50");
      if (!response.ok) throw new Error("Could not load profiles");
      const data = await response.json();
      setProfiles(data.profiles);
    } catch {
      setError("We couldn’t load anyone right now.");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const loadMatches = useCallback(async () => {
    setMatchesLoading(true);
    setMatchesError("");
    try {
      const response = await fetch("/api/matches");
      if (!response.ok) throw new Error("Could not load matches");
      const data = await response.json();
      setMatches(data.matches);
    } catch {
      setMatchesError("Could not load your matches.");
    } finally {
      setMatchesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profile) return;
    void Promise.resolve().then(() => Promise.all([loadFeed(), loadMatches()]));
  }, [loadFeed, loadMatches, profile]);

  async function swipe(action: "LIKE" | "PASS"): Promise<boolean> {
    if (busy || !profiles[0]) return false;
    const current = profiles[0];
    setBusy(true);
    try {
      const response = await fetch("/api/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: current.id, action }),
      });
      if (!response.ok) throw new Error("Swipe could not be saved");
      const data = await response.json();
      setProfiles((existing) => existing.slice(1));
      if (data.matched) setMatch(data.match);
      await loadMatches();
      await loadFeed();
      return true;
    } catch {
      setError("Your swipe wasn’t saved. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function openTab(next: Tab) {
    setTab(next);
    setError("");
    setMatchesError("");
    if (next === "discover") void loadFeed();
    if (next === "matches") void loadMatches();
  }

  function completeSignIn(nextProfile: DemoProfile) {
    setProfile(nextProfile);
    setAuthLoadError("");
    setTab("home");
  }

  async function saveProfile(nextProfile: DemoProfile): Promise<boolean> {
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextProfile),
      });
      if (!response.ok) throw new Error("Could not save your profile");
      const data = await response.json();
      const parsed = clientProfileSchema.safeParse(data.profile);
      if (!parsed.success) throw new Error("The server returned an invalid profile");
      setProfile(parsed.data);
      setError("");
      return true;
    } catch {
      return false;
    }
  }

  async function signOut() {
    try {
      const response = await fetch("/api/auth/sign-out", { method: "POST" });
      if (!response.ok) throw new Error("Could not sign out");
      setProfile(null);
      setProfiles([]);
      setMatches([]);
      setTab("home");
    } catch {
      setError("Could not sign out. Please try again.");
    }
  }

  async function resetFeed() {
    if (!window.confirm("Clear all your saved likes and passes so these profiles can be explored again? Confirmed matches will stay saved.")) return;
    setResetting(true);
    setError("");
    try {
      const response = await fetch("/api/swipes/reset", { method: "POST" });
      if (!response.ok) throw new Error("Could not reset your swipes");
      await loadFeed();
      setTab("discover");
    } catch {
      setError("Could not reset your swipes. Please try again.");
      setTab("discover");
    } finally {
      setResetting(false);
    }
  }

  async function removeMatch(item: MatchProfile) {
    if (!window.confirm(`Remove ${item.name} from your matches? This also deletes your conversation.`)) return;
    setMatchesError("");
    try {
      const response = await fetch(`/api/matches/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not remove match");
      setMatches((current) => current.filter((entry) => entry.id !== item.id));
      if (activeChat?.id === item.id) setActiveChat(null);
    } catch {
      setMatchesError(`Could not remove ${item.name}. Please try again.`);
    }
  }

  if (!authReady) return <main className="auth-loading"><div className="brand-mark"><Heart fill="currentColor" size={20} /> coy</div></main>;
  if (!profile) return <AuthScreen onComplete={completeSignIn} serviceError={authLoadError} />;

  const navigation: { id: Tab; label: string; Icon: typeof House }[] = [
    { id: "home", label: "Home", Icon: House },
    { id: "discover", label: "Discover", Icon: Sparkles },
    { id: "matches", label: "Matches", Icon: Users },
    { id: "profile", label: "Profile", Icon: CircleUserRound },
  ];

  return (
    <main className="app-shell">
      <aside className="desktop-nav">
        <div className="brand-mark"><Heart fill="currentColor" size={21} /> coy</div>
        <nav>
          {navigation.map(({ id, label, Icon }) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => openTab(id)}><Icon /> <span>{label}</span></button>
          ))}
        </nav>
        <div className="nav-profile">
          <div className="nav-avatar">{profile.photo ? <Image src={profile.photo} alt="" width={36} height={36} unoptimized /> : profile.name.slice(0, 1).toUpperCase()}</div>
          <div><strong>{profile.name}</strong><span>{profile.city}</span></div>
          <button onClick={() => openTab("profile")} aria-label="Edit profile"><ArrowRight size={16} /></button>
        </div>
      </aside>

      <section className="content">
        {tab === "home" && <HomePage profile={profile} matchesCount={matches.length} profilesCount={profiles.length} onDiscover={() => openTab("discover")} onProfile={() => openTab("profile")} />}

        {tab === "discover" && (
          <div className="discover-page">
            <header className="discover-header">
              <div><p>Discover</p><h1>Find your person</h1><span className="preference-caption">Showing: {profile.interestedIn.map((value) => DISCOVERY_OPTIONS.find(([key]) => key === value)?.[1]).join(", ")}</span></div>
              <button className="refresh-button" onClick={loadFeed} aria-label="Refresh"><RotateCcw size={18} /></button>
            </header>
            <p className="preference-caption">Demo profiles and their incoming likes are simulated for testing.</p>
            <div className="card-stage">
              {loading ? <LoadingSkeleton /> : error ? (
                <div className="state-card">
                  <X size={28} />
                  <h2>Something went wrong</h2>
                  <p>{error}</p>
                  <button className="primary-button" onClick={loadFeed}>Retry</button>
                </div>
              ) : profiles.length === 0 ? (
                <div className="state-card">
                  <div className="state-icon"><Sparkles /></div>
                  <h2>You&apos;ve seen everyone!</h2>
                  <p>No new profiles match your preferences right now. Update them or check back later.</p>
                  <button className="secondary-button" disabled={resetting} onClick={resetFeed}>
                    {resetting ? "Resetting…" : "Reset my swipes"}
                  </button>
                  <button className="secondary-button" onClick={() => openTab("profile")}>Update preferences</button>
                </div>
              ) : (
                <AnimatePresence>
                  <ProfileCard key={profiles[0].id} profile={profiles[0]} onSwipe={swipe} busy={busy} />
                </AnimatePresence>
              )}
            </div>
          </div>
        )}

        {tab === "matches" && (
          <div className="matches-page">
            <header className="matches-header">
              <div><p>Your connections</p><h1>Matches <span>{matches.length}</span></h1></div>
              {matches.length > 0 && <span className="matches-caption">Good things start with hello.</span>}
            </header>
            {matchesLoading ? (
              <div className="empty-matches"><p>Loading your matches…</p></div>
            ) : matchesError ? (
              <div className="matches-alert" role="alert"><p>{matchesError}</p><button className="secondary-button" onClick={() => void loadMatches()}>Refresh</button></div>
            ) : matches.length === 0 ? (
              <div className="empty-matches">
                <div className="state-icon"><Heart /></div>
                <h2>No matches yet</h2>
                <p>Your next great conversation could be one swipe away. Keep discovering to find your connection.</p>
                <button className="primary-button" onClick={() => openTab("discover")}>Start discovering</button>
              </div>
            ) : (
              <>
                <label className="match-search">
                  <Search size={17} />
                  <input value={matchSearch} onChange={(event) => setMatchSearch(event.target.value)} placeholder="Search your matches" aria-label="Search matches" />
                  {matchSearch && <button type="button" onClick={() => setMatchSearch("")} aria-label="Clear search"><X size={15} /></button>}
                </label>
                {matches.filter((item) => `${item.name} ${item.city}`.toLowerCase().includes(matchSearch.trim().toLowerCase())).length === 0 ? (
                  <div className="empty-matches compact"><h2>No matches found</h2><p>Try a different name or city.</p></div>
                ) : (
                  <div className="matches-grid">
                    {matches.filter((item) => `${item.name} ${item.city}`.toLowerCase().includes(matchSearch.trim().toLowerCase())).map((item) => (
                      <motion.article key={item.id} className="match-card" layout whileHover={{ y: -2 }}>
                        <Image src={item.photo} alt={item.name} width={88} height={88} sizes="88px" />
                        <div className="match-details">
                          <h3>{item.name}, {item.age}</h3>
                          <p><MapPin size={14} /> {item.city}</p>
                          <span className="matched-date">Matched {new Date(item.matchedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                          <div className="match-actions">
                            <button className="chat-action" type="button" onClick={() => setActiveChat(item)}><MessageCircle size={16} /> Chat</button>
                            <button className="remove-action" type="button" onClick={() => void removeMatch(item)} aria-label={`Remove ${item.name} from matches`} title="Remove match"><Trash2 size={16} /><span>Remove</span></button>
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {tab === "profile" && <ProfilePage profile={profile} onSave={saveProfile} onSignOut={signOut} onResetFeed={resetFeed} resetting={resetting} />}
      </section>

      <nav className="mobile-nav">
        {navigation.map(({ id, label, Icon }) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => openTab(id)}><Icon /><span>{label}</span></button>
        ))}
      </nav>

      {match && <MatchModal match={match} demoPhoto={profilePhoto(profile.gender)} onClose={() => setMatch(null)} />}
      <AnimatePresence>{activeChat && <ChatModal key={activeChat.id} match={activeChat} currentUserId={profile.id} onClose={() => setActiveChat(null)} />}</AnimatePresence>
    </main>
  );
}
