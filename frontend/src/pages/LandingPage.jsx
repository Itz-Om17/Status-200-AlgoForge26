import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, ArrowRight, Activity, Eye, Zap, Server, EyeOff, Search,
  Scale, ShieldAlert, FileSearch, Database, RefreshCcw, Sun, Moon, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const FEATURES = [
  {
    icon: Activity,
    label: 'Smart Detection & Scoring',
    desc: 'Receive a definitive 0-100 Master Fairness Score. FairAI uses an embedded LLM semantic engine to automatically scan your schema and detect sensitive demographic attributes—requiring zero manual configuration.',
    iconBg: 'linear-gradient(135deg, #3b82f6, #6e9fff)',
    iconColor: '#fff',
    accent: '#85adff',
    darkBg: 'linear-gradient(135deg, #1a1f3a 0%, #191825 100%)',
  },
  {
    icon: Eye,
    label: 'Generative AI Insights',
    desc: "Bring total transparency to the 'black box'. FairAI uses LLaMA 3 to instantly translate complex mathematical metrics and SHAP values into clear, human-readable explanations for non-technical stakeholders.",
    iconBg: 'linear-gradient(135deg, #2563eb, #3b82f6)',
    iconColor: '#fff',
    accent: '#60a5fa',
    darkBg: 'linear-gradient(135deg, #0f1f3d 0%, #0d1829 100%)',
  },
  {
    icon: Zap,
    label: 'Non-Destructive Mitigation',
    desc: 'Correct identified imbalances instantly without expensive retraining. FairAI uses Reject Option Classification (ROC) post-processing to mathematically adjust borderline predictions and ensure equitable outcomes.',
    iconBg: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
    iconColor: '#fff',
    accent: '#a78bfa',
    darkBg: 'linear-gradient(135deg, #1a1035 0%, #150d2a 100%)',
  },
  {
    icon: FileSearch,
    label: '3-Tier Deep Audits',
    desc: 'Generate enterprise-grade compliance reports through a rigorous three-step evaluation: Disparate Impact analysis, Counterfactual "What-If" flip testing, and SHAP feature importance ranking.',
    iconBg: 'rgba(59,130,246,0.18)',
    iconColor: '#60a5fa',
    accent: '#60a5fa',
    darkBg: 'rgba(25,24,37,0.9)',
  },
  {
    icon: Database,
    label: 'Enterprise Guardrail Exports',
    desc: 'Instantly export your debiased dataset, or download a fully packaged FairAI Python Wrapper (.zip) that acts as a drop-in compliance guardrail for your legacy models in production.',
    iconBg: 'rgba(139,92,246,0.18)',
    iconColor: '#a78bfa',
    accent: '#a78bfa',
    darkBg: 'rgba(25,24,37,0.9)',
  },
  {
    icon: RefreshCcw,
    label: 'Universal Black-Box Compatibility',
    desc: 'Audit any existing pre-trained model (.pkl) instantly. FairAI operates securely on the final predictions, requiring absolutely zero access to your original training pipelines or proprietary code.',
    iconBg: 'rgba(16,185,129,0.18)',
    iconColor: '#34d399',
    accent: '#34d399',
    darkBg: 'rgba(25,24,37,0.9)',
  },
];

// ─── Spline-style cylindrical 3D carousel ───────────────────────────────────
const CARD_W = 320;
const CARD_H = 420;
const RADIUS = 480;
const TILT_X = 14; // reduced tilt so top of front card is never clipped

