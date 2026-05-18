import React, { useState, useRef, useEffect } from "react";
import { Copy, Check, Moon, Sun, Loader2, Settings, Eye, EyeOff, X } from "lucide-react";
import { translations, LanguageData } from "./i18n";
import { GoogleGenAI } from "@google/genai";

type SupportLang = "en" | "fr" | "es" | "it" | "de" | "pt";
type SourceLang = SupportLang | "auto" | "latin" | "pt" | "ar";
type TargetLang = SupportLang;

const sourceLanguages = [
  { value: "auto", labelEn: "Auto-detect" },
  { value: "es", labelEn: "Spanish" },
  { value: "en", labelEn: "English" },
  { value: "fr", labelEn: "French" },
  { value: "it", labelEn: "Italian" },
  { value: "de", labelEn: "German" },
  { value: "latin", labelEn: "Latin" },
  { value: "pt", labelEn: "Portuguese" },
  { value: "ar", labelEn: "Arabic" },
];

const targetLanguages = [
  { value: "fr", labelEn: "French" },
  { value: "en", labelEn: "English" },
  { value: "es", labelEn: "Spanish" },
  { value: "it", labelEn: "Italian" },
  { value: "de", labelEn: "German" },
  { value: "pt", labelEn: "Portuguese" },
];

