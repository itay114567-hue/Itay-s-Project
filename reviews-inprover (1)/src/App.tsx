import { useState, useEffect } from "react";
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
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

const DEMO_REVIEWS = [
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

const AI_RESPONSES = {
  positive: [
    "תודה רבה על הביקורת החמה! אנו שמחים שנהנית מהביקור ומצפים לראותך שוב בקרוב 😊",
    "ממש מרגש לקרוא! תודה על המילים הנפלאות, הצוות שלנו ישמח לשמוע. נשמח לארחך שוב!",
  ],
  negative: [
    "אנו מצטערים על החוויה הפחות טובה. אשמח ליצור איתך קשר אישי לפתרון מיידי. ניתן לפנות אלינו ישירות.",
    "תודה שלקחת את הזמן לשתף. אנו לומדים מכל ביקורת ונפעל לשיפור. נשמח לפצות אותך בביקור הבא.",
  ],
  neutral: ["תודה על הביקורת! נשמח לשמוע כיצד נוכל לשפר את חוויתך בביקור הבא."],
};

const WHATSAPP_TEMPLATE = (businessName: string) =>
  `היי! 😊 תודה שבחרת ב${businessName}. נשמח אם תוכל לשתף את חוויתך – ביקורת קצרה עוזרת לנו מאוד!\n👉 [קישור לביקורת בגוגל]`;

const StarRating = ({ rating, size = 14 }) => (
  <span style={{ fontSize: size, letterSpacing: 1 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <span key={i} style={{ color: i <= rating ? "#F59E0B" : "#334155" }}>
        ★
      </span>
    ))}
  </span>
);
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

