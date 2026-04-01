export type Genre = 'Pop' | 'Indie' | 'Rock' | 'Jazz' | 'EDM' | 'Dangdut' | 'R&B' | 'Hip Hop' | 'Folk' | 'Classical';
export type VocalGender = 'Pria' | 'Wanita' | 'Duet';
export type VocalCharacter = 'Lembut' | 'Serak' | 'Powerful' | 'Jernih' | 'Deep';
export type VocalStyle = 'Santai' | 'Emosional' | 'Rap' | 'Melodik' | 'Energetik';
export type Tempo = 'Lambat' | 'Sedang' | 'Cepat';
export type Mood = 'Bahagia' | 'Sedih' | 'Marah' | 'Nostalgia' | 'Romantis' | 'Motivasi';

export interface SongStructure {
  intro: boolean;
  verse1: boolean;
  chorus1: boolean;
  verse2: boolean;
  chorus2: boolean;
  bridge: boolean;
  outro: boolean;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export interface SongData {
  title: string;
  theme: string;
  story: string;
  purpose: string;
  mood: Mood;
  intensity: number;
  genres: Genre[];
  vocalGender: VocalGender;
  vocalCharacter: VocalCharacter;
  vocalStyle: VocalStyle;
  instruments: string[];
  tempo: Tempo;
  structure: SongStructure;
  lyrics: string;
  prompt: string;
  audioUrl?: string;
}

export const INITIAL_SONG_DATA: SongData = {
  title: '',
  theme: '',
  story: '',
  purpose: '',
  mood: 'Romantis',
  intensity: 5,
  genres: ['Pop'],
  vocalGender: 'Wanita',
  vocalCharacter: 'Lembut',
  vocalStyle: 'Santai',
  instruments: ['Piano', 'Gitar'],
  tempo: 'Sedang',
  structure: {
    intro: true,
    verse1: true,
    chorus1: true,
    verse2: true,
    chorus2: true,
    bridge: true,
    outro: true,
  },
  lyrics: '',
  prompt: '',
};
