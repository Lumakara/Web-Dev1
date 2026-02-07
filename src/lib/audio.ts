// Ultra Sound System - Complete audio management

type SoundType = 'click' | 'success' | 'error' | 'hover' | 'notification' | 'checkout' | 'addToCart' | 'remove' | 'switch';

interface SoundEffect {
  name: SoundType;
  url: string;
  volume: number;
}

// Free sound effects from reliable CDN
const SOUND_EFFECTS: SoundEffect[] = [
  {
    name: 'click',
    url: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    volume: 0.3
  },
  {
    name: 'success',
    url: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
    volume: 0.4
  },
  {
    name: 'error',
    url: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
    volume: 0.3
  },
  {
    name: 'hover',
    url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    volume: 0.1
  },
  {
    name: 'notification',
    url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    volume: 0.4
  },
  {
    name: 'checkout',
    url: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
    volume: 0.5
  },
  {
    name: 'addToCart',
    url: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
    volume: 0.3
  },
  {
    name: 'remove',
    url: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
    volume: 0.2
  },
  {
    name: 'switch',
    url: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3',
    volume: 0.2
  }
];

// Background music tracks - Relaxing ambient music
const MUSIC_TRACKS = [
  {
    name: 'ambient1',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112778.mp3',
    volume: 0.15
  },
  {
    name: 'ambient2',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=relaxing-mountains-rivers-streams-birds-18177.mp3',
    volume: 0.15
  }
];

class UltraAudioService {
  private soundEnabled: boolean = true;
  private musicEnabled: boolean = false;
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private currentMusic: HTMLAudioElement | null = null;
  private musicIndex: number = 0;
  private masterVolume: number = 1;
  private musicVolume: number = 0.15;

  constructor() {
    this.loadSettings();
    this.preloadSounds();
  }

  private loadSettings() {
    if (typeof window !== 'undefined') {
      const savedSound = localStorage.getItem('sound_enabled');
      const savedMusic = localStorage.getItem('music_enabled');
      const savedMasterVol = localStorage.getItem('master_volume');
      
      this.soundEnabled = savedSound !== null ? savedSound === 'true' : true;
      this.musicEnabled = savedMusic !== null ? savedMusic === 'true' : false;
      this.masterVolume = savedMasterVol !== null ? parseFloat(savedMasterVol) : 1;
    }
  }

  private saveSettings() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sound_enabled', this.soundEnabled.toString());
      localStorage.setItem('music_enabled', this.musicEnabled.toString());
      localStorage.setItem('master_volume', this.masterVolume.toString());
    }
  }

  private preloadSounds() {
    SOUND_EFFECTS.forEach(sound => {
      const audio = new Audio(sound.url);
      audio.volume = sound.volume * this.masterVolume;
      audio.preload = 'auto';
      this.audioCache.set(sound.name, audio);
    });
  }

  // Sound Effects
  playSound(type: SoundType) {
    if (!this.soundEnabled) return;
    
    const audio = this.audioCache.get(type);
    if (audio) {
      audio.currentTime = 0;
      audio.volume = (SOUND_EFFECTS.find(s => s.name === type)?.volume || 0.3) * this.masterVolume;
      audio.play().catch(err => console.log('Audio play failed:', err));
    }
  }

  playClick() {
    this.playSound('click');
  }

  playSuccess() {
    this.playSound('success');
  }

  playError() {
    this.playSound('error');
  }

  playHover() {
    this.playSound('hover');
  }

  playNotification() {
    this.playSound('notification');
  }

  playCheckout() {
    this.playSound('checkout');
  }

  playAddToCart() {
    this.playSound('addToCart');
  }

  playRemove() {
    this.playSound('remove');
  }

  playSwitch() {
    this.playSound('switch');
  }

  // Background Music
  toggleMusic(): boolean {
    this.musicEnabled = !this.musicEnabled;
    this.saveSettings();
    
    if (this.musicEnabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
    
    return this.musicEnabled;
  }

  isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  private startMusic() {
    if (!this.musicEnabled) return;
    
    this.stopMusic();
    
    const track = MUSIC_TRACKS[this.musicIndex];
    this.currentMusic = new Audio(track.url);
    this.currentMusic.volume = this.musicVolume * this.masterVolume;
    this.currentMusic.loop = false;
    
    this.currentMusic.addEventListener('ended', () => {
      this.musicIndex = (this.musicIndex + 1) % MUSIC_TRACKS.length;
      this.startMusic();
    });
    
    this.currentMusic.play().catch(err => {
      console.log('Music play failed:', err);
      // Try next track if current fails
      this.musicIndex = (this.musicIndex + 1) % MUSIC_TRACKS.length;
    });
  }

  private stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.currentTime = 0;
      this.currentMusic = null;
    }
  }

  // Toggle Sound Effects
  toggleSound(): boolean {
    this.soundEnabled = !this.soundEnabled;
    this.saveSettings();
    return this.soundEnabled;
  }

  isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  // Volume Control
  setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
    
    // Update current music volume
    if (this.currentMusic) {
      this.currentMusic.volume = this.musicVolume * this.masterVolume;
    }
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.currentMusic) {
      this.currentMusic.volume = this.musicVolume * this.masterVolume;
    }
  }

  // Initialize on user interaction (browser policy)
  initOnInteraction() {
    if (this.musicEnabled && !this.currentMusic) {
      this.startMusic();
    }
  }
}

export const audioService = new UltraAudioService();
export default audioService;
