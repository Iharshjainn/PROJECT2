import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Bot, 
  Send, 
  Plus, 
  Trash2, 
  Sparkles, 
  User, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Calculator,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

function parseInlineMarkdown(text) {
  if (!text) return text;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function renderFormattedContent(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-outside ml-4 space-y-1 my-1.5 text-slate-200">
          {currentList.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {parseInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (trimmed === '---' || trimmed === '***') {
      flushList();
      elements.push(<hr key={`hr-${idx}`} className="border-slate-800 my-2.5" />);
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${idx}`} className="text-sm font-bold text-emerald-400 mt-2.5 mb-1">
          {parseInlineMarkdown(trimmed.replace(/^###\s+/, ''))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${idx}`} className="text-base font-extrabold text-white mt-3 mb-1.5">
          {parseInlineMarkdown(trimmed.replace(/^##\s+/, ''))}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={`h1-${idx}`} className="text-lg font-extrabold text-white mt-3 mb-1.5">
          {parseInlineMarkdown(trimmed.replace(/^#\s+/, ''))}
        </h1>
      );
      return;
    }

    if (/^[\*\-]\s+/.test(trimmed)) {
      currentList.push(trimmed.replace(/^[\*\-]\s+/, ''));
      return;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushList();
      elements.push(
        <div key={`num-${idx}`} className="flex gap-2 my-1 pl-1">
          <span className="font-bold text-emerald-400">{trimmed.match(/^\d+\./)[0]}</span>
          <span className="leading-relaxed">{parseInlineMarkdown(trimmed.replace(/^\d+\.\s+/, ''))}</span>
        </div>
      );
      return;
    }

    if (!trimmed) {
      flushList();
      return;
    }

    flushList();
    elements.push(
      <p key={`p-${idx}`} className="my-1 leading-relaxed">
        {parseInlineMarkdown(trimmed)}
      </p>
    );
  });

  flushList();
  return elements;
}

export default function AiAdvisorPage() {
  const { user, currency } = useAuth();
  const [searchParams] = useSearchParams();
  const initialPrompt = searchParams.get('prompt') || '';

  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);

  const chatEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoadingConversations(true);
      const res = await api.get('/chat/conversations');
      setConversations(res.data || []);
      if (res.data && res.data.length > 0) {
        selectConversation(res.data[0].id);
      } else {
        // Start fresh
        startNewConversation();
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const selectConversation = async (convId) => {
    setCurrentConvId(convId);
    try {
      const res = await api.get(`/chat/conversations/${convId}/messages`);
      setMessages(res.data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const startNewConversation = () => {
    setCurrentConvId(null);
    setMessages([]);
  };

  // If initialPrompt query parameter was provided (e.g. from Dashboard click)
  useEffect(() => {
    if (initialPrompt && !sending) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSend = async (messageText) => {
    const text = (messageText || inputMessage).trim();
    if (!text || sending) return;

    setInputMessage('');
    setSending(true);

    // Optimistic user message
    const tempUserMsg = {
      id: 'temp_' + Date.now(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await api.post('/chat/message', {
        conversation_id: currentConvId,
        message: text
      });

      const { conversation_id, content, structured_data, suggested_follow_ups, message_id } = res.data;

      // Update current conversation ID if it was newly created
      if (!currentConvId && conversation_id) {
        setCurrentConvId(conversation_id);
        fetchConversations();
      }

      // Add assistant response
      setMessages(prev => [
        ...prev,
        {
          id: message_id,
          role: 'assistant',
          content,
          structured_data,
          suggested_follow_ups,
          created_at: new Date().toISOString()
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          role: 'assistant',
          content: 'Sorry, I encountered an issue consulting your financial intelligence layer. Please try asking again.',
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation thread?')) return;
    try {
      await api.delete(`/chat/conversations/${convId}`);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (currentConvId === convId) {
        startNewConversation();
      }
    } catch {
      alert('Failed to delete conversation.');
    }
  };

  const suggestedPrompts = [
    "Analyze my spending breakdown",
    "Can I afford an iPhone for ₹80,000?",
    "Where am I overspending the most?",
    "What if my rent increases by ₹5,000?",
    "What are my bad financial habits?",
    "How can I improve my financial health score?"
  ];

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col md:flex-row gap-4 animate-fadeIn">
      {/* Sidebar: Conversation History */}
      <div className="w-full md:w-64 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between overflow-hidden flex-shrink-0">
        <div className="space-y-3 overflow-hidden flex flex-col flex-1">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Conversations</span>
            <button
              onClick={startNewConversation}
              className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20 text-xs flex items-center gap-1"
              title="New Chat"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          {/* List of threads */}
          <div className="space-y-1 overflow-y-auto flex-1 pr-1">
            {conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between group cursor-pointer ${
                  currentConvId === conv.id
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{conv.title || 'Conversation'}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition-opacity"
                  title="Delete chat"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}

            {conversations.length === 0 && !loadingConversations && (
              <div className="text-center py-6 text-xs text-slate-500">
                No past chat threads yet.
              </div>
            )}
          </div>
        </div>

        {/* AI grounding reminder */}
        <div className="pt-3 border-t border-slate-800/80 text-[10px] text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Authoritative Grounding</span>
          </div>
          <p className="leading-tight text-slate-400">
            Calculations are computed by Python. Gemini interprets and explains the results.
          </p>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-sm">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>AI Financial Advisor</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                  Connected
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Contextual intelligence over your actual financial records</p>
            </div>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto p-4 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">How can I help you today?</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Ask about your spending, purchase affordability, what-if scenarios, or how to boost your 0-100 financial health score.
                </p>
              </div>

              {/* Starter Prompts */}
              <div className="w-full space-y-2 pt-2">
                {suggestedPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p)}
                    className="w-full text-left p-2.5 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-xs text-slate-300 hover:text-white flex items-center justify-between transition-all group"
                  >
                    <span>"{p}"</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div 
                  key={msg.id || index}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex-shrink-0 flex items-center justify-center text-slate-950 font-bold mt-1 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[75%] space-y-2.5`}>
                    <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                      isUser 
                        ? 'bg-emerald-600 text-white rounded-br-none' 
                        : 'bg-slate-950/90 text-slate-200 border border-slate-800/80 rounded-bl-none'
                    }`}>
                      {/* Formatted body */}
                      <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
                        {isUser ? (
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        ) : (
                          renderFormattedContent(msg.content)
                        )}
                      </div>

                      {/* Authoritative Scenario Card if attached */}
                      {msg.structured_data && (
                        <div className="mt-3 p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                          <div className="flex items-center justify-between font-bold text-white border-b border-slate-800 pb-2">
                            <span>Authoritative Calculation: {msg.structured_data.title}</span>
                            <span className={`px-2 py-0.5 rounded uppercase text-[10px] ${
                              msg.structured_data.status === 'affordable' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              msg.structured_data.status === 'caution' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}>
                              {msg.structured_data.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                            <div>
                              <span className="text-slate-400 block">Emergency Buffer (Before):</span>
                              <span className="font-bold text-white">
                                {msg.structured_data.metrics_before?.emergency_months ?? '-'} months
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Emergency Buffer (After):</span>
                              <span className="font-bold text-white">
                                {msg.structured_data.metrics_after?.emergency_months ?? '-'} months
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Follow up pills */}
                    {!isUser && msg.suggested_follow_ups && msg.suggested_follow_ups.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.suggested_follow_ups.map((q, qIdx) => (
                          <button
                            key={qIdx}
                            onClick={() => handleSend(q)}
                            className="text-[11px] px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700/80 text-emerald-300 border border-slate-700 rounded-lg transition-colors text-left"
                          >
                            ↳ {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0 flex items-center justify-center text-slate-300 font-bold mt-1 text-xs">
                      {(user?.user_metadata?.full_name || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {sending && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex-shrink-0 flex items-center justify-center text-slate-950 font-bold mt-1 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl rounded-bl-none text-xs text-slate-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Consulting Python calculation engine & Gemini...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/60">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask a question or describe a hypothetical scenario (e.g. Can I afford an ₹80,000 purchase?)..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={sending}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || sending}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl font-bold transition-all disabled:opacity-40 flex items-center justify-center shadow-md shadow-emerald-500/10"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