function SplineCarousel({ isDarkMode }) {
  const total = FEATURES.length;
  const [active, setActive] = useState(0);
  const autoRef = useRef(null);
  const stageRef = useRef(null);

  const next = useCallback(() => setActive(p => (p + 1) % total), [total]);
  const prev = useCallback(() => setActive(p => (p - 1 + total) % total), [total]);

  // Auto-rotate every 3.5s
  useEffect(() => {
    autoRef.current = setInterval(next, 3500);
    return () => clearInterval(autoRef.current);
  }, [next]);

  const resetAuto = () => {
    clearInterval(autoRef.current);
    autoRef.current = setInterval(next, 3500);
  };

  const handleDot = (i) => { setActive(i); resetAuto(); };

  // Mouse-wheel scroll to navigate (without preventing page scroll)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let cooldown = false;
    const onWheel = (e) => {
      // Don't prevent default, so the full page can still scroll properly
      if (cooldown) return;
      cooldown = true;
      if (e.deltaY > 0) { next(); resetAuto(); }
      else { prev(); resetAuto(); }
      setTimeout(() => { cooldown = false; }, 600);
    };
    el.addEventListener('wheel', onWheel, { passive: true });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, prev]);

  // Pointer drag and hold to pause auto logic
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);

  const onPointerDown = (e) => {
    setIsDragging(true);
    setStartX(e.clientX);
    clearInterval(autoRef.current);
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const diff = e.clientX - startX;
    if (diff > 60) { prev(); setStartX(e.clientX); }
    else if (diff < -60) { next(); setStartX(e.clientX); }
  };

  const onPointerUp = () => {
    setIsDragging(false);
    resetAuto();
  };

  const onPointerLeave = () => {
    if (isDragging) setIsDragging(false);
    resetAuto();
  };

  // Theme-derived colours
  const sectionBg = isDarkMode ? '#0d0d17' : '#f0f4ff';
  const maskColor = isDarkMode ? '#0d0d17' : '#f0f4ff';
  const cardBg = isDarkMode ? '#1e1e30' : '#ffffff';
  const cardTitle = isDarkMode ? '#efecfb' : '#111111';
  const cardDesc = isDarkMode ? '#aca9b7' : '#555555';
  const dotInactive = isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '150px' }}>
      {/* ── Stage: perspective viewport ── extra height ensures no top clipping */}
      <div
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onMouseEnter={() => clearInterval(autoRef.current)}
        style={{
          width: '100%',
          height: '800px',
          perspective: '1200px',
          perspectiveOrigin: '50% 50%',
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        {/* Ambient glows */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '700px', height: '700px', background: 'radial-gradient(ellipse, rgba(59,130,246,0.18) 0%, transparent 55%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: '65%', left: '55%', transform: 'translate(-50%,-50%)', width: '500px', height: '500px', background: 'radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 60%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* ── Cylinder drum ── */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: 0, height: 0,
          transformStyle: 'preserve-3d',
          transform: `translate(-50%, -50%) rotateX(${TILT_X}deg) rotateY(${-active * (360 / total)}deg)`,
          transition: 'transform 0.75s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1,
        }}>
          {FEATURES.map((feat, i) => {
            const angle = i * (360 / total);
            const depth = (Math.cos((i - active) * (2 * Math.PI / total)) + 1) / 2;
            const opacity = 0.3 + 0.7 * depth;
            const scale = 0.62 + 0.38 * depth;

            return (
              <div
                key={i}
                onClick={() => { setActive(i); resetAuto(); }}
                style={{
                  position: 'absolute',
                  width: `${CARD_W}px`,
                  height: `${CARD_H}px`,
                  top: `-${CARD_H / 2}px`,
                  left: `-${CARD_W / 2}px`,
                  transform: `rotateY(${angle}deg) translateZ(${RADIUS}px) scale(${scale})`,
                  transformStyle: 'preserve-3d',
                  opacity,
                  cursor: i === active ? 'default' : 'pointer',
                  transition: 'opacity 0.4s',
                  borderRadius: '22px',
                  background: cardBg,
                  boxShadow: i === active
                    ? `0 32px 80px rgba(0,0,0,${isDarkMode ? 0.6 : 0.12}), 0 0 40px ${feat.accent}40`
                    : `0 16px 48px rgba(0,0,0,${isDarkMode ? 0.5 : 0.08})`,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '28px',
                  userSelect: 'none',
                  transition: 'opacity 0.4s, background 0.4s, box-shadow 0.4s',
                }}
              >
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ width: '44px', height: '44px', background: feat.iconBg, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <feat.icon size={22} color={feat.iconColor} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: feat.accent, letterSpacing: '2px', textTransform: 'uppercase' }}>0{i + 1}</span>
                </div>

                {/* Data visualization */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                  <CardViz feat={feat} idx={i} isDarkMode={isDarkMode} />
                </div>

                {/* Card footer */}
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: cardTitle, letterSpacing: '-0.3px', marginBottom: '6px', transition: 'color 0.4s' }}>{feat.label}</div>
                  <div style={{ fontSize: '12px', color: cardDesc, lineHeight: 1.5, transition: 'color 0.4s' }}>{feat.desc.split('—')[0].trim()}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Edge fade masks — theme-aware */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${maskColor} 0%, transparent 20%, transparent 80%, ${maskColor} 100%)`, pointerEvents: 'none', zIndex: 2, transition: 'background 0.4s' }} />
      </div>

      {/* ── Dots only (arrows removed) ── */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '28px', zIndex: 3 }}>
        {FEATURES.map((_, i) => (
          <button
            key={i}
            onClick={() => handleDot(i)}
            style={{
              width: i === active ? '24px' : '8px',
              height: '8px',
              borderRadius: '9999px',
              background: i === active ? '#3b82f6' : dotInactive,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s',
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Unique SVG data visualizations per card
function CardViz({ feat, idx, isDarkMode }) {
  const VIZS = [
    // 0: Donut
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="46" fill="none" stroke="#e5e7eb" strokeWidth="14" />
      <circle cx="60" cy="60" r="46" fill="none" stroke="url(#dg)" strokeWidth="14"
        strokeDasharray={`${2 * Math.PI * 46 * 0.72} ${2 * Math.PI * 46 * 0.28}`} strokeLinecap="round"
        strokeDashoffset={2 * Math.PI * 46 * 0.25} />
      <defs><linearGradient id="dg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#60a5fa" /></linearGradient></defs>
      <text x="60" y="56" textAnchor="middle" fill="#111" fontSize="16" fontWeight="900" fontFamily="Inter">72%</text>
      <text x="60" y="72" textAnchor="middle" fill="#999" fontSize="9" fontFamily="Inter">FAIR SCORE</text>
    </svg>,
    // 1: Bar chart
    <svg width="140" height="90" viewBox="0 0 140 90">
      {[55, 38, 70, 48, 82, 60, 44, 75].map((h, i) =>
        <rect key={i} x={i * 17 + 2} y={90 - h} width="12" height={h} rx="4"
          fill={`url(#bg${i})`} opacity={0.8 + i * 0.02} />
      )}
      {[55, 38, 70, 48, 82, 60, 44, 75].map((_, i) => <defs key={`d${i}`}><linearGradient id={`bg${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" /><stop offset="100%" stopColor="rgba(59,130,246,0.15)" /></linearGradient></defs>)}
    </svg>,
    // 2: Wave line
    <svg width="150" height="90" viewBox="0 0 150 90">
      <polyline points="0,65 25,40 50,55 75,20 100,45 125,25 150,50" fill="none" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="0,65 25,40 50,55 75,20 100,45 125,25 150,50" fill="url(#wg)" stroke="none" />
      <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(139,92,246,0.3)" /><stop offset="100%" stopColor="rgba(139,92,246,0)" /></linearGradient></defs>
      {[{ x: 75, y: 20 }].map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="5" fill="#8b5cf6" />)}
    </svg>,
    // 3: Green checkmarks (audit)
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '140px' }}>
      {['EU AI Act', 'GDPR', 'SOC 2', 'ISO 27001'].map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(16,185,129,0.06)', borderRadius: '8px', padding: '6px 10px' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#fff', fontWeight: 900 }}>✓</div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#111' }}>{s}</span>
        </div>
      ))}
    </div>,
    // 4: Histogram
    <svg width="140" height="90" viewBox="0 0 140 90">
      {[[8, 70, '#3b82f6'], [24, 45, '#8b5cf6'], [40, 80, '#3b82f6'], [56, 55, '#10b981'], [72, 30, '#8b5cf6'], [88, 65, '#3b82f6'], [104, 85, '#10b981'], [120, 40, '#8b5cf6']].map(([x, h, c], i) =>
        <rect key={i} x={x} y={90 - h} width="10" height={h} rx="3" fill={c} opacity="0.75" />
      )}
    </svg>,
    // 5: Real-time line with alert
    <svg width="150" height="90" viewBox="0 0 150 90">
      <polyline points="0,60 20,55 40,62 60,50 80,58 100,40 120,45 140,30" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="140" cy="30" r="7" fill="#ef4444" opacity="0.9" />
      <circle cx="140" cy="30" r="12" fill="rgba(239,68,68,0.2)" />
      <text x="10" y="85" fill="#999" fontSize="9" fontFamily="Inter">Real-time drift monitor</text>
    </svg>,
  ];
  return VIZS[idx] || null;
}

// ── Hidden Risk Section: scroll-driven sticky stacking cards ─────────────────
const RISK_ITEMS = [
  { icon: ShieldAlert, title: 'Regulatory Non-Compliance', desc: 'New EU AI Act and global mandates require explainable, auditable mitigation strategies — or face significant fines.', accent: '#ef4444', iconBg: 'rgba(239,68,68,0.12)' },
  { icon: Scale, title: 'Scaled Inequality', desc: 'Automated decisions can enforce systemic exclusion for millions in milliseconds, amplifying historical injustice at machine speed.', accent: '#f59e0b', iconBg: 'rgba(245,158,11,0.12)' },
  { icon: Server, title: 'Infrastructure Paralysis', desc: 'Traditional bias correction forces enterprises to rip out legacy systems, spend weeks retraining models, and risk millions in downtime just to achieve compliance.', accent: '#8b5cf6', iconBg: 'rgba(139,92,246,0.12)' },
  { icon: EyeOff, title: 'Inaccessible Metrics', desc: 'While data scientists understand raw statistical outputs, compliance officers and legal teams are left in the dark by confusing, overly-technical dashboards.', accent: '#3b82f6', iconBg: 'rgba(59,130,246,0.12)' },
  { icon: Search, title: 'Blind Spots in Auditing', desc: 'Manual fairness checks leave engineers guessing which demographic columns cause trouble, missing complex intersecting biases until they impact real customers.', accent: '#ec4899', iconBg: 'rgba(236,72,153,0.12)' },
];

// Px of scroll runway per card — 5 cards × 400 = 2000 px total runway (fast, smooth reveal)
const STACK_STEP = 400;

function HiddenRiskSection({ isDarkMode, textPrimary, textMuted, border }) {
  const cardBg = isDarkMode ? '#1e1e30' : '#ffffff';
  const sectionBg = isDarkMode ? '#0d0d17' : '#f8fafc';

  return (
    <section style={{
      background: sectionBg,
      borderTop: `1px solid ${border}`,
      paddingTop: '320px',
      paddingBottom: '160px',
      transition: 'background 0.4s'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 32px',
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 1fr) 1fr',
        gap: '80px',
        alignItems: 'start' // Critical for sticky inside grid wrapper
      }}>

        {/* LEFT: editorial text (Sticky) */}
        <div style={{ position: 'sticky', top: '120px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px' }}>The Hidden Risk</div>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: '24px', color: textPrimary, transition: 'color 0.4s' }}>
            The hidden costs of biased AI.
          </h2>
          <p style={{ fontSize: '18px', color: textMuted, lineHeight: 1.8, marginBottom: '28px', transition: 'color 0.4s' }}>
            Overcoming the systemic hurdles that prevent responsible enterprise deployment. Automated decisions can enforce systemic exclusion for millions in milliseconds — amplifying historical injustice at machine speed.
          </p>
          <blockquote style={{ borderLeft: '3px solid #ef4444', paddingLeft: '20px', margin: 0 }}>
            <p style={{ fontSize: '15px', fontWeight: 700, color: textPrimary, lineHeight: 1.7, fontStyle: 'italic', transition: 'color 0.4s' }}>
              "Most systems operate as black boxes — lacking the transparency required to identify whether an automated decision is discriminatory."
            </p>
          </blockquote>
        </div>

        {/* RIGHT: native sticky stacking cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}>
          {RISK_ITEMS.map((item, index) => (
            <div
              key={index}
              style={{
                position: 'sticky',
                top: `calc(120px + ${index * 24}px)`,
                zIndex: 10 + index,
                background: cardBg,
                border: `1px solid ${border}`,
                borderRadius: '24px',
                padding: '40px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                boxShadow: isDarkMode
                  ? `0 -10px 40px rgba(0,0,0,0.4)`
                  : `0 -10px 40px rgba(0,0,0,0.05)`,
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '56px', height: '56px', background: item.iconBg, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${item.accent}30` }}>
                  <item.icon size={28} color={item.accent} />
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '24px', color: textPrimary, margin: 0, transition: 'color 0.4s' }}>
                  {item.title}
                </h3>
              </div>

              <p style={{ fontSize: '16px', color: textMuted, lineHeight: 1.7, margin: 0, transition: 'color 0.4s' }}>
                {item.desc}
              </p>

              {/* Top glare effect */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${item.accent}80, transparent)`, pointerEvents: 'none', borderRadius: '24px 24px 0 0' }}></div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const dashRef = useRef(null);
  const [openModal, setOpenModal] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Mouse-based 3D tilt for dashboard mockup
  useEffect(() => {
    const card = dashRef.current;
    if (!card) return;
    const container = card.parentElement;
    const handleMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rotY = -6 + ((x - cx) / cx) * 8;
      const rotX = 14 + -((y - cy) / cy) * 4;
      card.style.transform = `perspective(1400px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    };
    const handleLeave = () => {
      card.style.transform = 'perspective(1400px) rotateX(14deg) rotateY(-6deg)';
    };
    container.addEventListener('mousemove', handleMove);
    container.addEventListener('mouseleave', handleLeave);
    return () => {
      container.removeEventListener('mousemove', handleMove);
      container.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  const surface = isDarkMode ? '#0d0d17' : '#f0f4ff';
  const textPrimary = isDarkMode ? '#efecfb' : '#0d0d17';
  const textMuted = isDarkMode ? '#aca9b7' : '#555';
  const border = isDarkMode ? 'rgba(72,71,83,0.4)' : 'rgba(0,0,0,0.07)';
  const navBg = isDarkMode ? 'rgba(13,13,23,0.75)' : 'rgba(255,255,255,0.8)';
  const cardSurface = isDarkMode ? '#191825' : '#fff';

  return (
    <div style={{ background: surface, color: textPrimary, fontFamily: "'Inter', sans-serif", overflowX: 'clip', transition: 'background 0.4s, color 0.4s' }}>

      {/* FLOATING PILL NAVBAR */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'center', padding: '16px 24px', background: 'transparent' }}>
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 24px',
          background: navBg,
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: `1px solid ${border}`,
          borderRadius: '9999px',
          boxShadow: isDarkMode ? '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(133,173,255,0.06)' : '0 8px 32px rgba(0,0,0,0.08)',
          minWidth: '640px', maxWidth: '920px', width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {/* FairAI Brain+Scale inline SVG logo — no external file needed */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="url(#navLogoGrad)" />
              {/* Brain left */}
              <path d="M8 18c0 2.2 1.5 4 3.5 4 .3 0 .5 0 .8-.1V13c-.3-.1-.5-.1-.8-.1C9.5 13 8 15 8 18z" fill="white" opacity="0.9" />
              <path d="M12.3 12.5c.3-.7.9-1 1.5-1 .4 0 .7.1 1 .3V22c-.3.1-.6.2-1 .2-.6 0-1.2-.3-1.5-1V12.5z" fill="white" opacity="0.9" />
              {/* Magnifying glass */}
              <circle cx="15" cy="17" r="3.5" stroke="white" strokeWidth="1.5" fill="none" opacity="0.85" />
              <line x1="17.5" y1="19.5" x2="20" y2="22" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
              {/* Scale */}
              <line x1="20" y1="11" x2="26" y2="11" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
              <line x1="23" y1="11" x2="23" y2="21" stroke="white" strokeWidth="1.2" opacity="0.9" />
              <path d="M20 11 L18.5 14.5 H21.5 Z" fill="white" opacity="0.75" />
              <path d="M26 11 L24.5 14.5 H27.5 Z" fill="white" opacity="0.75" />
              <defs>
                <linearGradient id="navLogoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#1e3a5f" />
                  <stop offset="100%" stopColor="#0d0d17" />
                </linearGradient>
              </defs>
            </svg>
            <span style={{ fontWeight: 800, fontSize: '17px', letterSpacing: '-0.5px', color: textPrimary }}>FairAI</span>
          </div>
          <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
            {['Platform', 'Solutions', 'Resources', 'Pricing'].map(item => (
              <span key={item} style={{ fontSize: '14px', fontWeight: 600, color: textMuted, cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = textPrimary}
                onMouseLeave={e => e.target.style.color = textMuted}>
                {item}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
            <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', color: textMuted, cursor: 'pointer', display: 'flex', padding: '4px' }}>
              {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <Link to="/login" style={{ fontSize: '14px', fontWeight: 600, color: textMuted, textDecoration: 'none' }}>Log in</Link>
            <Link to="/register" style={{
              background: isDarkMode ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#111',
              color: '#fff', padding: '9px 22px', borderRadius: '9999px',
              fontSize: '14px', fontWeight: 700, textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: isDarkMode ? '0 0 24px rgba(59,130,246,0.4)' : '0 4px 12px rgba(0,0,0,0.15)',
            }}>
              Get Started <ArrowRight size={13} />
            </Link>
          </div>
        </nav>
      </div>

      {/* ═══════════════════════════════════════ HERO ═══════════════════════════════════════ */}
      <section style={{ position: 'relative', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 32px 0', overflow: 'visible', textAlign: 'center' }}>
        {/* Ambient glows */}
        <div style={{ position: 'absolute', top: '-15%', left: '-8%', width: '750px', height: '750px', background: 'radial-gradient(ellipse, rgba(59,130,246,0.18) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '-8%', width: '750px', height: '750px', background: 'radial-gradient(ellipse, rgba(139,92,246,0.14) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '880px' }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 18px', background: isDarkMode ? 'rgba(25,24,37,0.9)' : 'rgba(255,255,255,0.95)', border: `1px solid ${border}`, borderRadius: '9999px', fontSize: '13px', fontWeight: 700, color: textMuted, marginBottom: '36px', backdropFilter: 'blur(16px)', letterSpacing: '0.3px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981', flexShrink: 0, animation: 'pulse-dot 2s ease-in-out infinite' }} />
            Enterprise Bias Mitigation Platform
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: 'clamp(48px, 7vw, 78px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.04em', marginBottom: '28px', color: textPrimary }}>
            Ensure trust in every<br />
            <span style={{ background: 'linear-gradient(135deg, #85adff 0%, #ac8aff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              AI-driven decision.
            </span>
          </h1>

          <p style={{ fontSize: '18px', color: textMuted, lineHeight: 1.75, maxWidth: '540px', margin: '0 auto 48px' }}>
            Integrate machine learning with fairness analysis. Evaluate, explain, and mitigate hidden biases to create transparent and accountable AI systems.
          </p>

          <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '18px 38px', borderRadius: '9999px', fontSize: '16px', fontWeight: 700, background: isDarkMode ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#111', color: '#fff', textDecoration: 'none', boxShadow: isDarkMode ? '0 0 60px rgba(59,130,246,0.5), 0 0 120px rgba(139,92,246,0.2)' : '0 12px 40px rgba(0,0,0,0.15)', transition: 'transform 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = ''}
          >
            Start Free Audit <ArrowRight size={18} />
          </Link>
          {/* Spacer so dashboard card doesn't overlap the CTA */}
          <div style={{ height: '80px' }} />
        </div>

        {/* ─── 3D DASHBOARD MOCKUP ─── */}
        <div style={{ position: 'relative', zIndex: 2, marginTop: '60px', width: '100%', maxWidth: '1020px', marginBottom: '-120px' }}>
          <div ref={dashRef} style={{
            transform: 'perspective(1400px) rotateX(14deg) rotateY(-6deg)',
            transition: 'transform 0.12s ease-out',
            transformStyle: 'preserve-3d',
            borderRadius: '20px',
            boxShadow: isDarkMode
              ? '0 100px 160px rgba(0,0,0,0.9), 0 40px 80px rgba(59,130,246,0.2), 0 0 0 1px rgba(133,173,255,0.14), 0 20px 40px rgba(139,92,246,0.1)'
              : '0 60px 100px rgba(0,0,0,0.12), 0 20px 40px rgba(59,130,246,0.08), 0 0 0 1px rgba(0,0,0,0.05)',
            overflow: 'hidden',
            background: isDarkMode ? '#0d0d17' : '#fff',
            width: '95%',
            margin: '0 auto',
          }}>
            {/* Browser chrome */}
            <div style={{ background: isDarkMode ? '#12121d' : 'linear-gradient(180deg, #f5f5f8 0%, #ececf0 100%)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${border}` }}>
              <div style={{ display: 'flex', gap: '7px' }}>
                {['#ff5f56', '#ffbd2e', '#27c93f'].map(c => <div key={c} style={{ width: '12px', height: '12px', borderRadius: '50%', background: c, boxShadow: `0 0 4px ${c}80` }} />)}
              </div>
              <div style={{ flex: 1, height: '23px', background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'linear-gradient(90deg, rgba(59,130,246,0.06), rgba(139,92,246,0.06))', borderRadius: '6px', margin: '0 16px', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}` }} />
            </div>

            {/* Dashboard content */}
            <div style={{ padding: '28px', display: 'grid', gridTemplateColumns: '1fr 2.2fr 1fr', gap: '18px', minHeight: '360px', background: isDarkMode ? '#0d0d17' : '#fafafe' }}>
              {/* Left metrics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { label: 'BIAS SCORE', val: '94%', color: '#10b981' },
                  { label: 'MODELS AUDITED', val: '1,247', color: '#85adff' },
                  { label: 'RISK FLAGS', val: '3', color: '#f59e0b' },
                ].map(m => (
                  <div key={m.label} style={{ background: cardSurface, borderRadius: '14px', padding: '18px', border: `1px solid ${border}`, transition: 'background 0.4s' }}>
                    <div style={{ fontSize: '10px', color: textMuted, fontWeight: 700, letterSpacing: '1px', marginBottom: '10px' }}>{m.label}</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: m.color, letterSpacing: '-0.5px' }}>{m.val}</div>
                  </div>
                ))}
              </div>

              {/* Center bar chart */}
              <div style={{ background: cardSurface, borderRadius: '14px', padding: '22px', border: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: '16px', transition: 'background 0.4s' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: textMuted, letterSpacing: '1.5px' }}>BIAS SCORING VARIANCE</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                  {[72, 48, 88, 58, 94, 68, 83, 76, 55, 91].map((h, i) => (
                    <div key={i} style={{ flex: 1, borderRadius: '4px 4px 0 0', height: `${h * 2}px`, background: `linear-gradient(180deg, ${['#3b82f6', '#8b5cf6', '#10b981'][i % 3]} 0%, ${['rgba(59,130,246,0.2)', 'rgba(139,92,246,0.2)', 'rgba(16,185,129,0.2)'][i % 3]} 100%)` }} />
                  ))}
                </div>
              </div>

              {/* Right donut */}
              <div style={{ background: cardSurface, borderRadius: '14px', padding: '22px', border: `1px solid ${border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'background 0.4s' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: textMuted, letterSpacing: '1.5px' }}>FAIRNESS SCORE</div>
                <svg width="116" height="116" viewBox="0 0 116 116">
                  <circle cx="58" cy="58" r="44" fill="none" stroke={isDarkMode ? '#252433' : '#e5e7eb'} strokeWidth="13" />
                  <circle cx="58" cy="58" r="44" fill="none" stroke="url(#g1)" strokeWidth="13"
                    strokeDasharray={`${2 * Math.PI * 44 * 0.92} ${2 * Math.PI * 44 * 0.08}`}
                    strokeLinecap="round" strokeDashoffset={2 * Math.PI * 44 * 0.25} />
                  <defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#10b981" /></linearGradient></defs>
                  <text x="58" y="53" textAnchor="middle" fill={textPrimary} fontSize="20" fontWeight="900" fontFamily="Inter">92</text>
                  <text x="58" y="70" textAnchor="middle" fill={textMuted} fontSize="10" fontFamily="Inter">FAIR</text>
                </svg>
                <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 800 }}>✓ Compliant</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ HIDDEN RISK ═══════════════════════════════════════ */}
      <HiddenRiskSection
        isDarkMode={isDarkMode}
        textPrimary={textPrimary}
        textMuted={textMuted}
        border={border}
      />

      {/* ═══════════════════════════════════════ SPLINE-STYLE 3D CAROUSEL ═══════════════════════════════════════ */}
      <section style={{ background: surface, paddingTop: '60px', paddingBottom: '100px', position: 'relative', overflow: 'visible', transition: 'background 0.4s' }}>
        {/* Section header */}
        <div style={{ textAlign: 'center', padding: '0 32px', marginBottom: '60px', position: 'relative', zIndex: 5 }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#3b82f6', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px' }}>The FairAI Platform</div>
          <h2 style={{ fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', color: textPrimary, marginBottom: '16px', transition: 'color 0.4s' }}>
            AI fairness from every angle.
          </h2>
          <p style={{ fontSize: '16px', color: textMuted, lineHeight: 1.75, maxWidth: '480px', margin: '0 auto', transition: 'color 0.4s' }}>
            Explore every capability of the platform — built for data scientists and compliance teams.
          </p>
        </div>

        <SplineCarousel isDarkMode={isDarkMode} />
      </section>

      {/* ═══════════════════════════════════════ FOOTER CTA ═══════════════════════════════════════ */}
      <section style={{ padding: '120px 32px', background: isDarkMode ? '#12121d' : '#fff', borderTop: `1px solid ${border}`, textAlign: 'center', transition: 'background 0.4s' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-0.04em', color: textPrimary, marginBottom: '20px' }}>
            Deploy with confidence.
          </h2>
          <p style={{ fontSize: '18px', color: textMuted, lineHeight: 1.75, marginBottom: '48px' }}>
            Join the world's most innovative AI teams building a fairer digital future.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '16px 34px', borderRadius: '9999px', fontSize: '16px', fontWeight: 700, background: isDarkMode ? 'linear-gradient(135deg,#3b82f6,#8b5cf6)' : '#111', color: '#fff', textDecoration: 'none', boxShadow: isDarkMode ? '0 0 40px rgba(59,130,246,0.4)' : '0 8px 24px rgba(0,0,0,0.12)' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}>
              Get Started Now <ArrowRight size={16} />
            </Link>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', padding: '16px 34px', borderRadius: '9999px', fontSize: '16px', fontWeight: 700, background: 'transparent', color: textMuted, textDecoration: 'none', border: `1px solid ${border}` }}>
              Book a Demo
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: isDarkMode ? '#0a0a14' : '#f4f6fb', borderTop: `1px solid ${border}`, transition: 'background 0.4s' }}>
        {/* Footer bottom bar only */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: textMuted, fontSize: '12px', fontWeight: 500 }}>
            <ShieldCheck size={13} color={textMuted} />
            <span>© 2026 FairAI Technologies Pvt. Ltd. All rights reserved.</span>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            {[
              { label: 'Privacy Policy', id: 'privacy' },
              { label: 'Terms of Service', id: 'terms' },
              { label: 'Contact Us', id: 'contact' },
            ].map(({ label, id }) => (
              <button
                key={id}
                onClick={() => setOpenModal(id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: textMuted, transition: 'color 0.2s', padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = textPrimary}
                onMouseLeave={e => e.currentTarget.style.color = textMuted}
              >{label}</button>
            ))}
          </div>
        </div>
      </footer>

      {/* ── Legal / Contact Modals ── */}
      {openModal && (
        <div
          onClick={() => setOpenModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: isDarkMode ? '#13131f' : '#ffffff',
              border: `1px solid ${border}`,
              borderRadius: '24px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '48px',
              position: 'relative',
              boxShadow: '0 40px 120px rgba(0,0,0,0.5)',
            }}
          >
            <button
              onClick={() => setOpenModal(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '18px', color: textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >✕</button>

            {/* ─── PRIVACY POLICY ─── */}
            {openModal === 'privacy' && (
              <>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#3b82f6', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>Legal</div>
                <h2 style={{ fontSize: '28px', fontWeight: 900, color: textPrimary, marginBottom: '8px', letterSpacing: '-0.03em' }}>Privacy Policy</h2>
                <p style={{ fontSize: '13px', color: textMuted, marginBottom: '32px' }}>Last updated: 1 January 2026 &nbsp;·&nbsp; Effective: 1 February 2026 &nbsp;·&nbsp; Governing Law: India</p>
                {[
                  { title: '1. Information We Collect', body: 'We collect information you provide directly to us when you create an account, upload datasets for analysis, or contact our support team. This includes: account credentials (name, email, organisation name), uploaded model files and datasets processed through the platform, usage telemetry and audit logs, and payment information processed securely via Razorpay or Stripe in compliance with RBI guidelines.' },
                  { title: '2. How We Use Your Information', body: 'FairAI Technologies Pvt. Ltd. uses collected data exclusively to: deliver, maintain, and improve the FairAI platform; generate fairness audit reports and bias metrics specific to your models; send transactional communications (account confirmation, audit completion, billing receipts); comply with applicable Indian law including the Information Technology Act 2000, IT (Amendment) Act 2008, and the Digital Personal Data Protection Act 2023 (DPDP Act); and detect, investigate, and prevent fraudulent or unauthorised activity.' },
                  { title: '3. Data Storage & Security', body: 'All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Data is stored on servers located within India in compliance with data localisation norms where applicable. FairAI is working towards SOC 2 Type II certification and conducts periodic security audits. We retain your data for as long as your account is active, plus 90 days post-deletion to support recovery, after which all data is permanently purged.' },
                  { title: '4. Data Sharing', body: 'We do not sell, rent, or share your personal data with third parties for marketing purposes. Data may be disclosed to: cloud infrastructure providers (AWS Mumbai, GCP Mumbai) under data processing agreements subject to Indian data protection law; payment processors (Razorpay) for billing purposes; and competent authorities (courts, law enforcement) when required under applicable Indian law such as Section 69 of the IT Act or a valid court order issued by an Indian court.' },
                  { title: '5. Your Rights under the DPDP Act 2023', body: 'As a Data Principal under the Digital Personal Data Protection Act 2023, you have the right to: access a summary of personal data processed about you; correct inaccurate or incomplete data; erase your personal data upon closure of account (subject to retention obligations); nominate a representative to exercise rights on your behalf; and raise a grievance with our Data Protection Officer (DPO) or file a complaint with the Data Protection Board of India.' },
                  { title: '6. Grievance Officer', body: 'In accordance with the Information Technology Act 2000 and the DPDP Act 2023, we have appointed a Grievance Officer. Name: Ananya Sharma | Email: grievance@fairai.in | Address: FairAI Technologies Pvt. Ltd., 4th Floor, Prestige Tech Park, Outer Ring Road, Marathahalli, Bengaluru – 560 103, Karnataka, India | Response time: within 30 days of receipt of complaint.' },
                ].map(({ title, body }) => (
                  <div key={title} style={{ marginBottom: '28px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: textPrimary, marginBottom: '8px' }}>{title}</h3>
                    <p style={{ fontSize: '14px', color: textMuted, lineHeight: 1.8 }}>{body}</p>
                  </div>
                ))}
              </>
            )}

            {/* ─── TERMS OF SERVICE ─── */}
            {openModal === 'terms' && (
              <>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#8b5cf6', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>Legal</div>
                <h2 style={{ fontSize: '28px', fontWeight: 900, color: textPrimary, marginBottom: '8px', letterSpacing: '-0.03em' }}>Terms of Service</h2>
                <p style={{ fontSize: '13px', color: textMuted, marginBottom: '32px' }}>Last updated: 1 January 2026 &nbsp;·&nbsp; Governing Law: Republic of India</p>
                {[
                  { title: '1. Acceptance of Terms', body: 'By creating an account or accessing the FairAI platform, you agree to be bound by these Terms of Service and our Privacy Policy. If you are accessing FairAI on behalf of a company or legal entity, you represent that you have the authority to bind that entity. These terms constitute a legally binding agreement under the Indian Contract Act, 1872. If you do not agree, you must not access or use the platform.' },
                  { title: '2. Permitted Use', body: 'FairAI Technologies Pvt. Ltd. grants you a limited, non-exclusive, non-transferable, revocable licence to access and use the platform for your internal business purposes. You may not: sublicense or resell platform access; reverse-engineer or decompile the software; use the platform to develop a competing product; or upload datasets containing personally identifiable information collected without valid consent under applicable Indian law.' },
                  { title: '3. Data Ownership', body: 'You retain full ownership of all datasets, model files, and intellectual property uploaded to the FairAI platform. FairAI claims no intellectual property rights over your content. By uploading content, you grant FairAI a limited, royalty-free licence solely to process that content for the purpose of delivering the audit or analytical service requested.' },
                  { title: '4. Subscription & Billing', body: 'Paid plans are billed monthly or annually in advance in Indian Rupees (INR) or USD, as displayed at checkout. All fees are exclusive of applicable GST, which shall be charged at the prevailing rate and shown separately on the invoice. All fees are non-refundable except as required under the Consumer Protection Act 2019 or as expressly stated in our Refund Policy. FairAI reserves the right to revise pricing with 30 days’ written notice.' },
                  { title: '5. Limitation of Liability', body: 'To the maximum extent permitted under applicable Indian law, FairAI Technologies Pvt. Ltd. shall not be liable for any indirect, incidental, special, or consequential damages, including loss of profits or data, arising out of or connected with your use of the platform. Our total aggregate liability for any claim shall not exceed the fees paid by you in the 12 months immediately preceding the date the claim arises.' },
                  { title: '6. Termination', body: 'Either party may terminate this agreement by providing written notice. Upon termination, your access to the platform will be suspended immediately and your data retained for 90 days before permanent deletion in accordance with our data retention policy. FairAI may suspend or terminate accounts in breach of these terms without prior notice.' },
                  { title: '7. Governing Law & Dispute Resolution', body: 'These Terms shall be governed by and construed in accordance with the laws of the Republic of India. Any dispute arising out of or in connection with these Terms shall first be attempted to be resolved through good-faith negotiation. If unresolved within 30 days, disputes shall be subject to binding arbitration under the Arbitration and Conciliation Act 1996, with the seat of arbitration in Bengaluru, Karnataka. The courts at Bengaluru shall have exclusive jurisdiction for any interim relief.' },
                ].map(({ title, body }) => (
                  <div key={title} style={{ marginBottom: '28px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: textPrimary, marginBottom: '8px' }}>{title}</h3>
                    <p style={{ fontSize: '14px', color: textMuted, lineHeight: 1.8 }}>{body}</p>
                  </div>
                ))}
              </>
            )}

            {/* ─── CONTACT US ─── */}
            {openModal === 'contact' && (
              <>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>Get In Touch</div>
                <h2 style={{ fontSize: '28px', fontWeight: 900, color: textPrimary, marginBottom: '8px', letterSpacing: '-0.03em' }}>Contact FairAI</h2>
                <p style={{ fontSize: '14px', color: textMuted, marginBottom: '36px', lineHeight: 1.7 }}>Our team is available Monday to Friday, 9 AM – 6 PM IST. We typically respond within one business day.</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {[
                    { icon: '📧', label: 'General Inquiries', value: 'hello@fairai.in', sub: 'Sales, partnerships' },
                    { icon: '🛡️', label: 'Privacy & Legal', value: 'grievance@fairai.in', sub: 'DPDP Act, data requests' },
                    { icon: '🔧', label: 'Technical Support', value: 'support@fairai.in', sub: 'Platform issues, bugs' },
                    { icon: '📰', label: 'Press & Media', value: 'press@fairai.in', sub: 'Media kit, interviews' },
                  ].map(c => (
                    <div key={c.label} style={{ background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${border}`, borderRadius: '16px', padding: '20px' }}>
                      <div style={{ fontSize: '20px', marginBottom: '8px' }}>{c.icon}</div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: textPrimary, marginBottom: '4px', letterSpacing: '0.3px' }}>{c.label}</div>
                      <div style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 600, marginBottom: '4px' }}>{c.value}</div>
                      <div style={{ fontSize: '11px', color: textMuted }}>{c.sub}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 8px #10b981; opacity: 1; }
          50% { box-shadow: 0 0 18px #10b981; opacity: 0.7; }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.4); border-radius: 9999px; }
      `}</style>
    </div>
  );
}
