'use client';

import { useState, useRef } from 'react';
import { Download, Upload, AlertTriangle, FileJson, CheckCircle2, Loader2 } from 'lucide-react';

export default function BackupPage() {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const response = await fetch('/api/admin/backup');
            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Extract filename from header or default
            const disposition = response.headers.get('content-disposition');
            let filename = `backup_${new Date().toISOString().split('T')[0]}.json`;
            if (disposition && disposition.includes('filename=')) {
                filename = disposition.split('filename=')[1].replace(/"/g, '');
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error(error);
            alert('Backup export failed');
        } finally {
            setIsExporting(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setImportFile(e.target.files[0]);
            setImportStatus(null);
        }
    };

    const handleImport = async () => {
        if (!importFile) return;

        setIsImporting(true);
        setShowConfirm(false);
        setImportStatus(null);

        try {
            const text = await importFile.text();
            const jsonData = JSON.parse(text);

            const response = await fetch('/api/admin/backup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(jsonData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Import failed');
            }

            setImportStatus({ success: true, message: result.message });
            setImportFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            console.error(error);
            setImportStatus({
                success: false,
                message: error instanceof Error ? error.message : 'Import failed'
            });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-foreground">数据库备份与迁移</h1>
                <p className="text-muted-foreground mt-1">导出完整数据库备份，或从备份文件恢复数据。</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Export Card */}
                <div className="bg-surface border border-surface-secondary rounded-xl p-6 flex flex-col items-center text-center space-y-4 shadow-sm">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <Download className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">导出备份</h3>
                        <p className="text-sm text-muted-foreground mt-1">下载当前数据库的所有数据为 JSON 文件。</p>
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {isExporting ? '正在导出...' : '下载备份文件'}
                    </button>
                </div>

                {/* Import Card */}
                <div className="bg-surface border border-surface-secondary rounded-xl p-6 flex flex-col items-center text-center space-y-4 shadow-sm">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
                        <Upload className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">恢复 / 迁移数据</h3>
                        <p className="text-sm text-muted-foreground mt-1">上传备份文件以覆盖当前数据库。</p>
                    </div>

                    <div className="w-full max-w-xs space-y-3">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-surface-secondary rounded-xl cursor-pointer hover:border-primary/50 hover:bg-surface-secondary/50 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <FileJson className="w-8 h-8 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    {importFile ? (
                                        <span className="font-semibold text-primary">{importFile.name}</span>
                                    ) : (
                                        <span className="text-center">点击选择或拖拽<br />备份文件 (.json)</span>
                                    )}
                                </p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json,application/json"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>
                    </div>

                    <button
                        onClick={() => setShowConfirm(true)}
                        disabled={!importFile || isImporting}
                        className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:bg-gray-400 flex items-center gap-2"
                    >
                        {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {isImporting ? '恢复中...' : '开始恢复数据'}
                    </button>

                    {importStatus && (
                        <div className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${importStatus.success ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                            {importStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                            {importStatus.message}
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-surface dark:bg-zinc-900 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-surface-secondary">
                        <div className="flex items-center gap-3 text-red-600">
                            <AlertTriangle className="w-8 h-8" />
                            <h3 className="text-xl font-bold">警告：数据将被覆盖</h3>
                        </div>

                        <p className="text-foreground/80">
                            您正在进行数据恢复操作。此操作将 <strong className="text-red-500">清除当前数据库中的所有现有数据</strong> 并替换为备份文件中的内容。
                        </p>
                        <p className="text-sm text-muted-foreground bg-surface-secondary p-3 rounded-lg">
                            文件名: <span className="font-mono text-foreground">{importFile?.name}</span><br />
                            请确保这是您想要恢复的正确文件。此操作不可撤销。
                        </p>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="px-4 py-2 rounded-lg border border-surface-secondary hover:bg-surface-secondary transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleImport}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                            >
                                确认覆盖并恢复
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
