import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Mic } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { API_BASE_URL } from '../config/api';

// ── Curated color palette for charts ────────────────────────────────────────
const CHART_COLORS = [
  '#818cf8', '#f472b6', '#34d399', '#fbbf24', '#fb7185',
  '#38bdf8', '#a78bfa', '#f87171', '#4ade80', '#facc15',
  '#2dd4bf', '#c084fc', '#fb923c', '#22d3ee', '#e879f9',
];

// ── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, total }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const color = payload[0].payload.fill || payload[0].color || '#6366f1';
    
    return (
      <div style={{
        backgroundColor: '#0f172a',
        border: `1px solid ${color}`,
        borderRadius: '10px',
        padding: '10px 14px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        minWidth: '120px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>{data.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', fontSize: '12px', paddingLeft: '18px' }}>
          <span>Count:</span>
          <span style={{ color: '#fff', fontWeight: 600 }}>{data.value}</span>
        </div>
        {total && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', fontSize: '12px', paddingLeft: '18px' }}>
            <span>Share:</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>{((data.value / total) * 100).toFixed(1)}%</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// ── Inline Chart component ──────────────────────────────────────────────────
function InlineChart({ chart }) {
  const { type, title, data } = chart;

  if (!data || data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a, #1e293b)',
      borderRadius: '14px',
      padding: '16px',
      marginTop: '10px',
      border: '1px solid rgba(99, 102, 241, 0.25)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    }}>
      <p style={{
        fontSize: '12px',
        fontWeight: 700,
        color: '#c7d2fe',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '12px',
        textAlign: 'center',
      }}>
        {title}
      </p>

      {type === 'pie' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={50}
                innerRadius={25}
                paddingAngle={3}
                strokeWidth={0}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, value, name, percent, index }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = outerRadius * 1.35;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text 
                      x={x} y={y} 
                      fill={CHART_COLORS[index % CHART_COLORS.length]} 
                      textAnchor={x > cx ? 'start' : 'end'} 
                      dominantBaseline="central"
                      style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.02em' }}
                    >
                      {`${name} (${((value / total) * 100).toFixed(1)}%)`}
                    </text>
                  );
                }}
                labelLine={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '2 2' }}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip total={total} />} cursor={{fill: 'transparent'}} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend below chart */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px 12px',
            justifyContent: 'center',
            marginTop: '4px',
          }}>
            {data.map((entry, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: CHART_COLORS[i % CHART_COLORS.length],
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                  {entry.name}: {entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Bar chart */
        <ResponsiveContainer width="100%" height={Math.max(140, data.length * 30)}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 500 }}
              width={70}
            />
            <Tooltip content={<CustomTooltip total={total} />} cursor={{fill: 'rgba(99, 102, 241, 0.1)'}} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}


// ── Main FloatingChat component ─────────────────────────────────────────────
export default function FloatingChat({ context }) {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Welcome to FairAI Analytics. Your multi-tier fairness audit is complete.\n\nI am here to help you interpret these results with complete transparency. You can ask me to explain the mathematical formulas used to evaluate your model, break down SHAP feature penalties, or generate live visualizations of your underlying dataset.\n\nTo get started, try asking:\n• "How exactly was my fairness score calculated?"\n• "Which feature is driving the most bias?"\n• "Show me the distribution of the sensitive attribute in a pie chart."',
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in your browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputValue((prev) => (prev ? prev + ' ' + transcript : transcript));
    };
    recognition.start();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = { role: 'user', content: inputValue.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      // Exclude welcome message from API
      const apiMessages = newMessages.filter(m => m.content).map(m => ({ role: m.role, content: m.content }));

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          context: context
        })
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'API Error');

      // Build assistant message with optional charts
      const assistantMsg = {
        role: 'assistant',
        content: data.reply,
      };
      if (data.charts && data.charts.length > 0) {
        assistantMsg.charts = data.charts;
      }

      setMessages([...newMessages, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages([...newMessages, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '32px', right: '32px', zIndex: 9999 }}>
      {/* Chat Window */}
      <div style={{
        position: 'absolute',
        bottom: '70px',
        right: '0',
        width: '400px',
        height: '560px',
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        pointerEvents: isOpen ? 'auto' : 'none',
        transition: 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        transformOrigin: 'bottom right',
      }}>
        {/* Header */}
        <div style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            color: '#fff',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={20} style={{ color: '#38bdf8' }} />
              <span style={{ fontWeight: 600, fontSize: '15px' }}>FairAI Chat</span>
              <span style={{
                fontSize: '9px',
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc',
                letterSpacing: '0.04em',
              }}>
                📊 Charts
              </span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: '8px',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '90%'
              }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                    <Bot size={14} color="#475569" />
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{
                    background: msg.role === 'user' ? '#111' : '#fff',
                    color: msg.role === 'user' ? '#fff' : '#1e293b',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    borderTopRightRadius: msg.role === 'user' ? '4px' : '12px',
                    borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '12px',
                    fontSize: '13.5px',
                    lineHeight: '1.5',
                    boxShadow: msg.role === 'user' ? 'none' : '0 2px 4px rgba(0,0,0,0.02), 0 0 0 1px rgba(0,0,0,0.05)',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.content}
                  </div>
                  {/* Render inline charts if present */}
                  {msg.charts && msg.charts.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {msg.charts.map((chart, ci) => (
                        <InlineChart key={ci} chart={chart} />
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px', overflow: 'hidden' }}>
                    {currentUser?.photoURL ? (
                      <img src={currentUser.photoURL} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={14} color="#fff" />
                    )}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={14} color="#475569" />
                </div>
                <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '12px', borderTopLeftRadius: '4px', boxShadow: '0 0 0 1px rgba(0,0,0,0.05)' }}>
                  <span style={{ display: 'inline-block', animation: 'blink 1.4s infinite alternate', width: '4px', height: '4px', background: '#94a3b8', borderRadius: '50%', marginRight: '4px' }} />
                  <span style={{ display: 'inline-block', animation: 'blink 1.4s infinite alternate', animationDelay: '0.2s', width: '4px', height: '4px', background: '#94a3b8', borderRadius: '50%', marginRight: '4px' }} />
                  <span style={{ display: 'inline-block', animation: 'blink 1.4s infinite alternate', animationDelay: '0.4s', width: '4px', height: '4px', background: '#94a3b8', borderRadius: '50%' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input form */}
          <form onSubmit={handleSend} style={{
            padding: '12px',
            background: '#fff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}>
            <button
              type="button"
              onClick={handleVoiceInput}
              title="Voice Input"
              style={{
                background: 'transparent',
                border: 'none',
                color: isListening ? '#ef4444' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                animation: isListening ? 'pulse 1.5s infinite' : 'none',
              }}
            >
              <Mic size={20} />
            </button>
            <input 
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about metrics or request a chart..."
              style={{
                flex: 1,
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '14px',
                color: '#111',
                outline: 'none',
                background: '#f8fafc'
              }}
              onFocus={(e) => e.target.style.borderColor = '#111'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
            <button 
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              style={{
                background: isLoading || !inputValue.trim() ? '#cbd5e1' : '#111',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>

      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #111, #333)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.3)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)'; }}
      >
        {isOpen ? <X size={26} /> : <MessageSquare size={26} />}
      </button>
      
      <style>{`
        @keyframes blink {
          0% { opacity: 0.2; }
          100% { opacity: 1; }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
