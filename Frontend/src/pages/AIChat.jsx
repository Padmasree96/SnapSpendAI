import { useEffect, useRef, useState } from 'react';
import { Send, Bot, Sparkles, User, Volume2, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const suggestions = [
    'How much did I spend this month?',
    'What are my biggest expenses?',
    'How can I save more money?',
    'Am I over budget anywhere?',
    'Show my spending personality',
    'What bills are coming up?',
];

const aiResponses = [
    "Based on your spending patterns, I recommend setting aside **15% of your income** each month for savings. You're currently saving about 12%, so a small adjustment could help.\n\n💡 Try reducing dining expenses by $50/month and moving it to savings.",
    "Your financial health score is **72/100** (Good). Key strengths: consistent income, moderate debt. Areas to improve: build an emergency fund covering 3-6 months of expenses.",
    "Looking at your expenses, I notice your **transportation costs** are higher than average. Consider carpooling or using public transit 2-3 days/week to save approximately **$100/month**.",
    "Great question! Here's a summary:\n\n📊 **Monthly Spending**: $2,434\n💰 **Monthly Income**: $5,500\n🎯 **Savings**: $3,066 (55.7%)\n\nYou're doing better than 78% of users in your income bracket!",
    "Your subscription costs total **$89.99/month**. I found 2 subscriptions you haven't used in the last 30 days. Want me to flag these for review?",
];

export default function AIChat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const { token } = useAuth();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    useEffect(scrollToBottom, [messages, isTyping]);

    const fetchHistory = async () => {
        try {
            const response = await fetch('/api/chat/history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setMessages(data.map(m => ({
                    ...m,
                    timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                })));
            }
        } catch (error) {
            console.error('Failed to fetch chat history', error);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async (text) => {
        if (!text.trim()) return;

        const dummyId = Date.now().toString();
        const userMsg = {
            id: dummyId,
            role: 'user',
            content: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await fetch('/api/chat/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ content: text })
            });

            if (!response.ok) throw new Error('Failed to get AI response');

            const data = await response.json();
            
            const aiMsg = {
                ...data.aiMessage,
                voiceUrl: data.voiceUrl,
                timestamp: new Date(data.aiMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };

            setMessages(prev => [...prev, aiMsg]);
            
            // Auto-play voice if available
            if (data.voiceUrl) {
                const audio = new Audio(data.voiceUrl);
                audio.play().catch(e => console.log('Autoplay blocked or failed', e));
            }

        } catch (error) {
            toast.error(error.message);
            setMessages(prev => prev.filter(m => m.id !== dummyId));
        } finally {
            setIsTyping(false);
        }
    };

    const playVoice = (url) => {
        if (!url) return;
        const audio = new Audio(url);
        audio.play().catch(e => toast.error('Failed to play audio'));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        sendMessage(input);
    };

    return (
        <div className="page-container" style={{ padding: 0 }}>
            <div className="card" style={{ margin: '24px 28px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--navbar-height) - 72px)' }}>
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'var(--bg-tertiary)',
                }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 'var(--radius-full)',
                        background: 'var(--gradient-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                    }}>
                        <Bot size={20} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>SnapSpend AI Assistant</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }}></span>
                            Online • Powered by AI
                        </div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                        <Sparkles size={18} style={{ color: 'var(--primary-400)' }} />
                    </div>
                </div>

                {/* Messages */}
                <div className="chat-messages" style={{ flex: 1, padding: '20px' }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                            <Loader className="spin" size={32} style={{ color: 'var(--primary-500)' }} />
                        </div>
                    ) : messages.map(msg => (
                        <div key={msg.id} className={`chat-message ${msg.role === 'user' ? 'user' : 'ai'}`}>
                            <div className="chat-avatar">
                                {msg.role === 'ai' ? <Bot size={16} /> : <User size={16} />}
                            </div>
                            <div style={{ position: 'relative' }}>
                                <div className="chat-bubble">
                                    {msg.content.split('\n').map((line, i) => {
                                        const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                                        return <p key={i} style={{ margin: '2px 0' }} dangerouslySetInnerHTML={{ __html: formatted }} />;
                                    })}
                                    {msg.voiceUrl && (
                                        <button 
                                            className="voice-play-btn" 
                                            onClick={() => playVoice(msg.voiceUrl)}
                                            style={{
                                                marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
                                                fontSize: '0.7rem', padding: '4px 8px', borderRadius: 6,
                                                background: 'rgba(255,255,255,0.2)', border: 'none', color: 'inherit',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Volume2 size={12} /> Listen
                                        </button>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 4, padding: '0 4px' }}>
                                    {msg.timestamp}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="chat-message ai">
                            <div className="chat-avatar"><Bot size={16} /></div>
                            <div className="chat-bubble" style={{ display: 'flex', gap: 4, padding: '16px 20px' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-tertiary)', animation: 'pulse 1.4s infinite', animationDelay: '0s' }}></span>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-tertiary)', animation: 'pulse 1.4s infinite', animationDelay: '0.2s' }}></span>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-tertiary)', animation: 'pulse 1.4s infinite', animationDelay: '0.4s' }}></span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Suggestions */}
                <div className="chat-suggestions">
                    {suggestions.map((s, i) => (
                        <button key={i} className="chat-chip" onClick={() => sendMessage(s)}>
                            {s}
                        </button>
                    ))}
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="chat-input-bar">
                    <input
                        type="text"
                        placeholder="Ask me anything about your finances..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        disabled={isTyping}
                    />
                    <button type="submit" className="btn btn-primary" disabled={!input.trim() || isTyping}>
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
}
