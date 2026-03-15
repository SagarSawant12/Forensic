import { useState, useRef, useEffect } from "react";
import { useInvestigation } from "@/contexts/InvestigationContext";
import { Navigate } from "react-router-dom";
import { Send, Bot, User, Search, Download, Trash2, MessageSquare, Brain, FileText, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { SUSPICIOUS_KEYWORDS, CRYPTO_WALLET_PATTERNS, isInternationalNumber } from "@/lib/types";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "query" | "analysis" | "summary";
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

const SUGGESTIONS = [
  "Show chats mentioning Bitcoin",
  "Find foreign contacts",
  "Show suspicious transactions",
  "Find crypto wallet addresses",
  "List all WhatsApp messages",
  "Show call logs with longest duration",
  "Analyze communication patterns",
  "Generate investigation summary",
  "Find location-based evidence",
  "Show timeline of key events"
];

export default function AIChatPage() {
  const { data, searchChats, suspiciousItems, foreignNumbers, cryptoWallets } = useInvestigation();
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const stored = localStorage.getItem("forensix-conversations");
    return stored ? JSON.parse(stored).map((conv: any) => ({
      ...conv,
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt),
      messages: conv.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    })) : [];
  });
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  // Save conversations to localStorage
  useEffect(() => {
    localStorage.setItem("forensix-conversations", JSON.stringify(conversations));
  }, [conversations]);

  if (!data) return <Navigate to="/" replace />;

  const createNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: "New Investigation",
      messages: [{
        role: "assistant",
        content: "🔍 **FORENSIX AI Analysis Ready**\n\nI can help you investigate the loaded forensic data with advanced analysis capabilities.\n\n*Try asking about:*\n- Communication patterns and anomalies\n- Timeline analysis\n- Location-based evidence\n- Suspicious activity detection\n- Data correlations and insights",
        timestamp: new Date(),
        type: "analysis"
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
  };

  const updateConversation = (id: string, updates: Partial<Conversation>) => {
    setConversations(prev => prev.map(conv =>
      conv.id === id ? { ...conv, ...updates, updatedAt: new Date() } : conv
    ));
  };

  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  };

  const addMessageToConversation = (conversationId: string, message: Message) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        const updatedMessages = [...conv.messages, message];
        const title = updatedMessages.length > 1 && conv.title === "New Investigation"
          ? updatedMessages[1].content.slice(0, 50) + "..."
          : conv.title;
        return {
          ...conv,
          messages: updatedMessages,
          title,
          updatedAt: new Date()
        };
      }
      return conv;
    }));
  };

  const advancedProcessQuery = async (query: string): Promise<string> => {
    const q = query.toLowerCase();
    setIsAnalyzing(true);

    try {
      // Enhanced crypto analysis
      if (q.includes("wallet") || q.includes("crypto") || q.includes("bitcoin") || q.includes("blockchain")) {
        const walletChats = data.chats.filter(c => {
          const msg = c.message.toLowerCase();
          return CRYPTO_WALLET_PATTERNS.some(p => p.test(c.message)) ||
                 msg.includes("bitcoin") || msg.includes("btc") || msg.includes("crypto") ||
                 msg.includes("wallet") || msg.includes("ethereum") || msg.includes("eth") ||
                 msg.includes("blockchain") || msg.includes("transaction");
        });

        if (walletChats.length === 0) return "No cryptocurrency-related communications found.";

        let result = `**🔍 Advanced Crypto Analysis**\n\n**Found ${walletChats.length} crypto-related messages:**\n\n`;

        // Analyze patterns
        const platforms = [...new Set(walletChats.map(c => c.platform).filter(Boolean))];
        const timeDistribution = walletChats.reduce((acc, chat) => {
          const hour = new Date(chat.timestamp).getHours();
          acc[hour] = (acc[hour] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);

        result += `**📊 Analysis Insights:**\n`;
        result += `- Platforms used: ${platforms.join(", ") || "N/A"}\n`;
        result += `- Most active hours: ${Object.entries(timeDistribution).sort(([,a], [,b]) => b - a).slice(0, 3).map(([hour, count]) => `${hour}:00 (${count})`).join(", ")}\n\n`;

        walletChats.slice(0, 10).forEach((c, i) => {
          result += `**${i + 1}.** \`${c.from}\` → \`${c.to}\`\n> ${c.message}\n> _${c.timestamp} · ${c.platform}_\n\n`;
        });

        if (cryptoWallets.length > 0) {
          result += `**💰 Detected wallet addresses:**\n`;
          cryptoWallets.forEach(w => { result += `- \`${w}\`\n`; });
        }
        return result;
      }

      // Communication pattern analysis
      if (q.includes("pattern") || q.includes("communication") || q.includes("behavior") || q.includes("analyze")) {
        const chatStats = data.chats.reduce((acc, chat) => {
          const from = chat.from;
          const to = chat.to;
          const platform = chat.platform || "unknown";

          if (!acc[from]) acc[from] = { sent: 0, received: 0, platforms: new Set(), contacts: new Set() };
          if (!acc[to]) acc[to] = { sent: 0, received: 0, platforms: new Set(), contacts: new Set() };

          acc[from].sent++;
          acc[from].platforms.add(platform);
          acc[from].contacts.add(to);

          acc[to].received++;
          acc[to].platforms.add(platform);
          acc[to].contacts.add(from);

          return acc;
        }, {} as Record<string, { sent: number; received: number; platforms: Set<string>; contacts: Set<string> }>);

        let result = `**🧠 Communication Pattern Analysis**\n\n`;

        const topCommunicators = Object.entries(chatStats)
          .sort(([,a], [,b]) => (b.sent + b.received) - (a.sent + a.received))
          .slice(0, 5);

        result += `**📈 Top Communicators:**\n`;
        topCommunicators.forEach(([contact, stats], i) => {
          result += `${i + 1}. **${contact}**: ${stats.sent} sent, ${stats.received} received (${stats.contacts.size} contacts)\n`;
        });

        result += `\n**🔗 Network Insights:**\n`;
        result += `- Total unique contacts: ${Object.keys(chatStats).length}\n`;
        result += `- Most used platforms: ${[...new Set(data.chats.map(c => c.platform).filter(Boolean))].join(", ")}\n`;

        // Detect unusual patterns
        const unusualPatterns = Object.entries(chatStats).filter(([, stats]) =>
          stats.sent > stats.received * 3 || stats.contacts.size > 10
        );

        if (unusualPatterns.length > 0) {
          result += `\n**⚠️ Unusual Patterns Detected:**\n`;
          unusualPatterns.forEach(([contact, stats]) => {
            result += `- ${contact}: High activity (${stats.sent} sent vs ${stats.received} received)\n`;
          });
        }

        return result;
      }

      // Timeline analysis
      if (q.includes("timeline") || q.includes("chronology") || q.includes("sequence")) {
        const events = [
          ...data.chats.map(c => ({ type: "chat", timestamp: c.timestamp, from: c.from, to: c.to, content: c.message })),
          ...data.calls.map(c => ({ type: "call", timestamp: c.timestamp, from: c.from, to: c.to, content: `${c.duration}s call` })),
          ...data.images.filter(i => i.timestamp).map(i => ({ type: "image", timestamp: i.timestamp!, from: i.device || "unknown", to: "", content: i.filename }))
        ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        let result = `**⏰ Timeline Analysis**\n\n**Key Events Chronology:**\n\n`;

        events.slice(-20).forEach((event, i) => {
          const time = new Date(event.timestamp).toLocaleString();
          result += `**${events.length - 19 + i}.** ${time} - ${event.type.toUpperCase()}\n`;
          result += `${event.from}${event.to ? ` → ${event.to}` : ""}: ${event.content}\n\n`;
        });

        // Time-based insights
        const hourDistribution = events.reduce((acc, event) => {
          const hour = new Date(event.timestamp).getHours();
          acc[hour] = (acc[hour] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);

        const peakHour = Object.entries(hourDistribution).sort(([,a], [,b]) => b - a)[0];
        result += `**📊 Timeline Insights:**\n`;
        result += `- Peak activity hour: ${peakHour[0]}:00 (${peakHour[1]} events)\n`;
        result += `- Total events analyzed: ${events.length}\n`;

        return result;
      }

      // Location-based analysis
      if (q.includes("location") || q.includes("gps") || q.includes("geographic") || q.includes("place")) {
        const locationImages = data.images.filter(i => i.location);

        if (locationImages.length === 0) return "No location data found in image metadata.";

        let result = `**📍 Geographic Analysis**\n\n**Found ${locationImages.length} images with location data:**\n\n`;

        // Group by location proximity
        const locationGroups = locationImages.reduce((acc, img) => {
          const key = `${Math.round(img.location!.lat * 10) / 10}_${Math.round(img.location!.lng * 10) / 10}`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(img);
          return acc;
        }, {} as Record<string, typeof locationImages>);

        result += `**🗺️ Location Clusters:**\n`;
        Object.entries(locationGroups).forEach(([key, images], i) => {
          const [lat, lng] = key.split("_").map(Number);
          result += `${i + 1}. **Cluster at ${lat.toFixed(2)}, ${lng.toFixed(2)}** (${images.length} images)\n`;
          images.slice(0, 3).forEach(img => {
            result += `   - ${img.filename} (${img.device || "unknown device"})\n`;
          });
          result += "\n";
        });

        // Time-based location analysis
        const timeLocation = locationImages
          .filter(img => img.timestamp)
          .sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime());

        if (timeLocation.length > 1) {
          result += `**⏱️ Movement Analysis:**\n`;
          result += `- First location: ${timeLocation[0].timestamp} at ${timeLocation[0].location!.lat.toFixed(4)}, ${timeLocation[0].location!.lng.toFixed(4)}\n`;
          result += `- Last location: ${timeLocation[timeLocation.length - 1].timestamp} at ${timeLocation[timeLocation.length - 1].location!.lat.toFixed(4)}, ${timeLocation[timeLocation.length - 1].location!.lng.toFixed(4)}\n`;
        }

        return result;
      }

      // Investigation summary
      if (q.includes("summary") || q.includes("overview") || q.includes("report")) {
        let result = `**📋 Investigation Summary Report**\n\n`;

        result += `**📊 Data Overview:**\n`;
        result += `- Total records: ${data.rawRecords.length}\n`;
        result += `- Chat messages: ${data.chats.length}\n`;
        result += `- Call records: ${data.calls.length}\n`;
        result += `- Contacts: ${data.contacts.length}\n`;
        result += `- Images with location: ${data.images.filter(i => i.location).length}\n\n`;

        result += `**🚨 Security Findings:**\n`;
        result += `- Suspicious items: ${suspiciousItems.length}\n`;
        result += `- Foreign numbers: ${foreignNumbers.length}\n`;
        result += `- Crypto wallets: ${cryptoWallets.length}\n\n`;

        if (suspiciousItems.length > 0) {
          result += `**⚠️ Critical Findings:**\n`;
          suspiciousItems.slice(0, 5).forEach((item, i) => {
            const record = item.record as any;
            result += `${i + 1}. ${record.from} → ${record.to}: ${item.reason}\n`;
          });
        }

        return result;
      }

      // Fallback to original search
      const results = searchChats(query);
      if (results.length > 0) {
        let result = `**🔍 Search Results for "${query}"**\n\n**Found ${results.length} matching records:**\n\n`;
        results.slice(0, 15).forEach((c, i) => {
          result += `**${i + 1}.** \`${c.from}\` → \`${c.to}\`\n> ${c.message}\n> _${c.timestamp} · ${c.platform}_\n\n`;
        });
        return result;
      }

      return `No results found for "${query}". Try asking about patterns, locations, timelines, or specific analysis types.`;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSend = async (text?: string) => {
    const query = text || input.trim();
    if (!query || isAnalyzing) return;

    if (!activeConversation) {
      createNewConversation();
      // Wait for state update
      setTimeout(() => {
        if (activeConversationId) {
          addMessageToConversation(activeConversationId, { role: "user", content: query, timestamp: new Date(), type: "query" });
        }
      }, 0);
    } else {
      addMessageToConversation(activeConversation.id, { role: "user", content: query, timestamp: new Date(), type: "query" });
    }

    setInput("");

    // Process query
    const response = await advancedProcessQuery(query);
    const responseMessage: Message = {
      role: "assistant",
      content: response,
      timestamp: new Date(),
      type: query.includes("pattern") || query.includes("analyze") ? "analysis" : "query"
    };

    setTimeout(() => {
      if (activeConversationId) {
        addMessageToConversation(activeConversationId, responseMessage);
      }
    }, 100);
  };

  const exportConversation = () => {
    if (!activeConversation) return;

    const content = activeConversation.messages
      .map(msg => `${msg.role.toUpperCase()} (${msg.timestamp.toLocaleString()}):\n${msg.content}\n\n`)
      .join("---\n");

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(content));
    element.setAttribute("download", `conversation_${activeConversation.title.replace(/[^a-z0-9]/gi, "_")}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Conversation exported");
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <Button onClick={createNewConversation} className="w-full gap-2">
            <MessageSquare className="h-4 w-4" />
            New Analysis
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                  activeConversationId === conv.id
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-secondary"
                }`}
                onClick={() => setActiveConversationId(conv.id)}
              >
                <div className="font-medium text-sm truncate">{conv.title}</div>
                <div className="text-xs text-muted-foreground">
                  {conv.messages.length} messages · {conv.updatedAt.toLocaleDateString()}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold font-mono text-primary cyber-text-glow">
              AI Investigation Assistant
            </h1>
          </div>
          {activeConversation && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportConversation}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {data.rawRecords.length} records loaded
          </p>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {activeConversation ? (
            <div className="max-w-4xl mx-auto space-y-4">
              <AnimatePresence>
                {activeConversation.messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="shrink-0 h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center cyber-border">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg p-4 text-sm whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-primary/10 cyber-border"
                          : "bg-card border border-border"
                      }`}
                    >
                      {msg.type === "analysis" && (
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          <Badge variant="outline" className="text-xs">Analysis</Badge>
                        </div>
                      )}
                      {msg.content.split(/(\*\*.*?\*\*|`.*?`|_.*?_|> .*)/g).map((part, j) => {
                        if (part.startsWith("**") && part.endsWith("**")) {
                          return <strong key={j}>{part.slice(2, -2)}</strong>;
                        }
                        if (part.startsWith("`") && part.endsWith("`")) {
                          return <code key={j} className="bg-secondary px-1 rounded text-primary font-mono text-xs">{part.slice(1, -1)}</code>;
                        }
                        if (part.startsWith("_") && part.endsWith("_")) {
                          return <em key={j} className="text-muted-foreground text-xs">{part.slice(1, -1)}</em>;
                        }
                        if (part.startsWith("> ")) {
                          return <span key={j} className="block border-l-2 border-primary/30 pl-2 my-1 text-foreground/80">{part.slice(2)}</span>;
                        }
                        return <span key={j}>{part}</span>;
                      })}
                    </div>
                    {msg.role === "user" && (
                      <div className="shrink-0 h-8 w-8 rounded-md bg-secondary flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="shrink-0 h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center cyber-border">
                    <Bot className="h-4 w-4 text-primary animate-pulse" />
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4 text-sm">
                    Analyzing data...
                  </div>
                </motion.div>
              )}
              <div ref={scrollRef} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Select a conversation or start a new analysis</p>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Suggestions */}
        {activeConversation && activeConversation.messages.length === 1 && (
          <div className="p-4 border-t border-border">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm text-muted-foreground mb-3">Try these analysis queries:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    disabled={isAnalyzing}
                    className="text-xs bg-secondary hover:bg-primary/10 text-muted-foreground hover:text-primary px-3 py-1.5 rounded-full border border-border hover:border-primary/30 transition-all font-mono disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="max-w-4xl mx-auto flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Ask about patterns, locations, timelines, or suspicious activity..."
              className="font-mono text-sm bg-secondary border-border focus:border-primary"
              disabled={isAnalyzing}
            />
            <Button onClick={() => handleSend()} size="icon" className="shrink-0" disabled={isAnalyzing || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
