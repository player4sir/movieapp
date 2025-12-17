'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSiteSettings, invalidateSiteSettingsCache } from '@/hooks/useSiteSettings';
import Link from 'next/link';

interface FAQItem {
    id: string;
    question: string;
    answer: string;
}

export default function FAQSettingsPage() {
    const router = useRouter();
    const { settings, loading: loadingSettings } = useSiteSettings();
    const [faqs, setFaqs] = useState<FAQItem[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (settings.faq_config) {
            try {
                setFaqs(JSON.parse(settings.faq_config));
            } catch (e) {
                console.error('Failed to parse FAQ config', e);
                setFaqs([]);
            }
        } else {
            // Init with existing defaults if empty for easier start
            setFaqs([
                { id: '1', question: '如何充值金币？', answer: '点击底部导航栏的【我的】，进入个人中心后点击【我的钱包】，选择相应的充值套餐即可进行充值。' },
                { id: '2', question: '视频播放卡顿怎么办？', answer: '请尝试切换视频线路或清晰度。如果依然卡顿，请检查您的网络连接。' },
            ]);
        }
    }, [settings.faq_config]);

    const handleAdd = () => {
        const newId = Date.now().toString();
        setFaqs([...faqs, { id: newId, question: '', answer: '' }]);
    };

    const handleDelete = (id: string) => {
        setFaqs(faqs.filter(f => f.id !== id));
    };

    const handleChange = (id: string, field: 'question' | 'answer', value: string) => {
        setFaqs(faqs.map(f => f.id === id ? { ...f, [field]: value } : f));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch('/api/admin/site-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    faq_config: JSON.stringify(faqs)
                }),
            });

            if (!response.ok) throw new Error('Failed to save');

            // Invalidate cache immediately
            invalidateSiteSettingsCache();

            // Refresh or Notify success
            alert('保存成功');
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('保存失败');
        } finally {
            setSaving(false);
        }
    };

    const handleInsertImage = (id: string, currentAnswer: string) => {
        const url = window.prompt("请输入图片链接 (URL):");
        if (url) {
            const markdownImage = `![图片](${url})`;
            // Append to current answer
            const newAnswer = currentAnswer ? `${currentAnswer}\n${markdownImage}` : markdownImage;
            handleChange(id, 'answer', newAnswer);
        }
    };

    if (loadingSettings) {
        return <div className="p-8 text-center text-muted-foreground">加载中...</div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/console-x9k2m/settings" className="p-2 hover:bg-surface-secondary rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">问答助手配置</h1>
                    <p className="text-sm text-muted-foreground mt-1">配置前台智能助手的预设问题和自动回复。</p>
                </div>
            </div>

            <div className="space-y-4">
                {faqs.map((faq, index) => (
                    <div key={faq.id} className="bg-surface border border-surface-secondary rounded-xl p-4 space-y-3 relative group">
                        <button
                            onClick={() => handleDelete(faq.id)}
                            className="absolute top-4 right-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            title="删除此条问答"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-muted-foreground">问题 #{index + 1}</label>
                            <input
                                type="text"
                                value={faq.question}
                                onChange={(e) => handleChange(faq.id, 'question', e.target.value)}
                                placeholder="例如：如何充值？"
                                className="w-full px-4 py-2 bg-surface-secondary/50 border border-transparent focus:border-primary rounded-lg outline-none transition-all placeholder:text-muted-foreground/50"
                            />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-muted-foreground">回答内容</label>
                                <button
                                    onClick={() => handleInsertImage(faq.id, faq.answer)}
                                    className="text-xs px-2 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors flex items-center gap-1"
                                    title="插入图片链接"
                                >
                                    <span>🖼️ 插图</span>
                                </button>
                            </div>
                            <textarea
                                value={faq.answer}
                                onChange={(e) => handleChange(faq.id, 'answer', e.target.value)}
                                placeholder="请输入自动回复的内容..."
                                rows={2}
                                className="w-full px-4 py-2 bg-surface-secondary/50 border border-transparent focus:border-primary rounded-lg outline-none transition-all placeholder:text-muted-foreground/50 resize-y min-h-[80px]"
                            />
                            {/* Image Preview */}
                            {(() => {
                                const imgMatch = faq.answer.match(/!\[.*?\]\((.*?)\)/);
                                if (imgMatch) {
                                    return (
                                        <div className="mt-2 p-2 bg-surface-secondary/30 rounded-lg border border-dashed border-surface-secondary">
                                            <p className="text-xs text-muted-foreground mb-2">图片预览:</p>
                                            <img
                                                src={imgMatch[1]}
                                                alt="Preview"
                                                className="h-32 object-contain rounded-md bg-black/5 dark:bg-white/5"
                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                            />
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    </div>
                ))}

                <div className="flex items-center justify-between pt-4">
                    <button
                        onClick={handleAdd}
                        className="px-4 py-2 text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-2 font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        添加新问答
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-primary/20"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? '保存中...' : '保存配置'}
                    </button>
                </div>
            </div>
        </div>
    );
}