export default function App() {
  const [uiLang, setUiLang] = useState<SupportLang>(() => (localStorage.getItem("verbumflow_ui_lang") as SupportLang) || "en");
  const [sourceLang, setSourceLang] = useState<SourceLang>(() => (localStorage.getItem("sourceLang") as SourceLang) || "auto");
  const [targetLang, setTargetLang] = useState<TargetLang>(() => (localStorage.getItem("targetLang") as TargetLang) || "en");

  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem("darkMode") === "true");
  
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem("verbumflow_gemini_key") || "");
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  const [showKeyPassword, setShowKeyPassword] = useState(false);
  const [keySavedMessage, setKeySavedMessage] = useState(false);
  const [legalModal, setLegalModal] = useState<"mentions" | "privacy" | "rgaa" | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState<"idle" | "uploading" | "polling" | "transcribing" | "translating" | "summarizing">("idle");
  const [pollAttempt, setPollAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [transcription, setTranscription] = useState("");
  const [translation, setTranslation] = useState("");
  const [summary, setSummary] = useState("");
  const [activeTab, setActiveTab] = useState<"transcription" | "translation" | "summary">("transcription");
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t: LanguageData = translations[uiLang] || translations["en"];

  useEffect(() => {
    localStorage.setItem("verbumflow_ui_lang", uiLang);
    localStorage.setItem("sourceLang", sourceLang);
    localStorage.setItem("targetLang", targetLang);
  }, [uiLang, sourceLang, targetLang]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);
  
  useEffect(() => {
    if (showSettings) {
      setTempApiKey(apiKey);
      setKeySavedMessage(false);
      setShowKeyPassword(false);
    }
  }, [showSettings, apiKey]);

  const saveSettings = () => {
    setApiKey(tempApiKey);
    if (tempApiKey) {
      localStorage.setItem("verbumflow_gemini_key", tempApiKey);
    } else {
      localStorage.removeItem("verbumflow_gemini_key");
    }
    setKeySavedMessage(true);
    setTimeout(() => {
      setKeySavedMessage(false);
      setShowSettings(false);
    }, 1500);
  };

  const clearKey = () => {
    setApiKey("");
    setTempApiKey("");
    localStorage.removeItem("verbumflow_gemini_key");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      checkAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      checkAndSetFile(e.target.files[0]);
    }
  };

  const checkAndSetFile = (selectedFile: File) => {
    if (selectedFile.size > 100 * 1024 * 1024) {
      setError(t.fileTooLarge);
      return;
    }
    setFile(selectedFile);
    setError(null);
  };

  const processAudio = async () => {
    if (!file) return;

    if (!apiKey) {
      setError(t.noApiKeyError);
      setShowSettings(true);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgressStep("uploading");
    setTranscription("");
    setTranslation("");
    setSummary("");
    setActiveTab("transcription");

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });

      let uploadResult;
      try {
        uploadResult = await ai.files.upload({
          file: file,
          config: { mimeType: file.type || "audio/mp3" },
        });
      } catch(err: any) {
        throw new Error(t.fileUploadFailed + err.message);
      }

      setProgressStep("polling");
      let isFileReady = false;
      let attempt = 0;
      const MAX_ATTEMPTS = 30;

      while (!isFileReady && attempt < MAX_ATTEMPTS) {
        attempt++;
        setPollAttempt(attempt);

        const fileInfo = await ai.files.get({ name: uploadResult.name });

        if (fileInfo.state === "ACTIVE") {
          isFileReady = true;
          break;
        } else if (fileInfo.state === "FAILED") {
          throw new Error(t.fileFailedError);
        }

        // Wait 2 seconds
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (!isFileReady) {
        throw new Error(t.fileTimeoutError);
      }

      setPollAttempt(0);
      setProgressStep("transcribing");

      const isAutoDetect = sourceLang === "auto";
      const srcLangText = isAutoDetect ? "its original language" : sourceLang;

      const systemInstruction = 
        "You are an expert translator and theologian. You adopt a respectful, formal register adapted to religious/theological speech.";

      const prompt = `This audio is in ${srcLangText}.
Please:
1. Transcribe the full audio with timestamps every 30 seconds in format [HH:MM:SS]
2. Translate the full content into ${targetLang}, preserving oratorical style and theological terminology, keeping timestamps
3. Write a structured summary in ${targetLang} with: Central Theme, Main Points, Notable Quotes (with timestamps), Conclusion, Observations.
Separate the three sections EXACTLY with: \n\n--- TRANSCRIPTION ---\n\n, \n\n--- TRANSLATION ---\n\n, \n\n--- SUMMARY ---\n\n`;

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-2.0-flash",
        contents: [
          { fileData: { fileUri: uploadResult.uri, mimeType: uploadResult.mimeType } },
          { text: prompt }
        ],
        config: {
          systemInstruction: systemInstruction,
        }
      });

      let fullText = "";
      
      for await (const chunk of responseStream) {
        if (chunk.text) {
          fullText += chunk.text;
          
          let t_temp = fullText;
          let tl_temp = "";
          let sum_temp = "";

          if (fullText.includes("--- TRANSLATION ---")) {
            setProgressStep("translating");
            setActiveTab("translation");
            const parts = fullText.split("--- TRANSLATION ---");
            t_temp = parts[0].replace("--- TRANSCRIPTION ---", "").trim();
            
            if (parts[1].includes("--- SUMMARY ---")) {
              setProgressStep("summarizing");
              setActiveTab("summary");
              const subParts = parts[1].split("--- SUMMARY ---");
              tl_temp = subParts[0].trim();
              sum_temp = subParts[1].trim();
            } else {
              tl_temp = parts[1].trim();
            }
          } else {
            t_temp = fullText.replace("--- TRANSCRIPTION ---", "").trim();
          }

          setTranscription(t_temp);
          setTranslation(tl_temp);
          setSummary(sum_temp);
        }
      }

      setProgressStep("idle");

      // Cleanup
      try {
        if (uploadResult && uploadResult.name) {
          await ai.files.delete({ name: uploadResult.name });
        }
      } catch (e) {
        console.error("Cleanup error", e);
      }
    } catch (err: any) {
      console.error(err);
      setError(err instanceof Error ? err.message : t.errorGeneric);
      setProgressStep("idle");
    } finally {
      setIsProcessing(false);
    }
  };

  const getReadTime = (text: string) => {
    const chars = text.length;
    const words = chars / 5;
    const mins = Math.max(1, Math.ceil(words / 200));
    return mins;
  };

  const getCurrentTabContent = () => {
    if (activeTab === "transcription") return transcription;
    if (activeTab === "translation") return translation;
    return summary;
  };

  const currentTabContent = getCurrentTabContent();

  const handleCopy = () => {
    if (!currentTabContent) return;
    navigator.clipboard.writeText(currentTabContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!currentTabContent) return;
    const blob = new Blob([currentTabContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Sermon_${activeTab}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ContentTab = ({ content, placeholder }: { content: string, placeholder: string }) => {
    const lines = content.split('\n');
    return (
      <div className="max-w-3xl mx-auto space-y-6 text-slate-700 dark:text-slate-300 sermon-text w-full pb-8">
        {content ? lines.map((line, i) => {
          const match = line.match(/^(\[\d+:\d{2}:\d{2}\])\s*(.*)$/);
          if (match) {
            return (
              <div key={i} className="flex gap-4">
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 w-16 pt-1 shrink-0">{match[1]}</span>
                <p className="flex-1 leading-relaxed">{match[2]}</p>
              </div>
            );
          }
          if (!line.trim()) return null;
          return <div key={i} className="flex gap-4"><p className="flex-1 sm:ml-20 leading-relaxed">{line}</p></div>;
        }) : (
          <div className="h-full flex items-center justify-center text-slate-400 italic font-sans min-h-[200px]">
             {placeholder}
          </div>
        )}
      </div>
    );
  };

  const getWordsCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      {!apiKey && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2 flex items-center justify-center gap-2 text-sm text-yellow-800 dark:text-yellow-200 z-20 shrink-0">
          <span>{t.missingKeyWarning}</span>
          <button onClick={() => setShowSettings(true)} className="font-semibold underline hover:text-yellow-900 dark:hover:text-yellow-100">
            {t.openSettings}
          </button>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t.settings}</h2>
              <button onClick={() => setShowSettings(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label htmlFor="uiLangSelect" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.uiLabel}</label>
                <select
                  id="uiLangSelect"
                  value={uiLang}
                  onChange={(e) => setUiLang(e.target.value as SupportLang)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fr">Français</option>
                  <option value="es">Español</option>
                  <option value="de">Deutsch</option>
                  <option value="it">Italiano</option>
                  <option value="en">English</option>
                  <option value="pt">Português</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="apiKeyInput" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.apiKeyLabel}</label>
                <div className="relative">
                  <input
                    id="apiKeyInput"
                    type={showKeyPassword ? "text" : "password"}
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder={t.apiKeyPlaceholder}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyPassword(!showKeyPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showKeyPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.apiKeyStored}</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <button
                onClick={clearKey}
                className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-3 py-1.5"
              >
                {t.clearKey}
              </button>
              <div className="flex items-center gap-3">
                {keySavedMessage && <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1 font-medium"><Check size={16} /> {t.keySaved}</span>}
                <button
                  onClick={saveSettings}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
                >
                  {t.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="h-16 flex items-center justify-between px-4 sm:px-8 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0 shadow-sm z-10">
        <a href="#" aria-label="Retour à l'accueil" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">V</div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white hidden sm:block">
            Verbum<span className="font-light text-slate-500 dark:text-slate-400 italic">Flow</span>
          </h1>
        </a>
               <div className="flex items-center gap-2 sm:gap-4 text-xs font-medium">
          <div className="flex flex-col hidden sm:flex">
            <label htmlFor="sourceLangDesktop" className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{t.sourceLabel}</label>
            <select
              id="sourceLangDesktop"
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value as SourceLang)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none w-28 lg:w-32 text-slate-700 dark:text-slate-300"
            >
              {sourceLanguages.map(l => <option key={l.value} value={l.value}>{l.value === 'auto' ? t.autoDetect : l.labelEn}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col hidden sm:flex">
            <label htmlFor="targetLangDesktop" className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{t.targetLabel}</label>
            <select
              id="targetLangDesktop"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value as TargetLang)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none w-28 lg:w-32 text-slate-700 dark:text-slate-300"
            >
              {targetLanguages.map(l => <option key={l.value} value={l.value}>{l.labelEn}</option>)}
            </select>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 sm:ml-2 mt-[14px] sm:mt-0 transition-colors rounded-full flex-shrink-0"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mt-[14px] sm:mt-0 transition-colors rounded-full flex-shrink-0"
            aria-label={t.settings}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-4 sm:p-6 overflow-hidden max-w-[1400px] mx-auto w-full">
        {/* Sidebar */}
        <div className="w-full lg:w-80 flex flex-col gap-4 overflow-y-auto lg:overflow-visible shrink-0 custom-scrollbar">
          
          <div className="flex sm:hidden gap-2">
			  <div className="flex flex-col flex-1">
                <label htmlFor="sourceLangMobile" className="sr-only">{t.sourceLabel}</label>
				<select id="sourceLangMobile" value={sourceLang} onChange={(e) => setSourceLang(e.target.value as SourceLang)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs px-2 py-2 text-slate-700 dark:text-slate-300">
				  {sourceLanguages.map(l => <option key={l.value} value={l.value}>{l.value === 'auto' ? t.autoDetect : l.labelEn}</option>)}
				</select>
			  </div>
			  <div className="flex flex-col flex-1">
                <label htmlFor="targetLangMobile" className="sr-only">{t.targetLabel}</label>
				<select id="targetLangMobile" value={targetLang} onChange={(e) => setTargetLang(e.target.value as TargetLang)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs px-2 py-2 text-slate-700 dark:text-slate-300">
				  {targetLanguages.map(l => <option key={l.value} value={l.value}>{l.labelEn}</option>)}
				</select>
			  </div>
		  </div>

          <div 
            className="glass-panel rounded-xl p-5 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 transition-colors h-48 sm:h-64 cursor-pointer"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              id="fileUpload"
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*,video/*"
              className="hidden"
            />
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-70">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {!file ? (
               <div className="text-center">
                 <label htmlFor="fileUpload" className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-2 cursor-pointer">{t.dragDrop}</label>
               </div>
            ) : (
               <div className="text-center w-full px-2">
                 <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{file.name}</p>
                 <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-tight">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
               </div>
            )}
          </div>

          {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs rounded-xl font-medium shadow-sm">
                {error}
              </div>
          )}

          {(file || isProcessing) && (
          <div className="glass-panel rounded-xl p-5 flex flex-col gap-4 shadow-sm">
            {isProcessing && (
              <div className="space-y-2 text-xs font-medium">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">{t.processingStatus}</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {progressStep === 'uploading' ? '15%' : progressStep === 'polling' ? '25%' : progressStep === 'transcribing' ? '50%' : progressStep === 'translating' ? '75%' : '90%'}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500" 
                    style={{ width: progressStep === 'uploading' ? '15%' : progressStep === 'polling' ? '25%' : progressStep === 'transcribing' ? '50%' : progressStep === 'translating' ? '75%' : '90%' }}
                  ></div>
                </div>
                <ul className="mt-4 space-y-2 text-[11px]">
                   <li className={`flex items-center gap-2 ${(progressStep !== 'uploading' && progressStep !== 'polling') ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400 animate-pulse'}`}>
                     {(progressStep !== 'uploading' && progressStep !== 'polling') ? <Check size={12} strokeWidth={3} /> : <Loader2 size={12} className="animate-spin" />} {t.uploading} {(progressStep !== 'uploading' && progressStep !== 'polling') && t.complete}
                   </li>
                   {progressStep === 'polling' && (
                     <li className="flex items-center gap-2 text-blue-600 dark:text-blue-400 animate-pulse">
                       <Loader2 size={12} className="animate-spin" /> {t.processingFile} {pollAttempt > 0 ? `(${t.attemptText} ${pollAttempt}/30)` : ''}
                     </li>
                   )}
                   {(progressStep === 'transcribing' || progressStep === 'translating' || progressStep === 'summarizing') && (
                     <li className={`flex items-center gap-2 ${progressStep !== 'transcribing' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400 animate-pulse'}`}>
                       {progressStep !== 'transcribing' ? <Check size={12} strokeWidth={3} /> : <Loader2 size={12} className="animate-spin" />} {t.transcribingStatus} {progressStep !== 'transcribing' && t.complete}
                     </li>
                   )}
                   {(progressStep === 'translating' || progressStep === 'summarizing') && (
                     <li className={`flex items-center gap-2 ${progressStep !== 'translating' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400 animate-pulse'}`}>
                       {progressStep !== 'translating' ? <Check size={12} strokeWidth={3} /> : <Loader2 size={12} className="animate-spin" />} {t.translatingStatus} {progressStep !== 'translating' && t.complete}
                     </li>
                   )}
                   {progressStep === 'summarizing' && (
                     <li className="flex items-center gap-2 text-blue-600 dark:text-blue-400 animate-pulse">
                       <Loader2 size={12} className="animate-spin" /> {t.summarizingStatus}
                     </li>
                   )}
                </ul>
              </div>
            )}
            <button 
              onClick={processAudio}
              disabled={!file || isProcessing}
              className="w-full py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-lg font-bold text-sm shadow-lg shadow-slate-200 dark:shadow-none hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {isProcessing && <Loader2 size={16} className="animate-spin" />}
              {isProcessing ? t.processing : t.transcribeTransl}
            </button>
          </div>
          )}

          <div className="mt-auto pt-4 p-3 text-[10px] text-slate-400 italic hidden lg:block">
            {/* Note RGAA : Le contraste de text-slate-400 sur fond clair est potentiellement faible (inférieur à 4.5:1). À ajuster selon la charte exacte si nécessaire. */}
            {t.systemPromptLabel}
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col glass-panel rounded-xl shadow-sm bg-white dark:bg-slate-800 overflow-hidden min-h-[400px]">
           <nav className="flex flex-wrap border-b border-slate-100 dark:border-slate-700 px-2 sm:px-6 pt-4 shrink-0 gap-y-2">
              {[
                  { id: "transcription", label: t.transcription },
                  { id: "translation", label: t.translation },
                  { id: "summary", label: t.summary },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? "text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400"
                        : "text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}

                <div className="ml-auto flex gap-2 pb-2 pl-2">
                   <button 
                     onClick={handleCopy}
                     disabled={!currentTabContent}
                     className="p-1.5 sm:p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded text-slate-400 border border-slate-200 dark:border-slate-600 transition-colors disabled:opacity-30"
                     title={t.copy}
                   >
                     {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                   </button>
                   <button 
                     onClick={handleDownload}
                     disabled={!currentTabContent}
                     className="flex items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-30"
                   >
                     {t.download}
                   </button>
                </div>
           </nav>
           <div className="flex-1 p-4 sm:p-8 overflow-y-auto custom-scrollbar">
              {activeTab === "transcription" && <ContentTab content={transcription} placeholder={`${t.transcription}...`} />}
              {activeTab === "translation" && <ContentTab content={translation} placeholder={`${t.translation}...`} />}
              {activeTab === "summary" && <ContentTab content={summary} placeholder={`${t.summary}...`} />}
           </div>

           <div className="h-8 sm:h-10 px-4 sm:px-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between text-[9px] sm:text-[10px] font-medium text-slate-400 shrink-0">
              <div className="flex gap-3 sm:gap-4 flex-wrap">
                <span className="hidden sm:inline">{t.words}: {currentTabContent ? getWordsCount(currentTabContent) : 0}</span>
                <span>{t.characters}: {currentTabContent ? currentTabContent.length : 0}</span>
                <span className="hidden xs:inline">{t.estimatedReadingTime}: {currentTabContent ? getReadTime(currentTabContent) : 0} {t.min}</span>
              </div>
              <span className="hidden sm:inline">{t.aiEngine}</span>
           </div>
        </div>
      </main>

      {legalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {legalModal === "mentions" && t.mentionsLegal}
                {legalModal === "privacy" && t.privacyPolicy}
                {legalModal === "rgaa" && t.accessibilityInfo}
              </h2>
              <button onClick={() => setLegalModal(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar text-sm text-slate-600 dark:text-slate-300 space-y-4">
              {legalModal === "mentions" && (
                <>
                  <p><strong>Éditeur du site :</strong> Arx Systema (Louis Rouanet)</p>
                  <p><strong>Siège social :</strong> Yvelines, France</p>
                  <p><strong>Directeur de la publication :</strong> Louis Rouanet</p>
                  <p><strong>Hébergement :</strong> Google Cloud Platform</p>
                  <p>Ce site et ses contenus sont la propriété intellectuelle exclusive d'Arx Systema. Toute reproduction est interdite sans accord préalable.</p>
                </>
              )}
              {legalModal === "privacy" && (
                <>
                  <p><strong>Collecte de données :</strong> VerbumFlow utilise l'API Gemini pour transcrire et traduire vos fichiers audio et vidéo.</p>
                  <p><strong>Utilisation des données :</strong> Vos fichiers ne sont traités que dans le but de fournir le service demandé. Ils ne sont pas utilisés pour entraîner des modèles publics sans votre consentement.</p>
                  <p><strong>Vos droits :</strong> Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Contactez Arx Systema pour toute demande.</p>
                  <p><strong>Clés API :</strong> Vos clés API Gemini sont stockées localement dans votre navigateur et ne sont jamais transmises à nos serveurs autres que ceux de Google pour effectuer l'appel d'API.</p>
                </>
              )}
              {legalModal === "rgaa" && (
                <>
                  <p><strong>Déclaration d'accessibilité</strong></p>
                  <p>Arx Systema s'engage à rendre ses sites internet accessibles conformément à l'article 47 de la loi n°2005-102 du 11 février 2005.</p>
                  <p><strong>État de conformité :</strong> VerbumFlow est <strong>non conforme</strong> avec le RGAA. Des audits sont en cours pour déterminer les non-conformités et les corriger.</p>
                  <p>Si vous rencontrez des difficultés d'accès, vous pouvez nous contacter pour obtenir une alternative accessible.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-6 shrink-0 z-10 w-full text-center px-4">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} <span className="font-semibold text-slate-700 dark:text-slate-300">Arx Systema</span>. Tous droits réservés.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
            <button onClick={() => setLegalModal("mentions")} className="hover:text-slate-800 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 transition-colors">{t.mentionsLegal}</button>
            <button onClick={() => setLegalModal("privacy")} className="hover:text-slate-800 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 transition-colors">{t.privacyPolicy}</button>
            <button onClick={() => setLegalModal("rgaa")} className="hover:text-slate-800 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 transition-colors">{t.accessibilityInfo.split(/[:\s]/)[0]}</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