const Badge = ({ sentiment }) => {
  const map = {
    positive: { label: "חיובית", color: "#10B981", bg: "#064E3B" },
    negative: { label: "שלילית", color: "#EF4444", bg: "#450A0A" },
    neutral: { label: "ניטרלית", color: "#94A3B8", bg: "#1E293B" },
  };
  const s = map[sentiment];
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

export default function App() {
  const [page, setPage] = useState("landing");
  const [reviews, setReviews] = useState(DEMO_REVIEWS);
  const [activeReview, setActiveReview] = useState(null);
  const [aiReply, setAiReply] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [filter, setFilter] = useState("all");
  const [whatsappModal, setWhatsappModal] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [notification, setNotification] = useState(null);
  const [businessName] = useState("הקפה שלנו");
  const [leadForm, setLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    business: "",
  });
  const [leadSent, setLeadSent] = useState(false);
  const [paddle, setPaddle] = useState<Paddle | undefined>();

  useEffect(() => {
    initializePaddle({
      environment: "production",
      token: "live_f8fa96560a4c447827fee1f0b0b",
    }).then((paddleInstance) => {
      if (paddleInstance) setPaddle(paddleInstance);
    });
  }, []);

  const openCheckout = (priceId: string) => {
    paddle?.Checkout.open({
      items: [{ priceId, quantity: 1 }],
    });
  };
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({
    businessName: "",
    category: "",
    phone: "",
    whatsapp: "",
    email: "",
  });
  const [user, setUser] = useState(null);

  const submitLead = async (e) => {
    e.preventDefault();
    await fetch("https://formspree.io/f/mpqyqoed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(leadForm),
    });
    setLeadSent(true);
  };

  const avgRating = (
    reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
  ).toFixed(1);
  const positive = reviews.filter((r) => r.sentiment === "positive").length;
  const negative = reviews.filter((r) => r.sentiment === "negative").length;
  const unreplied = reviews.filter((r) => !r.replied).length;

  const filtered =
    filter === "all" ? reviews : reviews.filter((r) => r.sentiment === filter);

  const showNotif = (msg, color = "#10B981") => {
    setNotification({ msg, color });
    setTimeout(() => setNotification(null), 3000);
  };

  const getAIReply = async (review) => {
    setActiveReview(review);
    setAiReply("");
    setReplyText("");
    setLoadingAI(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.REACT_APP_ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `אתה עוזר לבעל עסק להשיב על ביקורת של לקוח בצורה מקצועית ואישית. כתוב תשובה קצרה (2-3 משפטים) בעברית.

ביקורת: "${review.text}"
דירוג: ${review.rating}/5
סוג: ${review.sentiment}

כתוב רק את התשובה, ללא הקדמות.`,
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

  const colors = {
    bg: "#020817",
    card: "#0F172A",
    border: "#1E293B",
    text: "#F1F5F9",
    sub: "#94A3B8",
    accent: "#6366F1",
    accent2: "#8B5CF6",
  };

  const s = {
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

  // ─── LANDING PAGE ───
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

          {/* KPI Cards */}
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

          {/* Line Chart */}
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

          {/* Pie + Insights */}
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 16,
                  marginTop: 8,
                }}
              >
                {PIE_DATA.map((d) => (
                  <div
                    key={d.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: d.color,
                      }}
                    />
                    <span style={{ color: "#94A3B8" }}>{d.name}</span>
                  </div>
                ))}
              </div>
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
                {
                  icon: "💡",
                  text: "מומלץ לשלוח בקשות ביקורת ביום חמישי - יום עם הכי הרבה ביקורות",
                },
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
  if (page === "onboarding")
    return (
      <div style={s.app}>
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <nav style={s.nav}>
          <div style={s.logo}>⭐ ReputeAI</div>
          <div style={{ color: colors.sub, fontSize: 14 }}>הגדרת חשבון</div>
        </nav>

        <div style={{ maxWidth: 560, margin: "60px auto", padding: "0 24px" }}>
          {/* Progress Bar */}
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

          {/* Step 1 */}
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
                <input
                  placeholder="שם העסק"
                  value={onboardingData.businessName}
                  onChange={(e) =>
                    setOnboardingData({
                      ...onboardingData,
                      businessName: e.target.value,
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
                    color: onboardingData.category ? colors.text : colors.sub,
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
                <input
                  placeholder="טלפון"
                  value={onboardingData.phone}
                  onChange={(e) =>
                    setOnboardingData({
                      ...onboardingData,
                      phone: e.target.value,
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

          {/* Step 2 */}
          {onboardingStep === 2 && (
            <div style={s.card}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔗</div>
              <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>
                חיבור Google Business
              </div>
              <div
                style={{ color: colors.sub, fontSize: 14, marginBottom: 24 }}
              >
                כדי לקבל ביקורות אמיתיות נצטרך גישה לפרופיל שלך
              </div>
              <div
                style={{
                  background: colors.bg,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                {[
                  "היכנס ל-business.google.com",
                  "ודא שהעסק שלך מאומת",
                  "לחץ על 'חבר Google' למטה",
                ].map((step, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      marginBottom: i < 2 ? 12 : 0,
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: colors.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div style={{ color: colors.sub, fontSize: 14 }}>
                      {step}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  background: "rgba(99,102,241,0.1)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 20,
                  fontSize: 13,
                  color: "#A5B4FC",
                }}
              >
                💡 אם העסק עדיין לא מאומת – לא בעיה! נמשיך ונחבר אחרי האימות
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <button
                  style={{ ...s.btn, padding: "14px", fontSize: 15 }}
                  onClick={() => setOnboardingStep(3)}
                >
                  ✅ העסק מאומת - חבר עכשיו
                </button>
                <button
                  style={{ ...s.btnGhost, padding: "14px", fontSize: 15 }}
                  onClick={() => setOnboardingStep(3)}
                >
                  דלג - אחבר מאוחר יותר
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
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
                <input
                  placeholder="אימייל להתראות"
                  value={onboardingData.email}
                  onChange={(e) =>
                    setOnboardingData({
                      ...onboardingData,
                      email: e.target.value,
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
                <input
                  placeholder="WhatsApp להתראות (אופציונלי)"
                  value={onboardingData.whatsapp}
                  onChange={(e) =>
                    setOnboardingData({
                      ...onboardingData,
                      whatsapp: e.target.value,
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
              </div>
              <button
                style={{
                  ...s.btn,
                  width: "100%",
                  marginTop: 24,
                  padding: "14px",
                  fontSize: 16,
                }}
                onClick={() => setPage("waiting")}
              >
                סיים והתחל 🚀
              </button>
            </div>
          )}
        </div>
      </div>
    );

  if (page === "waiting")
    return (
      <div
        style={{
          ...s.app,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          textAlign: "center",
          padding: 24,
        }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <div style={{ fontSize: 64, marginBottom: 24 }}>⏳</div>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 16 }}>
          הכל מוכן! ממתינים לאימות Google
        </h1>
        <p
          style={{
            color: colors.sub,
            fontSize: 16,
            lineHeight: 1.7,
            maxWidth: 480,
            marginBottom: 32,
          }}
        >
          Google מאמתת את הפרופיל של{" "}
          <strong style={{ color: colors.text }}>
            {onboardingData.businessName}
          </strong>
          . התהליך לוקח עד 5 ימים. נשלח לך התראה ל-
          {onboardingData.email || "האימייל שלך"} כשהכל מוכן.
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            style={{ ...s.btn, padding: "14px 32px", fontSize: 16 }}
            onClick={() => setPage("dashboard")}
          >
            כנס לדשבורד הדמו ←
          </button>
        </div>
      </div>
    );
  if (page === "landing")
    return (
      <div style={s.app}>
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <nav style={s.nav}>
          <div style={s.logo}>⭐ ReputeAI</div>
          <div style={{ display: "flex", gap: 12 }}>
            <button style={s.btnGhost} onClick={() => setPage("dashboard")}>
              כניסה לדמו
            </button>
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                setUser(credentialResponse);
                setPage("onboarding");
              }}
              onError={() => console.log("Login Failed")}
              text="signup_with"
              locale="he"
            />
          </div>
        </nav>
        {/* Lead Form */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: colors.card,
            borderTop: `1px solid ${colors.border}`,
            padding: "14px 24px",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
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
              <input
                placeholder="שם"
                value={leadForm.name}
                onChange={(e) =>
                  setLeadForm({ ...leadForm, name: e.target.value })
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
                  width: 120,
                }}
              />
              <input
                placeholder="טלפון"
                value={leadForm.phone}
                onChange={(e) =>
                  setLeadForm({ ...leadForm, phone: e.target.value })
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
                  width: 130,
                }}
              />
              <input
                placeholder="אימייל"
                value={leadForm.email}
                onChange={(e) =>
                  setLeadForm({ ...leadForm, email: e.target.value })
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
                  width: 160,
                }}
              />
              <button
                style={{ ...s.btn, padding: "10px 24px" }}
                onClick={submitLead}
              >
                שלח ←
              </button>
            </>
          )}
        </div>

        {/* Hero */}
        <div
          style={{
            textAlign: "center",
            padding: "80px 24px 60px",
            maxWidth: 720,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "inline-block",
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: 20,
              padding: "6px 16px",
              fontSize: 13,
              color: "#A5B4FC",
              marginBottom: 24,
            }}
          >
            🚀 הכלי שכל עסק קטן צריך
          </div>
          <h1
            style={{
              fontSize: "clamp(32px, 6vw, 56px)",
              fontWeight: 900,
              lineHeight: 1.15,
              margin: "0 0 24px",
            }}
          >
            נהל את כל הביקורות שלך
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #6366F1, #A78BFA)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              במקום אחד עם AI
            </span>
          </h1>
          <p
            style={{
              color: colors.sub,
              fontSize: 18,
              lineHeight: 1.7,
              marginBottom: 40,
            }}
          >
            ריכוז ביקורות מ-Google ו-Facebook, תגובות אוטומטיות עם AI, ושליחת
            בקשות ביקורת ללקוחות דרך WhatsApp – הכל בדשבורד אחד.
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              style={{ ...s.btn, padding: "14px 32px", fontSize: 16 }}
              onClick={() => setPage("dashboard")}
            >
              ראה דמו חי ←
            </button>
            <button
              style={{ ...s.btnGhost, padding: "14px 32px", fontSize: 16 }}
            >
              קבל הצעה
            </button>
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 32,
            padding: "0 24px 60px",
            flexWrap: "wrap",
          }}
        >
          {[
            ["3×", "יותר לקוחות עם 4.7+ כוכבים"],
            ["70%", "מהביקורות נשארות ללא מענה"],
            ["2 דקות", "ממוצע זמן תגובה עם AI"],
          ].map(([n, l]) => (
            <div key={n} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 900,
                  background: "linear-gradient(135deg, #6366F1, #A78BFA)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {n}
              </div>
              <div style={{ color: colors.sub, fontSize: 14, marginTop: 4 }}>
                {l}
              </div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div
          style={{
            maxWidth: 1000,
            margin: "0 auto",
            padding: "0 24px 80px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {[
            [
              "🔔",
              "התראות מיידיות",
              "קבל התראה ברגע שנכנסת ביקורת חדשה – לא תפספס אף לקוח.",
            ],
            [
              "🤖",
              "תגובות עם AI",
              "מערכת ה-AI מנתחת את הביקורת ומציעה תגובה מקצועית בשניות.",
            ],
            [
              "📱",
              "בקשות WhatsApp",
              "שלח ללקוחות מרוצים בקשה לביקורת – לקוחות לא מרוצים מועברים לטופס פנימי.",
            ],
            [
              "📊",
              "דוחות וניתוח",
              "ראה מגמות, תלונות חוזרות ודירוג ממוצע לאורך זמן.",
            ],
          ].map(([icon, title, desc]) => (
            <div
              key={title}
              style={{ ...s.card, transition: "border-color 0.2s" }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                {title}
              </div>
              <div style={{ color: colors.sub, fontSize: 14, lineHeight: 1.6 }}>
                {desc}
              </div>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div
          style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 80px" }}
        >
          <h2
            style={{
              textAlign: "center",
              fontSize: 32,
              fontWeight: 900,
              marginBottom: 40,
            }}
          >
            מחירים פשוטים
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 20,
            }}
          >
            {[
              {
                name: "Starter",
                price: "149",
                color: "#6366F1",
                priceId: "pri_01kka28tn1tq3h072gm7fen09h",
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
                priceId: "pri_01kka2afhyxhv374bmbzbm2xkz",
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
                priceId: "pri_01kka2cza69sj9z90s83n9qn80",
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
                style={{
                  ...s.card,
                  border: plan.popular
                    ? `2px solid ${plan.color}`
                    : `1px solid ${colors.border}`,
                  position: "relative",
                }}
              >
                {plan.popular && (
                  <div
                    style={{
                      position: "absolute",
                      top: -12,
                      right: 20,
                      background: plan.color,
                      borderRadius: 20,
                      padding: "2px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    פופולרי
                  </div>
                )}
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
                  {plan.name}
                </div>
                <div
                  style={{ fontSize: 36, fontWeight: 900, color: plan.color }}
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
                  }}
                  onClick={() => openCheckout(plan.priceId!)}
                >
                  בחר תוכנית
                </button>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            textAlign: "center",
            padding: "0 24px 60px",
            color: colors.sub,
            fontSize: 14,
          }}
        >
          © 2025 ReputeAI · כל הזכויות שמורות
        </div>
      </div>
    );

  // ─── DASHBOARD ───
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID!}>
      <div style={s.app}>
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

        <nav style={s.nav}>
          <div style={s.logo}>⭐ ReputeAI</div>
          <div style={{ color: colors.sub, fontSize: 14 }}>
            {user
              ? `שלום, ${JSON.parse(atob(user.credential.split(".")[1])).name}`
              : `דמו – ${businessName}`}
          </div>
          <button style={s.btnGhost} onClick={() => setPage("stats")}>
            📊 סטטיסטיקות
          </button>
          <button style={s.btnGhost} onClick={() => setPage("landing")}>
            ← חזור לאתר
          </button>
        </nav>

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
          {/* Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
              marginBottom: 32,
            }}
          >
            <div style={s.statCard}>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#F59E0B" }}>
                {avgRating} ★
              </div>
              <div style={{ color: colors.sub, fontSize: 13, marginTop: 4 }}>
                דירוג ממוצע
              </div>
            </div>
            <div style={s.statCard}>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#6366F1" }}>
                {reviews.length}
              </div>
              <div style={{ color: colors.sub, fontSize: 13, marginTop: 4 }}>
                סך ביקורות
              </div>
            </div>
            <div style={s.statCard}>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#10B981" }}>
                {positive}
              </div>
              <div style={{ color: colors.sub, fontSize: 13, marginTop: 4 }}>
                ביקורות חיוביות
              </div>
            </div>
            <div style={s.statCard}>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#EF4444" }}>
                {negative}
              </div>
              <div style={{ color: colors.sub, fontSize: 13, marginTop: 4 }}>
                ביקורות שליליות
              </div>
            </div>
            <div style={s.statCard}>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#F59E0B" }}>
                {unreplied}
              </div>
              <div style={{ color: colors.sub, fontSize: 13, marginTop: 4 }}>
                ממתינות לתגובה
              </div>
            </div>
          </div>

          {/* Controls */}
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

          {/* Reviews List */}
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
            onClick={(e) =>
              e.target === e.currentTarget && setActiveReview(null)
            }
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
                  <div style={{ fontSize: 24, marginBottom: 8 }}>⟳</div>
                  AI מנתח ומייצר תגובה...
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
              <div
                style={{ color: colors.sub, fontSize: 14, marginBottom: 16 }}
              >
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
                  {WHATSAPP_TEMPLATE(businessName)}
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
    </GoogleOAuthProvider>
  );
}
