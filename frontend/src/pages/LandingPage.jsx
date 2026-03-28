import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Activity, Eye, Zap, Lock, Scale, BadgeCheck, Network, Sun, Moon, ShieldAlert, FileSearch, Database, RefreshCcw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Dynamic Theme Variables
  const bg = isDarkMode ? '#0a0a0a' : '#f0f4f8';
  const text = isDarkMode ? '#fff' : '#111';
  const textMuted = isDarkMode ? '#aaa' : '#666';
  const border = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
  const navBg = isDarkMode ? 'rgba(10,10,10,0.85)' : 'rgba(240,244,248,0.85)';
  const btnBg = isDarkMode ? '#fff' : '#111';
  const btnText = isDarkMode ? '#000' : '#fff';
  const cardBg = isDarkMode ? 'rgba(255,255,255,0.03)' : '#fff';
  const iconBoxBg = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  return (
    <div className="landing-page" style={{ background: bg, color: text, transition: 'background 0.3s, color 0.3s' }}>
      
      {/* Premium Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: navBg, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${border}` }}>
        <div style={{ width: '100%', padding: '0 48px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(59,130,246,0.3)' }}>
              <ShieldCheck size={20} color="#fff" />
            </div>
            <span style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px', color: text }}>FairAI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', color: textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center' }} className="hover-text-primary">
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link to="/login" style={{ fontSize: '14px', fontWeight: '600', color: textMuted, textDecoration: 'none', transition: 'color 0.2s' }} className="hover-text-primary">Log in</Link>
            <Link to="/register" style={{ background: btnBg, color: btnText, padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', transition: 'transform 0.2s' }} className="hover-scale">
              Get Started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ padding: '120px 32px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Glow Effects */}
        {isDarkMode && <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '400px', background: 'radial-gradient(ellipse at top, rgba(59,130,246,0.15), transparent 70%)', zIndex: 0, pointerEvents: 'none' }}></div>}
        
        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${border}`, borderRadius: '20px', fontSize: '13px', fontWeight: '600', color: textMuted, marginBottom: '32px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></span>
            Enterprise Bias Mitigation Platform
          </div>
          
          <h1 style={{ fontSize: '64px', fontWeight: '800', lineHeight: '1.05', letterSpacing: '-2px', marginBottom: '24px', color: isDarkMode ? '#fff' : '#111' }}>
            Ensure trust in every<br />AI-driven decision.
          </h1>
          
          <p style={{ fontSize: '18px', color: textMuted, lineHeight: '1.6', maxWidth: '640px', margin: '0 auto 48px' }}>
            Integrate machine learning with fairness analysis. Evaluate, explain, and mitigate hidden biases to create transparent and accountable AI systems.
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <Link to="/register" style={{ background: btnBg, color: btnText, padding: '16px 32px', borderRadius: '12px', fontSize: '16px', fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: isDarkMode ? '0 0 40px rgba(255,255,255,0.2)' : '0 10px 30px rgba(0,0,0,0.1)', transition: 'all 0.2s' }} className="hover-scale">
              Start Free Audit <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Dashboard Mockup Image / Graphic */}
        <div style={{ maxWidth: '1000px', margin: '80px auto 0', height: '400px', background: isDarkMode ? 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(20,20,20,0) 100%)' : 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(255,255,255,0) 100%)', border: `1px solid ${border}`, borderBottom: 'none', borderRadius: '24px 24px 0 0', position: 'relative', overflow: 'hidden', padding: '2px' }}>
          <div style={{ width: '100%', height: '100%', background: isDarkMode ? '#111' : '#fff', borderRadius: '22px 22px 0 0', position: 'relative' }}>
            <div style={{ display: 'flex', padding: '16px 24px', borderBottom: `1px solid ${border}`, gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }}></div>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }}></div>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }}></div>
            </div>
            {/* Abstract chart visuals */}
            <div style={{ padding: '40px', display: 'flex', gap: '20px' }}>
               <div style={{ flex: 1, height: '200px', background: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px dashed ${border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Activity size={48} color={textMuted} opacity={0.3} />
               </div>
               <div style={{ flex: 2, height: '200px', background: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px dashed ${border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Network size={48} color={textMuted} opacity={0.3} />
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section style={{ padding: '120px 32px', background: isDarkMode ? '#000' : '#fff', borderTop: `1px solid ${border}` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1.2fr)', gap: '64px', alignItems: 'center' }}>
          
          <div>
            <div style={{ color: '#ff5f56', fontSize: '14px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>The Hidden Risk</div>
            <h2 style={{ fontSize: '40px', fontWeight: '800', lineHeight: '1.1', letterSpacing: '-1px', marginBottom: '24px' }}>
              Historical data carries historical bias.
            </h2>
            <div style={{ fontSize: '16px', color: textMuted, lineHeight: '1.7', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p>
                Artificial Intelligence is increasingly used to make critical decisions in hiring, lending, and healthcare. But when models train on flawed historical datasets, they unintentionally absorb and scale biases related to gender, income level, and social background.
              </p>
              <div style={{ borderLeft: '3px solid #ff5f56', paddingLeft: '20px', margin: '8px 0' }}>
                <p style={{ color: text, fontSize: '18px', fontWeight: '600', lineHeight: '1.5' }}>
                  "Most existing systems operate as black boxes, lacking the transparency required to identify whether an automated decision is discriminatory."
                </p>
              </div>
            </div>
          </div>

          <div style={{ background: cardBg, borderRadius: '24px', border: `1px solid ${border}`, padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: isDarkMode ? 'none' : '0 10px 40px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ background: 'rgba(255,95,86,0.1)', color: '#ff5f56', padding: '12px', borderRadius: '12px' }}><ShieldAlert size={20} /></div>
              <div>
                <h4 style={{ color: text, fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>Regulatory Non-Compliance</h4>
                <p style={{ color: textMuted, fontSize: '14px', lineHeight: '1.5' }}>Unexplained rejections in finance or HR directly violate emerging AI fairness regulations globally.</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ background: 'rgba(255,189,46,0.1)', color: '#ffbd2e', padding: '12px', borderRadius: '12px' }}><Scale size={20} /></div>
              <div>
                <h4 style={{ color: text, fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>Scaled Inequality</h4>
                <p style={{ color: textMuted, fontSize: '14px', lineHeight: '1.5' }}>Biased data points scale infinitely in production, systematically shutting down qualified candidates.</p>
              </div>
            </div>
          </div>
          
        </div>
      </section>

      {/* The Solution */}
      <section style={{ padding: '120px 32px', background: bg }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px', maxWidth: '700px', margin: '0 auto 64px' }}>
            <div style={{ color: '#10b981', fontSize: '14px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>The FairAI Platform</div>
            <h2 style={{ fontSize: '40px', fontWeight: '800', lineHeight: '1.1', letterSpacing: '-1px', marginBottom: '24px' }}>
              Detect, explain, and fix model bias automatically.
            </h2>
            <p style={{ fontSize: '16px', color: textMuted, lineHeight: '1.6' }}>
              A comprehensive suite designed for data scientists and compliance teams to evaluate predictions and ensure enterprise AI fairness.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {/* Features */}
            {[
              { icon: Activity, title: "Scoring & Detection", desc: "Receive a definitive fairness score indicating how unbiased a decision is, paired with automated detection of bias across sensitive attributes.", bgCode: isDarkMode ? '#fff' : '#111', colorCode: isDarkMode ? '#000' : '#fff' },
              { icon: Eye, title: "Clear Explanations", desc: "Provide clear, human-readable explanations of the exact factors influencing a decision, bringing total transparency to the 'black box'.", bgCode: 'linear-gradient(135deg, #3b82f6, #60a5fa)', colorCode: '#fff' },
              { icon: Zap, title: "Active Mitigation", desc: "Deploy active mitigation components that improve overall fairness by automatically adjusting data flows to correct identified imbalances.", bgCode: 'linear-gradient(135deg, #8b5cf6, #c084fc)', colorCode: '#fff' },
              { icon: FileSearch, title: "Comprehensive Audits", desc: "Generate enterprise-grade compliance reports required for regulatory standards and internal AI governance committees.", bgCode: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', colorCode: isDarkMode ? '#60a5fa' : '#3b82f6' },
              { icon: Database, title: "Dataset Profiling", desc: "Analyze raw training data before model construction to identify historical skews, missing cohorts, and demographic imbalances.", bgCode: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', colorCode: isDarkMode ? '#8b5cf6' : '#6d28d9' },
              { icon: RefreshCcw, title: "Continuous Monitoring", desc: "Integrate directly into your production pipeline for real-time drift detection and continuous fairness evaluation over time.", bgCode: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', colorCode: isDarkMode ? '#34d399' : '#059669' }
            ].map((feat, idx) => (
              <div key={idx} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '24px', padding: '40px 32px', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: isDarkMode ? 'none' : '0 10px 40px rgba(0,0,0,0.03)' }} className="hover-feature">
                <div style={{ width: '48px', height: '48px', background: feat.bgCode, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                  <feat.icon size={24} color={feat.colorCode} />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: text, marginBottom: '12px' }}>{feat.title}</h3>
                <p style={{ color: textMuted, fontSize: '15px', lineHeight: '1.6' }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: isDarkMode ? '#000' : '#fff', borderTop: `1px solid ${border}`, padding: '32px 48px' }}>
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: textMuted, fontSize: '13px' }}>
            <span>© 2026 FairAI Inc. All rights reserved.</span>
            <div style={{ display: 'flex', gap: '24px' }}>
              <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} className="hover-text-primary">Contact Us</span>
              <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} className="hover-text-primary">Privacy Policy</span>
              <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} className="hover-text-primary">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        .hover-scale:hover { transform: scale(1.02); }
        .hover-feature:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.08) !important; }
        .hover-text-primary:hover { color: ${text} !important; }
      `}</style>
    </div>
  );
}
