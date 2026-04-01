import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { SongData } from "../types";

const getAI = () => {
  // Try to get from localStorage first (for manual entry fallback)
  const manualKey = typeof window !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY_MANUAL') : null;
  const apiKey = manualKey || process.env.GEMINI_API_KEY;
  
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
  return new GoogleGenAI({ apiKey });
};

export const generateLyrics = async (songData: SongData): Promise<string> => {
  const ai = getAI();
  const prompt = `
    Buatkan lirik lagu lengkap berdasarkan data berikut:
    Judul: ${songData.title}
    Tema: ${songData.theme}
    Cerita: ${songData.story}
    Tujuan: ${songData.purpose}
    Mood: ${songData.mood} (Intensitas: ${songData.intensity}/10)
    Genre: ${songData.genres.join(", ")}
    Struktur: ${Object.entries(songData.structure).filter(([_, v]) => v).map(([k]) => k).join(", ")}

    Gaya lirik: Storytelling, emosional, dan puitis dalam Bahasa Indonesia.
    Berikan lirik dengan label struktur yang jelas (misal: [Intro], [Verse 1], [Chorus], dll).
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "Gagal menghasilkan lirik.";
};

export const generateMusicPrompt = async (songData: SongData): Promise<string> => {
  const ai = getAI();
  const prompt = `
    Buatlah prompt musik teknis untuk AI generator lagu (Lyria) berdasarkan data berikut:
    Genre: ${songData.genres.join(", ")}
    Vokal: ${songData.vocalGender}, Karakter: ${songData.vocalCharacter}, Gaya: ${songData.vocalStyle}
    Instrumen: ${songData.instruments.join(", ")}
    Tempo: ${songData.tempo}
    Mood: ${songData.mood} (Intensitas: ${songData.intensity}/10)
    Lirik: ${songData.lyrics.substring(0, 200)}...

    Hasil harus berupa deskripsi singkat, padat, dan teknis dalam Bahasa Inggris yang mencakup genre, mood, vokal, dan instrumen.
    Contoh: "Romantic acoustic pop, soft female vocals, gentle piano and acoustic guitar, mid-tempo, emotional and warm atmosphere."
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "";
};

export const generateMusicAudio = async (
  songData: SongData,
  onProgress: (msg: string) => void
): Promise<{ audioUrl: string; lyrics: string }> => {
  const ai = getAI();
  onProgress("Menyiapkan studio musik AI...");
  
  const musicPrompt = await generateMusicPrompt(songData);
  onProgress(`Menggunakan prompt: ${musicPrompt}`);

  const response = await ai.models.generateContentStream({
    model: "lyria-3-pro-preview",
    contents: `Generate a full song with vocals based on this description: ${musicPrompt}. Lyrics to include: ${songData.lyrics}`,
    config: {
      responseModalities: [Modality.AUDIO],
    },
  });

  let audioBase64 = "";
  let lyrics = "";
  let mimeType = "audio/wav";

  onProgress("Sedang merekam vokal dan instrumen...");

  for await (const chunk of response) {
    const parts = chunk.candidates?.[0]?.content?.parts;
    if (!parts) continue;
    for (const part of parts) {
      if (part.inlineData?.data) {
        if (!audioBase64 && part.inlineData.mimeType) {
          mimeType = part.inlineData.mimeType;
        }
        audioBase64 += part.inlineData.data;
      }
      if (part.text && !lyrics) {
        lyrics = part.text;
      }
    }
  }

  onProgress("Finalisasi mixing dan mastering...");

  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  const audioUrl = URL.createObjectURL(blob);

  return { audioUrl, lyrics };
};
