import { useState, useEffect, useCallback } from "react";
import { initializePaddle, Paddle } from "@paddle/paddle-js";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Review {
  id: number;
  author: string;
  rating: number;
  text: string;
  source: string;
  date: string;
  sentiment: string;
  replied: boolean;
  reviewId?: string;
}
interface NotificationState {
  msg: string;
  color: string;
}
interface GoogleUser {
  name: string;
  email: string;
  picture: string;
  accessToken: string;
}

// ─── Demo Data ────────────────────────────────────────────────────────────────
const DEMO_REVIEWS: Review[] = [
  {
    id: 1,
    author: "דני כהן",
    rating: 5,
    text: "שירות מעולה! הגעתי אחרי המלצה ולא התאכזבתי. הצוות מקצועי ואדיב.",
    source: "Google",
    date: "לפני יומיים",
    sentiment: "positive",
    replied: false,
  },
  {
    id: 2,
    author: "מיכל לוי",
    rating: 2,
    text: "המתנה ארוכה מדי, לא קיבלתי עדכון על העיכוב. מאכזב.",
    source: "Google",
    date: "לפני 3 ימים",
    sentiment: "negative",
    replied: false,
  },
  {
    id: 3,
    author: "יוסי אברהם",
    rating: 4,
    text: "בסך הכל טוב. האוכל טעים אבל השירות היה קצת איטי.",
    source: "Facebook",
    date: "לפני שבוע",
    sentiment: "neutral",
    replied: true,
  },
  {
    id: 4,
    author: "רונית שפירא",
    rating: 5,
    text: "אחלה מקום! כבר הפכתי ללקוחה קבועה. ממליצה בחום לכולם!",
    source: "Google",
    date: "לפני שבוע",
    sentiment: "positive",
    replied: true,
  },
  {
    id: 5,
    author: "אמיר בן דוד",
    rating: 1,
    text: "חוויה גרועה מאוד. הזמנתי דרך האתר ולא קיבלתי אישור. לא אחזור.",
    source: "Google",
    date: "לפני 10 ימים",
    sentiment: "negative",
    replied: false,
  },
  {
    id: 6,
    author: "נועה גולן",
    rating: 5,
    text: "הפתעה נעימה! האווירה מדהימה והמחירים הוגנים.",
    source: "Facebook",
    date: "לפני 2 שבועות",
    sentiment: "positive",
    replied: false,
  },
];

const AI_RESPONSES: Record<string, string[]> = {
  positive: [
    "תודה רבה על הביקורת החמה! אנו שמחים שנהנית מהביקור ומצפים לראותך שוב בקרוב 😊",
  ],
  negative: [
    "אנו מצטערים על החוויה הפחות טובה. אשמח ליצור איתך קשר אישי לפתרון מיידי.",
  ],
  neutral: ["תודה על הביקורת! נשמח לשמוע כיצד נוכל לשפר את חוויתך בביקור הבא."],
};

const WHATSAPP_TEMPLATE = (businessName: string) =>
  `היי! 😊 תודה שבחרת ב${businessName}. נשמח אם תוכל לשתף את חוויתך – ביקורת קצרה עוזרת לנו מאוד!\n👉 [קישור לביקורת בגוגל]`;

const WEEKLY_DATA = [
  { day: "ראשון", ביקורות: 2, חיוביות: 2, שליליות: 0 },
  { day: "שני", ביקורות: 1, חיוביות: 0, שליליות: 1 },
  { day: "שלישי", ביקורות: 3, חיוביות: 2, שליליות: 1 },
  { day: "רביעי", ביקורות: 0, חיוביות: 0, שליליות: 0 },
  { day: "חמישי", ביקורות: 4, חיוביות: 3, שליליות: 1 },
  { day: "שישי", ביקורות: 2, חיוביות: 2, שליליות: 0 },
  { day: "שבת", ביקורות: 1, חיוביות: 1, שליליות: 0 },
];

const PIE_DATA = [
  { name: "חיוביות", value: 3, color: "#10B981" },
  { name: "שליליות", value: 2, color: "#EF4444" },
  { name: "ניטרליות", value: 1, color: "#94A3B8" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const detectSentiment = (rating: number) =>
  rating >= 4 ? "positive" : rating <= 2 ? "negative" : "neutral";

const formatRelativeDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (diffDays === 0) return "היום";
    if (diffDays === 1) return "אתמול";
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
    return `לפני ${Math.floor(diffDays / 30)} חודשים`;
  } catch {
    return dateString;
  }
};

// ─── PKCE Helpers ─────────────────────────────────────────────────────────────
const generateCodeVerifier = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};
const generateCodeChallenge = async (verifier: string) => {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const StarRating = ({
  rating,
  size = 14,
}: {
  rating: number;
  size?: number;
}) => (
  <span style={{ fontSize: size, letterSpacing: 1 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <span key={i} style={{ color: i <= rating ? "#F59E0B" : "#334155" }}>
        ★
      </span>
    ))}
  </span>
);

