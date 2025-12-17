'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Bot, User } from 'lucide-react';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { usePathname } from 'next/navigation';

interface FAQItem {
    id: string;
    question: string;
    answer: string;
}

interface ChatMessage {
    id: string;
    role: 'bot' | 'user';
    content: string;
    timestamp: number;
}

export function SupportWidget() {
    const pathname = usePathname();
    const { settings } = useSiteSettings();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [showQuestions, setShowQuestions] = useState(true);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Check if on pages where widget should be hidden (before early return to maintain hook order)
    const isAdminPage = pathname?.startsWith('/console-x9k2m');
    const isPlayPage = pathname?.startsWith('/play');
    const shouldHide = isAdminPage || isPlayPage;

    // Parse FAQ config
    const faqList: FAQItem[] = settings.faq_config
        ? JSON.parse(settings.faq_config)
        : [
            { id: '1', question: '如何充值金币？', answer: '点击底部导航栏的【我的】，进入个人中心后点击【我的钱包】，选择相应的充值套餐即可进行充值。' },
            { id: '2', question: '视频播放卡顿怎么办？', answer: '请尝试切换视频线路或清晰度。如果依然卡顿，请检查您的网络连接。' },
            { id: '3', question: '如何开通会员？', answer: '在【我的】页面点击【开通会员】，选择适合您的会员套餐进行支付即可。' },
        ];

    // Initial welcome message
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([
                {
                    id: 'welcome',
                    role: 'bot',
                    content: '您好！我是您的智能助手。请问有什么可以帮您？点击下方问题，我将为您解答。',
                    timestamp: Date.now(),
                }
            ]);
        }
    }, [isOpen, messages.length]);

    // Auto scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleQuestionClick = (faq: FAQItem) => {
        // Add user question
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: faq.question,
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMsg]);
        setShowQuestions(false);

        // Simulate bot typing/delay
        setTimeout(() => {
            const botMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'bot',
                content: faq.answer,
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, botMsg]);
            setShowQuestions(true);
        }, 600);
    };

    // Hide on admin console and play pages - AFTER all hooks
    if (shouldHide) {
        return null;
    }

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className={`fixed bottom-20 right-4 lg:bottom-10 lg:right-10 z-50 p-4 rounded-full shadow-lg transition-all transform hover:scale-105 ${isOpen ? 'bg-surface-secondary text-foreground rotate-90' : 'bg-primary text-primary-foreground'
                    }`}
                aria-label="在线客服"
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-36 right-4 lg:bottom-24 lg:right-10 z-50 w-[90vw] max-w-sm h-[500px] max-h-[70vh] bg-surface border border-surface-secondary rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-200">

                    {/* Header */}
                    <div className="p-4 bg-primary text-primary-foreground flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-full">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold">在线客服</h3>
                            <p className="text-xs opacity-90">智能助手全天候为您服务</p>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-secondary/30">
                        {messages.map(msg => (
                            <div
                                key={msg.id}
                                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'bot' ? 'bg-primary/10 text-primary' : 'bg-surface-secondary'
                                    }`}>
                                    {msg.role === 'bot' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                </div>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                                    : 'bg-surface border border-surface-secondary rounded-tl-none shadow-sm'
                                    }`}>
                                    {msg.content.split(/(!\[.*?\]\(.*?\))/g).map((part, i) => {
                                        const imgMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
                                        if (imgMatch) {
                                            return (
                                                <img
                                                    key={i}
                                                    src={imgMatch[2]}
                                                    alt={imgMatch[1]}
                                                    className="max-w-full max-h-48 object-contain rounded-lg my-2 border border-black/10 dark:border-white/10 cursor-zoom-in"
                                                    loading="lazy"
                                                    onClick={() => setPreviewImage(imgMatch[2])}
                                                />
                                            );
                                        }
                                        return <span key={i}>{part}</span>;
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Questions List (Footer) */}
                    <div className="p-4 border-t border-surface-secondary bg-surface">
                        {showQuestions && (
                            <div className="flex flex-wrap gap-2">
                                {faqList.map(faq => (
                                    <button
                                        key={faq.id}
                                        onClick={() => handleQuestionClick(faq)}
                                        className="text-xs px-3 py-1.5 bg-surface-secondary hover:bg-primary/10 hover:text-primary rounded-full border border-transparent hover:border-primary/20 transition-colors text-left truncate max-w-full"
                                    >
                                        {faq.question}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="mt-3 pt-3 border-t border-surface-secondary text-center">
                            <p className="text-xs text-muted-foreground">如问题未解决，请联系管理员邮箱或TG频道。</p>
                        </div>
                    </div>

                </div>
            )}
            {/* Image Preview Lightbox */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setPreviewImage(null)}
                >
                    <button
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 rounded-full p-2"
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <img
                        src={previewImage}
                        alt="Preview"
                        className="max-w-full max-h-screen object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
}
