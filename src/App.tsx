import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, 
  Mic2, 
  FileText, 
  Settings2, 
  Play, 
  Download, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Loader2,
  CheckCircle2,
  History as HistoryIcon,
  Plus,
  Volume2,
  Disc
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { cn } from './lib/utils';
import { 
  SongData, 
  INITIAL_SONG_DATA, 
  Genre, 
  Mood, 
  VocalGender, 
  VocalCharacter, 
  VocalStyle, 
  Tempo 
} from './types';
import { generateLyrics, generateMusicAudio } from './services/ai';

// --- Components ---

const StepIndicator = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { id: 1, icon: Settings2, label: 'Detail' },
    { id: 2, icon: FileText, label: 'Lirik' },
    { id: 3, icon: Music, label: 'Studio' },
    { id: 4, icon: Play, label: 'Hasil' },
  ];

  return (
    <div className="flex items-center justify-center space-x-4 mb-12">
      {steps.map((step, idx) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            <div className={cn(
              "step-indicator",
              currentStep === step.id ? "active" : currentStep > step.id ? "complete" : "pending"
            )}>
              {currentStep > step.id ? <CheckCircle2 size={18} /> : <step.icon size={18} />}
            </div>
            <span className={cn(
              "text-[10px] uppercase tracking-widest mt-2 font-medium",
              currentStep === step.id ? "text-brand-orange" : "text-white/40"
            )}>
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div className={cn(
              "h-[1px] w-12 mb-6",
              currentStep > step.id ? "bg-green-500" : "bg-white/10"
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default function App() {
  const [step, setStep] = useState(1);
  const [songData, setSongData] = useState<SongData>(INITIAL_SONG_DATA);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [history, setHistory] = useState<SongData[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [isTestingKey, setIsTestingKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        const stored = localStorage.getItem('GEMINI_API_KEY_MANUAL');
        setHasKey(!!stored);
        if (stored) setManualKey(stored);
      }
    };
    checkKey();
    const interval = setInterval(checkKey, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    } else {
      setShowKeyModal(true);
    }
  };

  const saveManualKey = () => {
    if (manualKey.trim()) {
      localStorage.setItem('GEMINI_API_KEY_MANUAL', manualKey.trim());
      setHasKey(true);
      setShowKeyModal(false);
      toast.success("API Key berhasil disimpan!");
    } else {
      toast.error("Masukkan API Key yang valid.");
    }
  };

  const testManualKey = async () => {
    if (!manualKey.trim()) {
      toast.error("Masukkan API Key terlebih dahulu.");
      return;
    }
    setIsTestingKey(true);
    try {
      const ai = new GoogleGenAI({ apiKey: manualKey.trim() });
      await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Hi",
      });
      toast.success("API Key valid dan terkoneksi!");
    } catch (err: any) {
      console.error("Key Test Error:", err);
      toast.error(`Key tidak valid: ${err?.message || "Periksa kembali key Anda."}`);
    } finally {
      setIsTestingKey(false);
    }
  };

  const updateData = (updates: Partial<SongData>) => {
    setSongData(prev => ({ ...prev, ...updates }));
  };

  const handleGenerateLyrics = async () => {
    if (!songData.title || !songData.theme) {
      toast.error("Judul dan Tema wajib diisi!");
      return;
    }
    setIsGenerating(true);
    setProgressMsg("Menulis lirik puitis untukmu...");
    try {
      const lyrics = await generateLyrics(songData);
      updateData({ lyrics });
      setStep(2);
    } catch (err: any) {
      console.error("Lyrics Generation Error:", err);
      toast.error(`Gagal generate lirik: ${err?.message || "Coba lagi."}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMusic = async () => {
    // Check for API Key
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        toast.info("Lyria AI (Musik) memerlukan API Key dengan billing aktif. Silakan pilih key Anda.");
        await window.aistudio.openSelectKey();
      }
    } else {
      const stored = localStorage.getItem('GEMINI_API_KEY_MANUAL');
      if (!stored) {
        toast.info("Silakan masukkan API Key Anda terlebih dahulu.");
        setShowKeyModal(true);
        return;
      }
    }

    setIsGenerating(true);
    try {
      const result = await generateMusicAudio(songData, setProgressMsg);
      const finalData = { ...songData, audioUrl: result.audioUrl };
      updateData(finalData);
      setHistory(prev => [finalData, ...prev]);
      setStep(4);
    } catch (err: any) {
      console.error("Music Generation Error:", err);
      const errorMsg = err?.message || "Terjadi kesalahan yang tidak diketahui.";
      
      if (errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("invalid API key")) {
        toast.error("API Key tidak valid. Silakan periksa kembali di menu Set API Key.");
      } else if (errorMsg.includes("billing") || errorMsg.includes("quota")) {
        toast.error("Masalah Billing/Kuota: Pastikan API Key Anda berasal dari proyek Google Cloud dengan billing aktif.");
      } else {
        toast.error(`Gagal: ${errorMsg}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark overflow-x-hidden selection:bg-brand-orange selection:text-white">
      <Toaster position="top-center" theme="dark" />
      
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-orange/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-8 py-6 flex justify-between items-center border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-brand-orange rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,99,33,0.3)]">
            <Disc className="text-white animate-spin-slow" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">MELODIA<span className="text-brand-orange">.AI</span></h1>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]">Studio Musik AI Lengkap</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleOpenKeyDialog}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center space-x-2 border",
              hasKey 
                ? "bg-green-500/10 border-green-500/50 text-green-500" 
                : "bg-brand-orange/10 border-brand-orange/50 text-brand-orange animate-pulse"
            )}
          >
            <Settings2 size={14} />
            <span>{hasKey ? "API Key Aktif" : "Set API Key"}</span>
          </button>
          <div className="hidden md:block text-[9px] text-white/20 max-w-[120px] leading-tight">
            Diperlukan untuk produksi audio (Lyria AI)
          </div>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60 hover:text-white"
          >
            <HistoryIcon size={20} />
          </button>
          <button 
            onClick={() => { setStep(1); setSongData(INITIAL_SONG_DATA); }}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-sm font-medium transition-all flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Baru</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <StepIndicator currentStep={step} />

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="glass-panel p-8 space-y-8">
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-orange flex items-center gap-2">
                    <Settings2 size={16} /> Identitas Lagu
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs text-white/40 uppercase font-bold tracking-wider">Judul Lagu</label>
                      <input 
                        type="text" 
                        placeholder="Misal: Senja di Jakarta"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-orange transition-colors"
                        value={songData.title}
                        onChange={e => updateData({ title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-white/40 uppercase font-bold tracking-wider">Tema Utama</label>
                      <input 
                        type="text" 
                        placeholder="Misal: Kerinduan, Perpisahan"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-orange transition-colors"
                        value={songData.theme}
                        onChange={e => updateData({ theme: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase font-bold tracking-wider">Cerita / Pesan Lagu</label>
                    <textarea 
                      placeholder="Ceritakan sedikit tentang apa lagu ini..."
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-orange transition-colors resize-none"
                      value={songData.story}
                      onChange={e => updateData({ story: e.target.value })}
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-orange flex items-center gap-2">
                    <Sparkles size={16} /> Mood & Genre
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-xs text-white/40 uppercase font-bold tracking-wider">Mood: {songData.mood}</label>
                      <div className="flex flex-wrap gap-2">
                        {['Romantis', 'Bahagia', 'Sedih', 'Motivasi', 'Nostalgia'].map(m => (
                          <button
                            key={m}
                            onClick={() => updateData({ mood: m as Mood })}
                            className={cn(
                              "px-4 py-2 rounded-full text-xs transition-all",
                              songData.mood === m ? "bg-brand-orange text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-xs text-white/40 uppercase font-bold tracking-wider">Intensitas Emosi: {songData.intensity}</label>
                      <input 
                        type="range" min="1" max="10" 
                        className="w-full accent-brand-orange"
                        value={songData.intensity}
                        onChange={e => updateData({ intensity: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs text-white/40 uppercase font-bold tracking-wider">Genre (Pilih Beberapa)</label>
                    <div className="flex flex-wrap gap-2">
                      {['Pop', 'Indie', 'Rock', 'Jazz', 'EDM', 'Dangdut', 'R&B', 'Hip Hop'].map(g => (
                        <button
                          key={g}
                          onClick={() => {
                            const genres = songData.genres.includes(g as Genre)
                              ? songData.genres.filter(x => x !== g)
                              : [...songData.genres, g as Genre];
                            updateData({ genres });
                          }}
                          className={cn(
                            "px-4 py-2 rounded-full text-xs transition-all",
                            songData.genres.includes(g as Genre) ? "bg-white text-brand-dark font-bold" : "bg-white/5 text-white/60 hover:bg-white/10"
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-orange flex items-center gap-2">
                    <Mic2 size={16} /> Vokal & Instrumen
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-xs text-white/40 uppercase font-bold tracking-wider">Karakter Vokal</label>
                      <div className="flex flex-wrap gap-2">
                        {['Lembut', 'Powerful', 'Serak', 'Deep', 'Jernih'].map(c => (
                          <button
                            key={c}
                            onClick={() => updateData({ vocalCharacter: c as VocalCharacter })}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] transition-all",
                              songData.vocalCharacter === c ? "bg-white text-brand-dark font-bold" : "bg-white/5 text-white/60 hover:bg-white/10"
                            )}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-xs text-white/40 uppercase font-bold tracking-wider">Instrumen Utama</label>
                      <div className="flex flex-wrap gap-2">
                        {['Piano', 'Gitar Akustik', 'Gitar Elektrik', 'Drum', 'Bass', 'Synth', 'Strings', 'Trumpet'].map(i => (
                          <button
                            key={i}
                            onClick={() => {
                              const instruments = songData.instruments.includes(i)
                                ? songData.instruments.filter(x => x !== i)
                                : [...songData.instruments, i];
                              updateData({ instruments });
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] transition-all",
                              songData.instruments.includes(i) ? "bg-brand-orange text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                            )}
                          >
                            {i}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <div className="flex justify-end pt-4">
                  <button 
                    onClick={handleGenerateLyrics}
                    disabled={isGenerating}
                    className="px-8 py-4 bg-brand-orange hover:bg-brand-orange/90 disabled:opacity-50 rounded-2xl font-bold flex items-center space-x-3 transition-all shadow-[0_10px_30px_rgba(255,99,33,0.3)] hover:translate-y-[-2px]"
                  >
                    {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                    <span>{isGenerating ? progressMsg : "Tulis Lirik AI"}</span>
                    {!isGenerating && <ChevronRight size={20} />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="glass-panel p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-orange flex items-center gap-2">
                    <FileText size={16} /> Lyrics Studio
                  </h3>
                  <button 
                    onClick={handleGenerateLyrics}
                    className="text-xs text-white/40 hover:text-brand-orange transition-colors flex items-center gap-2"
                  >
                    <Sparkles size={14} /> Regenerate
                  </button>
                </div>
                <textarea 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 font-serif text-lg leading-relaxed focus:outline-none focus:border-brand-orange/50 min-h-[400px] resize-none"
                  value={songData.lyrics}
                  onChange={e => updateData({ lyrics: e.target.value })}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Vokal & Karakter</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <select 
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        value={songData.vocalGender}
                        onChange={e => updateData({ vocalGender: e.target.value as VocalGender })}
                      >
                        <option value="Wanita">Wanita</option>
                        <option value="Pria">Pria</option>
                        <option value="Duet">Duet</option>
                      </select>
                      <select 
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        value={songData.vocalCharacter}
                        onChange={e => updateData({ vocalCharacter: e.target.value as VocalCharacter })}
                      >
                        <option value="Lembut">Lembut</option>
                        <option value="Powerful">Powerful</option>
                        <option value="Serak">Serak</option>
                        <option value="Deep">Deep</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Tempo & Instrumen</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <select 
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        value={songData.tempo}
                        onChange={e => updateData({ tempo: e.target.value as Tempo })}
                      >
                        <option value="Lambat">Lambat</option>
                        <option value="Sedang">Sedang</option>
                        <option value="Cepat">Cepat</option>
                      </select>
                      <div className="text-[10px] text-white/60 flex items-center px-3 bg-white/5 rounded-xl border border-white/10">
                        {songData.instruments.length} Instrumen
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-8">
                  <button 
                    onClick={() => setStep(1)}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-all flex items-center space-x-2"
                  >
                    <ChevronLeft size={18} />
                    <span>Kembali</span>
                  </button>
                  <button 
                    onClick={() => setStep(3)}
                    className="px-8 py-3 bg-white text-brand-dark hover:bg-white/90 rounded-xl font-bold flex items-center space-x-2 transition-all"
                  >
                    <span>Lanjut ke Studio</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-8"
            >
              <div className="glass-panel p-12 text-center space-y-8">
                <div className="relative mx-auto w-48 h-48">
                  <div className="absolute inset-0 bg-brand-orange/20 blur-3xl rounded-full animate-pulse" />
                  <div className={cn(
                    "relative w-full h-full rounded-full border-4 border-brand-orange/20 flex items-center justify-center overflow-hidden",
                    isGenerating && "animate-spin-slow"
                  )}>
                    <Music className="text-brand-orange" size={64} />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h2 className="text-3xl font-bold">Studio Produksi AI</h2>
                  <p className="text-white/60 max-w-md mx-auto">
                    {isGenerating 
                      ? progressMsg 
                      : "Siap mengubah lirikmu menjadi lagu utuh dengan vokal dan instrumen profesional."}
                  </p>
                  
                  {!isGenerating && (
                    <div className={cn(
                      "inline-flex items-center space-x-2 px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest mx-auto",
                      hasKey ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-brand-orange/10 border-brand-orange/20 text-brand-orange"
                    )}>
                      <div className={cn("w-2 h-2 rounded-full", hasKey ? "bg-green-500" : "bg-brand-orange animate-pulse")} />
                      <span>{hasKey ? "API Key Siap" : "API Key Diperlukan untuk Musik"}</span>
                      {!hasKey && (
                        <button 
                          onClick={handleOpenKeyDialog}
                          className="ml-2 underline hover:text-white transition-colors"
                        >
                          Set Sekarang
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {!isGenerating ? (
                  <div className="flex flex-col items-center space-y-4">
                    <button 
                      onClick={handleGenerateMusic}
                      className="px-12 py-5 bg-brand-orange hover:bg-brand-orange/90 rounded-2xl font-bold text-lg flex items-center space-x-3 transition-all shadow-[0_20px_50px_rgba(255,99,33,0.4)] hover:scale-105"
                    >
                      <Play fill="currentColor" size={24} />
                      <span>Generate Lagu Sekarang</span>
                    </button>
                    <button 
                      onClick={() => setStep(2)}
                      className="text-xs text-white/40 hover:text-white transition-colors underline underline-offset-4"
                    >
                      Edit Lirik Lagi
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 max-w-xs mx-auto">
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-brand-orange"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 45, ease: "linear" }}
                      />
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-brand-orange animate-pulse font-bold">
                      Processing Audio...
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 4 && songData.audioUrl && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="glass-panel p-8 md:p-12 space-y-12">
                <div className="flex flex-col md:flex-row gap-12 items-center md:items-start">
                  {/* Album Art Placeholder */}
                  <div className="w-64 h-64 bg-gradient-to-br from-brand-orange to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl relative group overflow-hidden">
                    <Disc className="text-white/20 absolute inset-0 w-full h-full -m-12" size={300} />
                    <Music className="text-white relative z-10" size={80} />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <button className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-brand-dark">
                          <Play fill="currentColor" size={24} className="ml-1" />
                       </button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-6 text-center md:text-left">
                    <div>
                      <h2 className="text-4xl font-bold mb-2">{songData.title || "Untitled Masterpiece"}</h2>
                      <p className="text-brand-orange font-medium">{songData.genres.join(" & ")} • {songData.mood}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-4 bg-white/5 rounded-2xl p-4">
                        <Volume2 className="text-white/40" size={20} />
                        <audio controls className="flex-1 h-8 accent-brand-orange">
                          <source src={songData.audioUrl} type="audio/wav" />
                        </audio>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                        <a 
                          href={songData.audioUrl} 
                          download={`${songData.title || 'lagu'}.wav`}
                          className="px-6 py-3 bg-white text-brand-dark rounded-xl font-bold flex items-center space-x-2 hover:scale-105 transition-all"
                        >
                          <Download size={18} />
                          <span>Download Audio</span>
                        </a>
                        <button 
                          onClick={() => setStep(1)}
                          className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold flex items-center space-x-2 transition-all"
                        >
                          <Plus size={18} />
                          <span>Buat Lagu Lagi</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-12">
                  <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-6">Lirik Lagu</h4>
                  <div className="bg-white/5 rounded-2xl p-8 max-h-[400px] overflow-y-auto">
                    <pre className="font-serif text-lg leading-relaxed whitespace-pre-wrap text-white/80">
                      {songData.lyrics}
                    </pre>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-brand-gray border-l border-white/5 z-[101] p-8 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold">Riwayat Lagu</h3>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-white/5 rounded-full">
                  <ChevronRight size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                {history.length === 0 ? (
                  <div className="text-center py-12 text-white/20">
                    <Music size={48} className="mx-auto mb-4 opacity-10" />
                    <p>Belum ada lagu yang dibuat.</p>
                  </div>
                ) : (
                  history.map((item, idx) => (
                    <div key={idx} className="glass-panel p-4 flex items-center space-x-4 hover:bg-white/10 transition-all cursor-pointer group">
                      <div className="w-12 h-12 bg-brand-orange/20 rounded-lg flex items-center justify-center text-brand-orange">
                        <Music size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold truncate">{item.title || "Untitled"}</h4>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">{item.genres[0]} • {item.mood}</p>
                      </div>
                      <button 
                        onClick={() => {
                          setSongData(item);
                          setStep(4);
                          setShowHistory(false);
                        }}
                        className="p-2 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Play size={16} fill="currentColor" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="relative z-10 py-12 text-center border-t border-white/5 mt-12">
        <p className="text-[10px] text-white/20 uppercase tracking-[0.5em]">Powered by Google Gemini & Lyria AI</p>
      </footer>

      {/* Manual API Key Modal */}
      <AnimatePresence>
        {showKeyModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowKeyModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md glass-panel p-8 z-[201] space-y-6"
            >
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold">Set Gemini API Key</h3>
                <p className="text-xs text-white/40">
                  Masukkan API Key Anda untuk menggunakan fitur produksi musik di luar AI Studio.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-white/40">API Key</label>
                  <input 
                    type="password"
                    placeholder="AIzaSy..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-orange transition-colors"
                    value={manualKey}
                    onChange={e => setManualKey(e.target.value)}
                  />
                </div>
                <p className="text-[9px] text-white/30 leading-relaxed">
                  Dapatkan API Key di <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-brand-orange underline">Google AI Studio</a>. Pastikan akun Anda memiliki akses ke model Lyria.
                </p>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={testManualKey}
                    disabled={isTestingKey}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    {isTestingKey ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    <span>Tes Koneksi</span>
                  </button>
                  <button 
                    onClick={saveManualKey}
                    className="flex-1 py-3 bg-brand-orange hover:bg-brand-orange/90 rounded-xl text-sm font-bold transition-all"
                  >
                    Simpan Key
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}</style>
    </div>
  );
}