const Badge = ({ sentiment }: { sentiment: string }) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    positive: { label: "חיובית", color: "#10B981", bg: "#064E3B" },
    negative: { label: "שלילית", color: "#EF4444", bg: "#450A0A" },
    neutral: { label: "ניטרלית", color: "#94A3B8", bg: "#1E293B" },
  };
  const s = map[sentiment] || map.neutral;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        borderRadius: 20,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {s.label}
    </span>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("landing");
  const [reviews, setReviews] = useState<Review[]>(DEMO_REVIEWS);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [activeReview, setActiveReview] = useState<Review | null>(null);
  const [aiReply, setAiReply] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [filter, setFilter] = useState("all");
  const [whatsappModal, setWhatsappModal] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(
    null
  );
  const [leadForm, setLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    business: "",
  });
  const [leadSent, setLeadSent] = useState(false);
  const [paddle, setPaddle] = useState<Paddle | undefined>();
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({
    businessName: "",
    category: "",
    phone: "",
    whatsapp: "",
    email: "",
  });
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [accountId, setAccountId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [analysisModal, setAnalysisModal] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(1);
  const [analysisForm, setAnalysisForm] = useState({
    company: "",
    industry: "",
    website: "",
    email: "",
    phone: "",
    focus: "",
  });
  const [analysisSubmitted, setAnalysisSubmitted] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Paddle
  useEffect(() => {
    initializePaddle({
      environment: "sandbox",
      token: "test_5e1e7dd49d00da5dae32f3e82a5",
      eventCallback: (data) => {
        if (data.name === "checkout.completed")
          showNotif("התשלום בוצע בהצלחה!", "#10B981");
      },
    }).then((p) => {
      if (p) setPaddle(p);
    });
  }, []);

  const openCheckout = (priceId: string) =>
    paddle?.Checkout.open({ items: [{ priceId, quantity: 1 }] });

  // Google OAuth PKCE
  const handleGoogleLogin = async () => {
    const clientId =
      "505688831322-vdvtbu5cqdb5aimjniaefqneajbp03f1.apps.googleusercontent.com";
    const redirectUri = window.location.origin;
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    sessionStorage.setItem("pkce_verifier", verifier);
    const scope = [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/business.manage",
    ].join(" ");
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${encodeURIComponent(
      scope
    )}&code_challenge=${challenge}&code_challenge_method=S256&access_type=offline&prompt=consent`;
    window.location.href = authUrl;
  };

  // Handle OAuth redirect (PKCE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;
    window.history.replaceState({}, document.title, window.location.pathname);
    const verifier = sessionStorage.getItem("pkce_verifier");
    if (!verifier) return;
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID!;
    fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        redirect_uri: window.location.origin,
        grant_type: "authorization_code",
        code_verifier: verifier,
      }),
    })
      .then((r) => r.json())
      .then(async (tokens) => {
        sessionStorage.removeItem("pkce_verifier");
        if (!tokens.access_token) {
          showNotif("שגיאה בהתחברות", "#EF4444");
          return;
        }
        if (tokens.refresh_token)
          localStorage.setItem("google_refresh_token", tokens.refresh_token);
        localStorage.setItem("google_access_token", tokens.access_token);
        localStorage.setItem(
          "google_token_expiry",
          String(Date.now() + (tokens.expires_in - 60) * 1000)
        );
        const info = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          { headers: { Authorization: `Bearer ${tokens.access_token}` } }
        ).then((r) => r.json());
        setGoogleUser({
          name: info.name,
          email: info.email,
          picture: info.picture,
          accessToken: tokens.access_token,
        });
        setIsDemoMode(false);
        setPage("onboarding");
        fetchBusinessAccounts(tokens.access_token);
      })
      .catch(() => showNotif("שגיאה בהתחברות לגוגל", "#EF4444"));
  }, []);

  const getValidToken = async (): Promise<string | null> => {
    const expiry = Number(localStorage.getItem("google_token_expiry") || 0);
    const accessToken = localStorage.getItem("google_access_token");
    if (accessToken && Date.now() < expiry) return accessToken;
    const refreshToken = localStorage.getItem("google_refresh_token");
    if (!refreshToken) return null;
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID!,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });
      const tokens = await res.json();
      if (!tokens.access_token) return null;
      localStorage.setItem("google_access_token", tokens.access_token);
      localStorage.setItem(
        "google_token_expiry",
        String(Date.now() + (tokens.expires_in - 60) * 1000)
      );
      setGoogleUser((prev) =>
        prev ? { ...prev, accessToken: tokens.access_token } : null
      );
      return tokens.access_token;
    } catch {
      return null;
    }
  };

  const fetchBusinessAccounts = async (token: string) => {
    const cached = sessionStorage.getItem("gbp_location");
    if (cached) {
      setLocationId(cached);
      return;
    }
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const res = await fetch(
        "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 429) {
        showNotif("⏳ Google API עמוס — נסה שוב בעוד דקה", "#F59E0B");
        return;
      }
      const data = await res.json();
      const accounts = data.accounts || [];
      if (accounts.length > 0) {
        const aid = accounts[0].name;
        setAccountId(aid);
        await fetchLocations(token, aid);
      } else showNotif("לא נמצאו עסקים מחוברים לחשבון זה", "#F59E0B");
    } catch {
      showNotif("לא ניתן לטעון חשבונות עסקיים", "#EF4444");
    }
  };

  const fetchLocations = async (token: string, aid: string) => {
    try {
      const res = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${aid}/locations`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 429) {
        showNotif("⏳ Google API עמוס", "#F59E0B");
        return;
      }
      const data = await res.json();
      const locations = data.locations || [];
      if (locations.length > 0) {
        const lid = locations[0].name;
        setLocationId(lid);
        sessionStorage.setItem("gbp_location", lid);
      } else showNotif("לא נמצאו מיקומים לעסק", "#F59E0B");
    } catch {
      showNotif("לא ניתן לטעון מיקומים", "#EF4444");
    }
  };

  const fetchRealReviews = useCallback(async () => {
    if (!googleUser || !locationId) return;
    setLoadingReviews(true);
    try {
      const token = await getValidToken();
      if (!token) {
        showNotif("נא להתחבר מחדש", "#EF4444");
        setLoadingReviews(false);
        return;
      }
      const res = await fetch(
        `https://mybusiness.googleapis.com/v4/${locationId}/reviews`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      const rawReviews = data.reviews || [];
      if (rawReviews.length === 0) {
        setReviews([]);
        showNotif("אין ביקורות עדיין", "#F59E0B");
        setLoadingReviews(false);
        return;
      }
      const ratingMap: Record<string, number> = {
        ONE: 1,
        TWO: 2,
        THREE: 3,
        FOUR: 4,
        FIVE: 5,
      };
      const mapped: Review[] = rawReviews.map((r: any, i: number) => {
        const rating = ratingMap[r.starRating] || 3;
        return {
          id: i + 1,
          reviewId: r.reviewId,
          author: r.reviewer?.displayName || "אנונימי",
          rating,
          text: r.comment || "(ללא טקסט)",
          source: "Google",
          date: formatRelativeDate(r.createTime),
          sentiment: detectSentiment(rating),
          replied: !!r.reviewReply,
        };
      });
      setReviews(mapped);
      showNotif(`✅ נטענו ${mapped.length} ביקורות אמיתיות!`, "#10B981");
    } catch {
      showNotif("שגיאה בטעינת ביקורות", "#EF4444");
    }
    setLoadingReviews(false);
  }, [googleUser, locationId]);

  useEffect(() => {
    if (locationId && googleUser && !isDemoMode) fetchRealReviews();
  }, [locationId, googleUser, isDemoMode, fetchRealReviews]);

  const submitLead = async (e: React.MouseEvent) => {
    e.preventDefault();
    await fetch("https://formspree.io/f/mpqyqoed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(leadForm),
    });
    setLeadSent(true);
  };

  const submitAnalysis = async (e: React.MouseEvent) => {
    e.preventDefault();
    await fetch("https://formspree.io/f/mpqyqoed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...analysisForm, type: "analysis_request" }),
    });
    setAnalysisSubmitted(true);
  };

  const avgRating = reviews.length
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";
  const positive = reviews.filter((r) => r.sentiment === "positive").length;
  const negative = reviews.filter((r) => r.sentiment === "negative").length;
  const unreplied = reviews.filter((r) => !r.replied).length;
  const filtered =
    filter === "all" ? reviews : reviews.filter((r) => r.sentiment === filter);

  const showNotif = (msg: string, color = "#10B981") => {
    setNotification({ msg, color });
    setTimeout(() => setNotification(null), 3000);
  };

  const getAIReply = async (review: Review) => {
    setActiveReview(review);
    setAiReply("");
    setReplyText("");
    setLoadingAI(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.REACT_APP_ANTHROPIC_KEY as string,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `אתה עוזר לבעל עסק להשיב על ביקורת בצורה מקצועית ואישית. כתוב תשובה קצרה (2-3 משפטים) בעברית.\n\nביקורת: "${review.text}"\nדירוג: ${review.rating}/5\n\nכתוב רק את התשובה.`,
            },
          ],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || AI_RESPONSES[review.sentiment][0];
      setAiReply(text);
      setReplyText(text);
    } catch {
      const fallback = AI_RESPONSES[review.sentiment][0];
      setAiReply(fallback);
      setReplyText(fallback);
    }
    setLoadingAI(false);
  };

  const submitReply = () => {
    if (!activeReview) return;
    setReviews(
      reviews.map((r) =>
        r.id === activeReview.id ? { ...r, replied: true } : r
      )
    );
    setActiveReview(null);
    showNotif("✅ תגובה נשלחה בהצלחה!");
  };

  const sendWhatsapp = () => {
    setSendSuccess(true);
    setTimeout(() => {
      setSendSuccess(false);
      setWhatsappModal(false);
      showNotif("📱 בקשת ביקורת נשלחה ל-5 לקוחות!");
    }, 1500);
  };

  // ─── Color System ──────────────────────────────────────────────────────────
  const colors = {
    bg: "#020817",
    card: "#0F172A",
    border: "#1E293B",
    text: "#F1F5F9",
    sub: "#94A3B8",
    accent: "#6366F1",
    accent2: "#8B5CF6",
  };

  const s: Record<string, React.CSSProperties> = {
    app: {
      minHeight: "100vh",
      background: colors.bg,
      color: colors.text,
      fontFamily: "'Heebo', sans-serif",
      direction: "rtl",
    },
    nav: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 32px",
      borderBottom: `1px solid ${colors.border}`,
      background: "rgba(2,8,23,0.9)",
      backdropFilter: "blur(12px)",
      position: "sticky",
      top: 0,
      zIndex: 100,
    },
    logo: {
      fontSize: 20,
      fontWeight: 800,
      background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
    btn: {
      background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
      border: "none",
      color: "#fff",
      borderRadius: 10,
      padding: "10px 20px",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 14,
      fontFamily: "'Heebo', sans-serif",
    },
    btnGhost: {
      background: "transparent",
      border: `1px solid ${colors.border}`,
      color: colors.text,
      borderRadius: 10,
      padding: "10px 20px",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 14,
      fontFamily: "'Heebo', sans-serif",
    },
    card: {
      background: colors.card,
      border: `1px solid ${colors.border}`,
      borderRadius: 16,
      padding: 24,
    },
    statCard: {
      background: colors.card,
      border: `1px solid ${colors.border}`,
      borderRadius: 16,
      padding: 20,
      textAlign: "center",
    },
  };

  const GoogleLoginButton = () => (
    <button
      style={{ ...s.btn, display: "flex", alignItems: "center", gap: 8 }}
      onClick={handleGoogleLogin}
    >
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path
          fill="#fff"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#fff"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#fff"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#fff"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      התחבר עם Google
    </button>
  );

  // ── Stats Page ──
  if (page === "stats")
    return (
      <div style={s.app}>
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <nav style={s.nav}>
          <div style={s.logo}>⭐ ReputeAI</div>
          <button style={s.btnGhost} onClick={() => setPage("dashboard")}>
            ← חזור לדשבורד
          </button>
        </nav>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 32 }}>
            📊 סטטיסטיקות
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
              marginBottom: 32,
            }}
          >
            {[
              { label: "ציון NPS", value: "72", icon: "🎯", color: "#6366F1" },
              {
                label: "שיעור תגובה",
                value: "60%",
                icon: "💬",
                color: "#10B981",
              },
              {
                label: "זמן תגובה ממוצע",
                value: "2.4h",
                icon: "⚡",
                color: "#F59E0B",
              },
              {
                label: "ביקורות השבוע",
                value: "13",
                icon: "📈",
                color: "#8B5CF6",
              },
            ].map((k) => (
              <div key={k.label} style={s.statCard}>
                <div style={{ fontSize: 28 }}>{k.icon}</div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 900,
                    color: k.color,
                    margin: "8px 0 4px",
                  }}
                >
                  {k.value}
                </div>
                <div style={{ color: "#94A3B8", fontSize: 13 }}>{k.label}</div>
              </div>
            ))}
          </div>
          <div style={{ ...s.card, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
              ביקורות לאורך השבוע
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={WEEKLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "#0F172A",
                    border: "1px solid #1E293B",
                    borderRadius: 8,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="ביקורות"
                  stroke="#6366F1"
                  strokeWidth={2}
                  dot={{ fill: "#6366F1" }}
                />
                <Line
                  type="monotone"
                  dataKey="חיוביות"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: "#10B981" }}
                />
                <Line
                  type="monotone"
                  dataKey="שליליות"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={{ fill: "#EF4444" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}
          >
            <div style={s.card}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
                התפלגות סנטימנט
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={PIE_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {PIE_DATA.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#0F172A",
                      border: "1px solid #1E293B",
                      borderRadius: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={s.card}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
                תובנות AI 🤖
              </div>
              {[
                {
                  icon: "🔴",
                  text: "3 ביקורות מזכירות 'המתנה ארוכה' - בעיה חוזרת!",
                },
                {
                  icon: "🟢",
                  text: "האווירה והמחירים מקבלים ציונים גבוהים עקביים",
                },
                { icon: "🟡", text: "שיעור התגובה ירד ב-15% לעומת שבוע שעבר" },
                { icon: "💡", text: "מומלץ לשלוח בקשות ביקורת ביום חמישי" },
              ].map((insight, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 12,
                    marginBottom: 14,
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{insight.icon}</span>
                  <span
                    style={{ color: "#94A3B8", fontSize: 14, lineHeight: 1.5 }}
                  >
                    {insight.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );

  // ── Onboarding Page ──
  if (page === "onboarding")
    return (
      <div style={s.app}>
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <nav style={s.nav}>
          <div style={s.logo}>⭐ ReputeAI</div>
          <div style={{ color: colors.sub, fontSize: 14 }}>
            {googleUser ? `שלום, ${googleUser.name} 👋` : "הגדרת חשבון"}
          </div>
        </nav>
        <div style={{ maxWidth: 560, margin: "60px auto", padding: "0 24px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 40 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 4,
                  background:
                    i <= onboardingStep ? colors.accent : colors.border,
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>
          {onboardingStep === 1 && (
            <div style={s.card}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏢</div>
              <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>
                פרטי העסק שלך
              </div>
              <div
                style={{ color: colors.sub, fontSize: 14, marginBottom: 24 }}
              >
                נתאים את המערכת לעסק שלך
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {[
                  { placeholder: "שם העסק", key: "businessName" },
                  { placeholder: "טלפון", key: "phone" },
                ].map(({ placeholder, key }) => (
                  <input
                    key={key}
                    placeholder={placeholder}
                    value={(onboardingData as any)[key]}
                    onChange={(e) =>
                      setOnboardingData({
                        ...onboardingData,
                        [key]: e.target.value,
                      })
                    }
                    style={{
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 10,
                      padding: "12px 16px",
                      color: colors.text,
                      fontSize: 15,
                      fontFamily: "'Heebo', sans-serif",
                      direction: "rtl",
                    }}
                  />
                ))}
                <select
                  value={onboardingData.category}
                  onChange={(e) =>
                    setOnboardingData({
                      ...onboardingData,
                      category: e.target.value,
                    })
                  }
                  style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10,
                    padding: "12px 16px",
                    color: colors.text,
                    fontSize: 15,
                    fontFamily: "'Heebo', sans-serif",
                    direction: "rtl",
                  }}
                >
                  <option value="">קטגוריית העסק</option>
                  <option value="restaurant">מסעדה / קפה</option>
                  <option value="beauty">יופי וספא</option>
                  <option value="health">רפואה ובריאות</option>
                  <option value="retail">חנות קמעונאית</option>
                  <option value="service">שירותים מקצועיים</option>
                  <option value="other">אחר</option>
                </select>
              </div>
              <button
                style={{
                  ...s.btn,
                  width: "100%",
                  marginTop: 24,
                  padding: "14px",
                  fontSize: 16,
                }}
                onClick={() =>
                  onboardingData.businessName &&
                  onboardingData.category &&
                  setOnboardingStep(2)
                }
              >
                המשך ←
              </button>
            </div>
          )}
          {onboardingStep === 2 && (
            <div style={s.card}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔗</div>
              <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>
                חיבור Google Business
              </div>
              {googleUser ? (
                <>
                  <div
                    style={{
                      background: "rgba(16,185,129,0.1)",
                      border: "1px solid rgba(16,185,129,0.3)",
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 20,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <img
                      src={googleUser.picture}
                      alt=""
                      style={{ width: 40, height: 40, borderRadius: "50%" }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: "#10B981" }}>
                        ✅ מחובר ל-Google
                      </div>
                      <div style={{ fontSize: 13, color: colors.sub }}>
                        {googleUser.email}
                      </div>
                    </div>
                  </div>
                  {locationId ? (
                    <div
                      style={{
                        color: "#10B981",
                        fontSize: 14,
                        marginBottom: 16,
                      }}
                    >
                      ✅ עסק נמצא ומחובר!
                    </div>
                  ) : (
                    <div
                      style={{
                        color: colors.sub,
                        fontSize: 14,
                        marginBottom: 16,
                      }}
                    >
                      🔄 מחפש עסקים מחוברים...
                    </div>
                  )}
                  <button
                    style={{
                      ...s.btn,
                      width: "100%",
                      padding: "14px",
                      fontSize: 15,
                    }}
                    onClick={() => setOnboardingStep(3)}
                  >
                    המשך ←
                  </button>
                </>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div
                    style={{ color: colors.sub, fontSize: 14, marginBottom: 8 }}
                  >
                    כדי לקבל ביקורות אמיתיות נצטרך גישה לפרופיל שלך
                  </div>
                  <GoogleLoginButton />
                  <button
                    style={{ ...s.btnGhost, padding: "14px", fontSize: 15 }}
                    onClick={() => setOnboardingStep(3)}
                  >
                    דלג - אחבר מאוחר יותר
                  </button>
                </div>
              )}
            </div>
          )}
          {onboardingStep === 3 && (
            <div style={s.card}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
              <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>
                הגדרת התראות
              </div>
              <div
                style={{ color: colors.sub, fontSize: 14, marginBottom: 24 }}
              >
                איך תרצה לקבל התראות על ביקורות חדשות?
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {[
                  { placeholder: "אימייל להתראות", key: "email" },
                  {
                    placeholder: "WhatsApp להתראות (אופציונלי)",
                    key: "whatsapp",
                  },
                ].map(({ placeholder, key }) => (
                  <input
                    key={key}
                    placeholder={placeholder}
                    value={(onboardingData as any)[key]}
                    onChange={(e) =>
                      setOnboardingData({
                        ...onboardingData,
                        [key]: e.target.value,
                      })
                    }
                    style={{
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 10,
                      padding: "12px 16px",
                      color: colors.text,
                      fontSize: 15,
                      fontFamily: "'Heebo', sans-serif",
                      direction: "rtl",
                    }}
                  />
                ))}
              </div>
              <button
                style={{
                  ...s.btn,
                  width: "100%",
                  marginTop: 24,
                  padding: "14px",
                  fontSize: 16,
                }}
                onClick={() => setPage("dashboard")}
              >
                סיים והתחל 🚀
              </button>
            </div>
          )}
        </div>
      </div>
    );

  // ── Landing Page ──
  if (page === "landing")
    return (
      <div style={{ ...s.app, overflowX: "hidden" }}>
        <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .fade-up { animation: fadeUp 0.7s ease forwards; }
        .fade-up-1 { animation: fadeUp 0.7s 0.1s ease both; }
        .fade-up-2 { animation: fadeUp 0.7s 0.2s ease both; }
        .fade-up-3 { animation: fadeUp 0.7s 0.3s ease both; }
        .fade-up-4 { animation: fadeUp 0.7s 0.4s ease both; }
        .feature-card:hover { transform: translateY(-4px); border-color: #6366F1 !important; transition: all 0.3s ease; }
        .feature-card { transition: all 0.3s ease; }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 20px 40px rgba(99,102,241,0.4); }
        .cta-btn { transition: all 0.25s ease; }
        .plan-card:hover { transform: translateY(-6px); }
        .plan-card { transition: transform 0.3s ease; }
        .nav-link:hover { color: #A5B4FC; }
        .nav-link { transition: color 0.2s; color: #94A3B8; text-decoration: none; font-size: 14px; font-weight: 600; }
        .input-field { background: #0a0f1e; border: 1px solid #1E293B; border-radius: 10px; padding: 12px 16px; color: #F1F5F9; font-size: 15px; font-family: 'Heebo', sans-serif; direction: rtl; width: 100%; box-sizing: border-box; outline: none; transition: border-color 0.2s; }
        .input-field:focus { border-color: #6366F1; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px; backdrop-filter: blur(8px); }
      `}</style>
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />

        {/* Notification */}
        {notification && (
          <div
            style={{
              position: "fixed",
              top: 20,
              left: "50%",
              transform: "translateX(-50%)",
              background: notification.color,
              color: "#fff",
              borderRadius: 12,
              padding: "12px 24px",
              fontWeight: 700,
              zIndex: 9999,
              fontSize: 15,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            {notification.msg}
          </div>
        )}

        {/* Nav */}
        <nav
          style={{
            ...s.nav,
            background: scrollY > 50 ? "rgba(2,8,23,0.97)" : "transparent",
            borderBottom:
              scrollY > 50
                ? `1px solid ${colors.border}`
                : "1px solid transparent",
            transition: "all 0.3s",
          }}
        >
          <div style={s.logo}>⭐ ReputeAI</div>
          <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
            <a href="#features" className="nav-link">
              תכונות
            </a>
            <a href="#how" className="nav-link">
              איך זה עובד
            </a>
            <a href="#pricing" className="nav-link">
              מחירים
            </a>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              style={s.btnGhost}
              onClick={() => {
                setIsDemoMode(true);
                setReviews(DEMO_REVIEWS);
                setPage("dashboard");
              }}
            >
              כניסה לדמו
            </button>
            <GoogleLoginButton />
          </div>
        </nav>

        {/* Hero */}
        <div
          style={{
            position: "relative",
            textAlign: "center",
            padding: "120px 24px 100px",
            maxWidth: 860,
            margin: "0 auto",
            overflow: "hidden",
          }}
        >
          {/* Background orbs */}
          <div
            style={{
              position: "absolute",
              top: "20%",
              left: "10%",
              width: 400,
              height: 400,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
              animation: "pulse 4s ease infinite",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "30%",
              right: "10%",
              width: 300,
              height: 300,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
              animation: "pulse 6s ease infinite",
              pointerEvents: "none",
            }}
          />

          <div
            className="fade-up-1"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: 100,
              padding: "6px 16px",
              fontSize: 13,
              color: "#A5B4FC",
              marginBottom: 28,
              fontWeight: 600,
            }}
          >
            ✨ מנהל הביקורות החכם ביותר לעסקים ישראליים
          </div>

          <h1
            className="fade-up-2"
            style={{
              fontSize: "clamp(36px, 6vw, 68px)",
              fontWeight: 900,
              lineHeight: 1.1,
              margin: "0 0 28px",
              letterSpacing: "-1px",
            }}
          >
            הביקורות של העסק שלך
            <br />
            <span
              style={{
                background:
                  "linear-gradient(135deg, #6366F1, #A78BFA, #EC4899)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundSize: "200% auto",
                animation: "shimmer 4s linear infinite",
              }}
            >
              מנוהלות על ידי AI
            </span>
          </h1>

          <p
            className="fade-up-3"
            style={{
              color: colors.sub,
              fontSize: 19,
              lineHeight: 1.7,
              marginBottom: 48,
              maxWidth: 600,
              margin: "0 auto 48px",
            }}
          >
            ריכוז ביקורות מ-Google, תגובות אוטומטיות חכמות, ושליחת בקשות ביקורת
            ללקוחות — הכל בדשבורד אחד עם AI.
          </p>

          <div
            className="fade-up-4"
            style={{
              display: "flex",
              gap: 14,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              className="cta-btn"
              style={{
                ...s.btn,
                padding: "16px 36px",
                fontSize: 16,
                borderRadius: 12,
              }}
              onClick={() => setAnalysisModal(true)}
            >
              🔍 נתח את הביקורות שלך — חינם
            </button>
            <button
              style={{
                ...s.btnGhost,
                padding: "16px 36px",
                fontSize: 16,
                borderRadius: 12,
              }}
              onClick={() => {
                setIsDemoMode(true);
                setReviews(DEMO_REVIEWS);
                setPage("dashboard");
              }}
            >
              ראה דמו חי ←
            </button>
          </div>

          {/* Social proof */}
          <div
            className="fade-up"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 40,
              marginTop: 64,
              flexWrap: "wrap",
            }}
          >
            {[
              ["3×", "יותר לקוחות עם 4.7+ כוכבים"],
              ["70%", "מהביקורות נשארות ללא מענה"],
              ["2 דק'", "זמן תגובה ממוצע עם AI"],
            ].map(([n, l]) => (
              <div key={n} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 38,
                    fontWeight: 900,
                    background: "linear-gradient(135deg, #6366F1, #A78BFA)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {n}
                </div>
                <div style={{ color: colors.sub, fontSize: 13, marginTop: 4 }}>
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div
          id="how"
          style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px" }}
        >
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div
              style={{
                color: "#A5B4FC",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 2,
                marginBottom: 12,
                textTransform: "uppercase",
              }}
            >
              תהליך פשוט
            </div>
            <h2 style={{ fontSize: 38, fontWeight: 900, marginBottom: 16 }}>
              מתחילים תוך דקות
            </h2>
            <p style={{ color: colors.sub, fontSize: 16 }}>
              שלושה צעדים פשוטים לניהול ביקורות מקצועי
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 32,
              position: "relative",
            }}
          >
            {[
              {
                num: "01",
                icon: "🔗",
                title: "חבר את העסק",
                desc: "התחבר עם חשבון Google שלך וקבל גישה לכל הביקורות שלך תוך שניות.",
              },
              {
                num: "02",
                icon: "🤖",
                title: "AI סורק ומנתח",
                desc: "המערכת מנתחת כל ביקורת, מזהה רגשות ויוצרת תגובות מקצועיות אוטומטית.",
              },
              {
                num: "03",
                icon: "📈",
                title: "עקוב ושפר",
                desc: "קבל תובנות, התראות בזמן אמת, ושלח בקשות ביקורת ללקוחות מרוצים.",
              },
            ].map((step, i) => (
              <div
                key={i}
                style={{ textAlign: "center", position: "relative" }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))",
                    border: "1px solid rgba(99,102,241,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                    fontSize: 28,
                  }}
                >
                  {step.icon}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#6366F1",
                    letterSpacing: 2,
                    marginBottom: 8,
                  }}
                >
                  {step.num}
                </div>
                <div
                  style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}
                >
                  {step.title}
                </div>
                <div
                  style={{ color: colors.sub, fontSize: 14, lineHeight: 1.7 }}
                >
                  {step.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div
          id="features"
          style={{ maxWidth: 1060, margin: "0 auto", padding: "0 24px 80px" }}
        >
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div
              style={{
                color: "#A5B4FC",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 2,
                marginBottom: 12,
                textTransform: "uppercase",
              }}
            >
              תכונות
            </div>
            <h2 style={{ fontSize: 38, fontWeight: 900, marginBottom: 16 }}>
              כל מה שצריך לניהול ביקורות
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            {[
              {
                icon: "🔔",
                title: "התראות מיידיות",
                desc: "קבל התראה ברגע שנכנסת ביקורת חדשה — לא תפספס שום ביקורת שלילית.",
              },
              {
                icon: "🤖",
                title: "תגובות עם AI",
                desc: "Claude AI מנתח כל ביקורת ומציע תגובה מקצועית ואישית בתוך שניות.",
              },
              {
                icon: "📱",
                title: "בקשות WhatsApp",
                desc: "שלח ללקוחות מרוצים בקשה אוטומטית לכתיבת ביקורת ב-Google.",
              },
              {
                icon: "📊",
                title: "ניתוח סנטימנט",
                desc: "זהה דפוסים חוזרים, תלונות נפוצות, ומגמות בביקורות לאורך זמן.",
              },
              {
                icon: "🎯",
                title: "פילטר חכם",
                desc: "לקוחות לא מרוצים מועברים לטופס פנימי — לא ל-Google.",
              },
              {
                icon: "📈",
                title: "דוחות מתקדמים",
                desc: "ראה NPS, שיעור תגובה, ודירוג ממוצע עם גרפים ברורים.",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="feature-card"
                style={{ ...s.card, cursor: "default" }}
              >
                <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
                <div
                  style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}
                >
                  {f.title}
                </div>
                <div
                  style={{ color: colors.sub, fontSize: 14, lineHeight: 1.6 }}
                >
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div
          style={{ maxWidth: 900, margin: "0 auto 80px", padding: "0 24px" }}
        >
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))",
              border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: 24,
              padding: "60px 40px",
              textAlign: "center",
            }}
          >
            <h2 style={{ fontSize: 36, fontWeight: 900, marginBottom: 16 }}>
              מוכן לשלוט בביקורות שלך?
            </h2>
            <p style={{ color: colors.sub, fontSize: 16, marginBottom: 32 }}>
              הצטרף לעסקים שכבר מנהלים את הנוכחות שלהם בעידן ה-AI
            </p>
            <button
              className="cta-btn"
              style={{
                ...s.btn,
                padding: "16px 40px",
                fontSize: 16,
                borderRadius: 12,
              }}
              onClick={() => setAnalysisModal(true)}
            >
              התחל ניתוח חינמי ←
            </button>
          </div>
        </div>

        {/* Pricing */}
        <div
          id="pricing"
          style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 80px" }}
        >
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div
              style={{
                color: "#A5B4FC",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 2,
                marginBottom: 12,
                textTransform: "uppercase",
              }}
            >
              מחירים
            </div>
            <h2 style={{ fontSize: 38, fontWeight: 900, marginBottom: 16 }}>
              מחירים פשוטים ושקופים
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 24,
            }}
          >
            {[
              {
                name: "Starter",
                price: "149",
                color: "#6366F1",
                priceId: "pri_01kka96tjh65e75g3etn2vqchv",
                features: [
                  "ריכוז ביקורות Google",
                  "התראות מיידיות",
                  "דאשבורד בסיסי",
                  "עד 50 ביקורות",
                ],
              },
              {
                name: "Growth",
                price: "399",
                color: "#8B5CF6",
                popular: true,
                priceId: "pri_01kka97ym1w3665awaf9atd196",
                features: [
                  "הכל ב-Starter",
                  "AI תגובות אוטומטיות",
                  "WhatsApp בקשות",
                  "ניתוח סנטימנט",
                ],
              },
              {
                name: "Premium",
                price: "999",
                color: "#A78BFA",
                priceId: "pri_01kka99rjvbb1wbmhdjzy6ccz5",
                features: [
                  "הכל ב-Growth",
                  "ניטור מתחרים",
                  "דוחות מתקדמים",
                  "ניהול מלא Done For You",
                ],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className="plan-card"
                style={{
                  ...s.card,
                  border: (plan as any).popular
                    ? `2px solid ${plan.color}`
                    : `1px solid ${colors.border}`,
                  position: "relative",
                }}
              >
                {(plan as any).popular && (
                  <div
                    style={{
                      position: "absolute",
                      top: -14,
                      right: 20,
                      background: `linear-gradient(135deg, ${plan.color}, #A78BFA)`,
                      borderRadius: 20,
                      padding: "4px 14px",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    🔥 הכי פופולרי
                  </div>
                )}
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
                  {plan.name}
                </div>
                <div
                  style={{
                    fontSize: 40,
                    fontWeight: 900,
                    color: plan.color,
                    marginBottom: 4,
                  }}
                >
                  ₪{plan.price}
                  <span style={{ fontSize: 14, color: colors.sub }}>/חודש</span>
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "16px 0 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {plan.features.map((f) => (
                    <li key={f} style={{ color: colors.sub, fontSize: 14 }}>
                      ✓ {f}
                    </li>
                  ))}
                </ul>
                <button
                  style={{
                    ...s.btn,
                    width: "100%",
                    background: `linear-gradient(135deg, ${plan.color}, ${plan.color}99)`,
                    padding: "12px",
                  }}
                  onClick={() => openCheckout(plan.priceId)}
                >
                  בחר תוכנית
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Lead bar */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "rgba(15,23,42,0.97)",
            borderTop: `1px solid ${colors.border}`,
            padding: "14px 24px",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
            backdropFilter: "blur(12px)",
          }}
        >
          {leadSent ? (
            <div style={{ color: "#10B981", fontWeight: 700, fontSize: 16 }}>
              ✅ תודה! ניצור איתך קשר בקרוב
            </div>
          ) : (
            <>
              <span
                style={{ color: colors.text, fontWeight: 700, fontSize: 15 }}
              >
                🎯 קבל דמו חינמי:
              </span>
              {[
                { ph: "שם", key: "name", w: 120 },
                { ph: "טלפון", key: "phone", w: 130 },
                { ph: "אימייל", key: "email", w: 160 },
              ].map(({ ph, key, w }) => (
                <input
                  key={key}
                  placeholder={ph}
                  value={(leadForm as any)[key]}
                  onChange={(e) =>
                    setLeadForm({ ...leadForm, [key]: e.target.value })
                  }
                  style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    padding: "10px 14px",
                    color: colors.text,
                    fontSize: 14,
                    fontFamily: "'Heebo', sans-serif",
                    direction: "rtl",
                    width: w,
                    outline: "none",
                  }}
                />
              ))}
              <button
                style={{ ...s.btn, padding: "10px 24px" }}
                onClick={submitLead}
              >
                שלח ←
              </button>
            </>
          )}
        </div>

        <div
          style={{
            textAlign: "center",
            padding: "0 24px 80px",
            color: colors.sub,
            fontSize: 13,
          }}
        >
          © 2025 ReputeAI · כל הזכויות שמורות
        </div>

        {/* Analysis Modal */}
        {analysisModal && (
          <div
            className="modal-overlay"
            onClick={(e) =>
              e.target === e.currentTarget && setAnalysisModal(false)
            }
          >
            <div
              style={{
                ...s.card,
                maxWidth: 520,
                width: "100%",
                maxHeight: "90vh",
                overflow: "auto",
                position: "relative",
              }}
            >
              <button
                onClick={() => setAnalysisModal(false)}
                style={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  background: "transparent",
                  border: "none",
                  color: colors.sub,
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>

              {analysisSubmitted ? (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
                  <h3
                    style={{ fontSize: 24, fontWeight: 900, marginBottom: 12 }}
                  >
                    הניתוח התחיל!
                  </h3>
                  <p
                    style={{ color: colors.sub, fontSize: 15, lineHeight: 1.7 }}
                  >
                    אנחנו מנתחים את הביקורות של העסק שלך. תקבל דוח מפורט תוך 24
                    שעות לאימייל.
                  </p>
                  <button
                    style={{ ...s.btn, marginTop: 24, padding: "12px 32px" }}
                    onClick={() => {
                      setAnalysisModal(false);
                      setAnalysisSubmitted(false);
                    }}
                  >
                    סגור
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 24 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#A5B4FC",
                        fontWeight: 700,
                        marginBottom: 8,
                      }}
                    >
                      ניתוח חינמי
                    </div>
                    <h3
                      style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}
                    >
                      התחל ניתוח ביקורות חינמי
                    </h3>
                    <p style={{ color: colors.sub, fontSize: 14 }}>
                      נבדוק כיצד הביקורות שלך נראות ומה אפשר לשפר — ללא עלות,
                      ללא כרטיס אשראי.
                    </p>
                  </div>

                  {analysisStep === 1 && (
                    <div>
                      <div
                        style={{ display: "flex", gap: 8, marginBottom: 20 }}
                      >
                        {[1, 2].map((i) => (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              height: 3,
                              borderRadius: 3,
                              background:
                                i <= analysisStep ? "#6366F1" : colors.border,
                            }}
                          />
                        ))}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                        }}
                      >
                        <GoogleLoginButton />
                        <div
                          style={{
                            textAlign: "center",
                            color: colors.sub,
                            fontSize: 13,
                          }}
                        >
                          — או מלא ידנית —
                        </div>
                        <input
                          className="input-field"
                          placeholder="שם החברה *"
                          value={analysisForm.company}
                          onChange={(e) =>
                            setAnalysisForm({
                              ...analysisForm,
                              company: e.target.value,
                            })
                          }
                        />
                        <select
                          className="input-field"
                          value={analysisForm.industry}
                          onChange={(e) =>
                            setAnalysisForm({
                              ...analysisForm,
                              industry: e.target.value,
                            })
                          }
                        >
                          <option value="">תחום עיסוק *</option>
                          <option>מסעדה / קפה</option>
                          <option>יופי וספא</option>
                          <option>רפואה ובריאות</option>
                          <option>חנות קמעונאית</option>
                          <option>שירותים מקצועיים</option>
                          <option>אחר</option>
                        </select>
                        <input
                          className="input-field"
                          placeholder="כתובת אתר (אופציונלי)"
                          value={analysisForm.website}
                          onChange={(e) =>
                            setAnalysisForm({
                              ...analysisForm,
                              website: e.target.value,
                            })
                          }
                        />
                      </div>
                      <button
                        style={{
                          ...s.btn,
                          width: "100%",
                          marginTop: 20,
                          padding: "13px",
                        }}
                        onClick={() =>
                          analysisForm.company &&
                          analysisForm.industry &&
                          setAnalysisStep(2)
                        }
                      >
                        המשך ←
                      </button>
                    </div>
                  )}

                  {analysisStep === 2 && (
                    <div>
                      <div
                        style={{ display: "flex", gap: 8, marginBottom: 20 }}
                      >
                        {[1, 2].map((i) => (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              height: 3,
                              borderRadius: 3,
                              background:
                                i <= analysisStep ? "#6366F1" : colors.border,
                            }}
                          />
                        ))}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                        }}
                      >
                        <input
                          className="input-field"
                          placeholder="אימייל *"
                          value={analysisForm.email}
                          onChange={(e) =>
                            setAnalysisForm({
                              ...analysisForm,
                              email: e.target.value,
                            })
                          }
                        />
                        <input
                          className="input-field"
                          placeholder="טלפון (אופציונלי)"
                          value={analysisForm.phone}
                          onChange={(e) =>
                            setAnalysisForm({
                              ...analysisForm,
                              phone: e.target.value,
                            })
                          }
                        />
                        <textarea
                          className="input-field"
                          placeholder="על מה תרצה שנתמקד? (אופציונלי)"
                          value={analysisForm.focus}
                          onChange={(e) =>
                            setAnalysisForm({
                              ...analysisForm,
                              focus: e.target.value,
                            })
                          }
                          style={{ minHeight: 80, resize: "vertical" }}
                        />
                      </div>
                      <div
                        style={{
                          background: "rgba(99,102,241,0.08)",
                          border: "1px solid rgba(99,102,241,0.2)",
                          borderRadius: 10,
                          padding: 12,
                          marginTop: 16,
                          fontSize: 13,
                          color: "#A5B4FC",
                        }}
                      >
                        🔒 המידע שלך מאובטח ולא יועבר לצד שלישי
                      </div>
                      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                        <button
                          style={s.btnGhost}
                          onClick={() => setAnalysisStep(1)}
                        >
                          ← חזור
                        </button>
                        <button
                          style={{ ...s.btn, flex: 1, padding: "13px" }}
                          onClick={submitAnalysis}
                        >
                          שלח וקבל ניתוח חינמי 🚀
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );

  // ── Dashboard ──
  return (
    <div style={s.app}>
      <link
        href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      {notification && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: notification.color,
            color: "#fff",
            borderRadius: 12,
            padding: "12px 24px",
            fontWeight: 700,
            zIndex: 9999,
            fontSize: 15,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {notification.msg}
        </div>
      )}
      <nav style={s.nav}>
        <div style={s.logo}>⭐ ReputeAI</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              background: isDemoMode
                ? "rgba(245,158,11,0.15)"
                : "rgba(16,185,129,0.15)",
              border: `1px solid ${isDemoMode ? "#F59E0B" : "#10B981"}`,
              borderRadius: 20,
              padding: "4px 12px",
              fontSize: 12,
              color: isDemoMode ? "#F59E0B" : "#10B981",
              fontWeight: 700,
            }}
          >
            {isDemoMode ? "🎭 מצב דמו" : "✅ עסק אמיתי"}
          </div>
          {googleUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img
                src={googleUser.picture}
                alt=""
                style={{ width: 32, height: 32, borderRadius: "50%" }}
              />
              <span style={{ color: colors.sub, fontSize: 14 }}>
                {googleUser.name}
              </span>
            </div>
          ) : (
            <div style={{ color: colors.sub, fontSize: 14 }}>דמו</div>
          )}
          {!isDemoMode && locationId && (
            <button
              style={{ ...s.btnGhost, padding: "8px 14px", fontSize: 12 }}
              onClick={fetchRealReviews}
            >
              🔄 רענן
            </button>
          )}
          <button style={s.btnGhost} onClick={() => setPage("stats")}>
            📊 סטטיסטיקות
          </button>
          <button style={s.btnGhost} onClick={() => setPage("landing")}>
            ← חזור לאתר
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {loadingReviews && (
          <div style={{ textAlign: "center", padding: 60, color: colors.sub }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔄</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              טוען ביקורות אמיתיות...
            </div>
          </div>
        )}
        {!loadingReviews && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
                marginBottom: 32,
              }}
            >
              {[
                {
                  val: reviews.length ? `${avgRating} ★` : "—",
                  label: "דירוג ממוצע",
                  color: "#F59E0B",
                },
                { val: reviews.length, label: "סך ביקורות", color: "#6366F1" },
                { val: positive, label: "ביקורות חיוביות", color: "#10B981" },
                { val: negative, label: "ביקורות שליליות", color: "#EF4444" },
                { val: unreplied, label: "ממתינות לתגובה", color: "#F59E0B" },
              ].map(({ val, label, color }) => (
                <div key={label} style={s.statCard}>
                  <div style={{ fontSize: 36, fontWeight: 900, color }}>
                    {val}
                  </div>
                  <div
                    style={{ color: colors.sub, fontSize: 13, marginTop: 4 }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 24,
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                {["all", "positive", "negative", "neutral"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      ...s.btnGhost,
                      padding: "8px 16px",
                      fontSize: 13,
                      background:
                        filter === f ? "rgba(99,102,241,0.2)" : "transparent",
                      borderColor: filter === f ? "#6366F1" : colors.border,
                      color: filter === f ? "#A5B4FC" : colors.sub,
                    }}
                  >
                    {f === "all"
                      ? "הכל"
                      : f === "positive"
                      ? "חיוביות"
                      : f === "negative"
                      ? "שליליות"
                      : "ניטרליות"}
                  </button>
                ))}
              </div>
              <button style={s.btn} onClick={() => setWhatsappModal(true)}>
                📱 שלח בקשת ביקורת
              </button>
            </div>
            {reviews.length === 0 && (
              <div
                style={{ textAlign: "center", padding: 80, color: colors.sub }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    marginBottom: 8,
                    color: colors.text,
                  }}
                >
                  אין ביקורות עדיין
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filtered.map((review) => (
                <div
                  key={review.id}
                  style={{
                    ...s.card,
                    borderRight:
                      review.sentiment === "negative"
                        ? "3px solid #EF4444"
                        : review.sentiment === "positive"
                        ? "3px solid #10B981"
                        : `3px solid ${colors.border}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>{review.author}</span>
                        <StarRating rating={review.rating} />
                        <Badge sentiment={review.sentiment} />
                        <span
                          style={{
                            fontSize: 11,
                            color: colors.sub,
                            background: colors.bg,
                            padding: "2px 8px",
                            borderRadius: 10,
                          }}
                        >
                          {review.source}
                        </span>
                        {review.replied && (
                          <span
                            style={{
                              fontSize: 11,
                              color: "#10B981",
                              background: "#064E3B",
                              padding: "2px 8px",
                              borderRadius: 10,
                            }}
                          >
                            ✓ הושב
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          margin: 0,
                          color: colors.sub,
                          fontSize: 14,
                          lineHeight: 1.6,
                        }}
                      >
                        {review.text}
                      </p>
                      <div
                        style={{ color: "#475569", fontSize: 12, marginTop: 6 }}
                      >
                        {review.date}
                      </div>
                    </div>
                    {!review.replied && (
                      <button
                        style={{
                          ...s.btn,
                          padding: "8px 16px",
                          fontSize: 13,
                          whiteSpace: "nowrap",
                        }}
                        onClick={() => getAIReply(review)}
                      >
                        🤖 AI תגובה
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* AI Reply Modal */}
      {activeReview && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 24,
          }}
          onClick={(e) => e.target === e.currentTarget && setActiveReview(null)}
        >
          <div
            style={{
              ...s.card,
              maxWidth: 560,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>
              🤖 תגובה עם AI
            </div>
            <div
              style={{
                background: colors.bg,
                borderRadius: 10,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  {activeReview.author}
                </span>
                <StarRating rating={activeReview.rating} />
              </div>
              <p style={{ margin: 0, color: colors.sub, fontSize: 14 }}>
                {activeReview.text}
              </p>
            </div>
            {loadingAI ? (
              <div
                style={{ textAlign: "center", padding: 32, color: "#6366F1" }}
              >
                ⟳ AI מנתח ומייצר תגובה...
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    marginBottom: 8,
                    color: colors.sub,
                  }}
                >
                  תגובה מוצעת (ניתנת לעריכה):
                </div>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: 120,
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10,
                    padding: 12,
                    color: colors.text,
                    fontSize: 14,
                    fontFamily: "'Heebo', sans-serif",
                    resize: "vertical",
                    boxSizing: "border-box",
                    direction: "rtl",
                  }}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button style={s.btn} onClick={submitReply}>
                    שלח תגובה ל-Google
                  </button>
                  <button
                    style={s.btnGhost}
                    onClick={() => setActiveReview(null)}
                  >
                    ביטול
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {whatsappModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 24,
          }}
          onClick={(e) =>
            e.target === e.currentTarget && setWhatsappModal(false)
          }
        >
          <div style={{ ...s.card, maxWidth: 500, width: "100%" }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>
              📱 שלח בקשת ביקורת ב-WhatsApp
            </div>
            <div style={{ color: colors.sub, fontSize: 14, marginBottom: 16 }}>
              ההודעה הבאה תישלח ל-5 לקוחות אחרונים:
            </div>
            <div
              style={{
                background: "#075E54",
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#fff",
                  fontSize: 14,
                  lineHeight: 1.7,
                  direction: "rtl",
                }}
              >
                {WHATSAPP_TEMPLATE(onboardingData.businessName || "העסק שלנו")}
              </p>
            </div>
            <div
              style={{
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.3)",
                borderRadius: 10,
                padding: 12,
                marginBottom: 20,
                fontSize: 13,
                color: "#10B981",
              }}
            >
              💡 פילטר חכם: לקוחות לא מרוצים יועברו לטופס פנימי ולא ל-Google
            </div>
            {sendSuccess ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 20,
                  color: "#10B981",
                  fontWeight: 700,
                  fontSize: 18,
                }}
              >
                ✅ נשלח!
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  style={{
                    ...s.btn,
                    flex: 1,
                    background: "linear-gradient(135deg, #075E54, #128C7E)",
                  }}
                  onClick={sendWhatsapp}
                >
                  שלח עכשיו
                </button>
                <button
                  style={s.btnGhost}
                  onClick={() => setWhatsappModal(false)}
                >
                  ביטול
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
