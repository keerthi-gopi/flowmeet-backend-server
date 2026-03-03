"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X } from "lucide-react";

interface ChatMessage {
    id: string;
    text: string;
    sender: string;
    time: number;
    isLocal?: boolean;
}

interface ChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    localName: string;
}

export default function ChatPanel({
    isOpen,
    onClose,
    messages,
    onSendMessage,
    localName,
}: ChatPanelProps) {
    const [text, setText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const handleSend = () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        onSendMessage(trimmed);
        setText("");
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div
            className={`fixed top-0 right-0 h-full z-[60] transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
            style={{
                width: "min(360px, 100vw)",
                background: "var(--fm-bg-dark)",
                borderLeft: "1px solid var(--fm-border)",
            }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid var(--fm-border)" }}
            >
                <h3
                    className="text-lg font-semibold"
                    style={{ fontFamily: "var(--fm-font-display)" }}
                >
                    Chat
                </h3>
                <button
                    onClick={onClose}
                    className="toolbar-btn w-8 h-8"
                    aria-label="Close chat"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: "calc(100% - 130px)" }}>
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-50">
                        <p className="text-lg mb-1">No messages yet</p>
                        <p style={{ color: "var(--fm-text-muted)" }}>Say hello! 👋</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.sender === localName ? "items-end" : "items-start"}`}>
                            <div className="flex items-baseline gap-2 mb-1">
                                <span
                                    className="text-xs font-medium"
                                    style={{ color: msg.sender === localName ? "var(--fm-primary-hover)" : "var(--fm-accent)" }}
                                >
                                    {msg.sender === localName ? "You" : msg.sender}
                                </span>
                                <span className="text-xs" style={{ color: "var(--fm-text-dim)" }}>
                                    {formatTime(msg.time)}
                                </span>
                            </div>
                            <div
                                className="px-3 py-2 max-w-[85%] text-sm"
                                style={{
                                    background: msg.sender === localName ? "var(--fm-primary)" : "var(--fm-bg-surface)",
                                    borderRadius:
                                        msg.sender === localName
                                            ? "var(--fm-radius-md) var(--fm-radius-md) 4px var(--fm-radius-md)"
                                            : "var(--fm-radius-md) var(--fm-radius-md) var(--fm-radius-md) 4px",
                                    color: "var(--fm-text-primary)",
                                    wordBreak: "break-word",
                                }}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
                className="absolute bottom-0 left-0 right-0 p-3 flex gap-2"
                style={{
                    background: "var(--fm-bg-dark)",
                    borderTop: "1px solid var(--fm-border)",
                }}
            >
                <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none"
                    style={{
                        background: "var(--fm-bg-surface)",
                        border: "1px solid var(--fm-border)",
                        color: "var(--fm-text-primary)",
                        fontFamily: "var(--fm-font-body)",
                    }}
                    aria-label="Chat message input"
                />
                <button
                    onClick={handleSend}
                    disabled={!text.trim()}
                    className="toolbar-btn w-10 h-10 disabled:opacity-30"
                    style={{ background: text.trim() ? "var(--fm-primary)" : undefined }}
                    aria-label="Send message"
                >
                    <Send size={16} />
                </button>
            </div>
        </div>
    );
}
