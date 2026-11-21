type SfxType =
  | 'pickup'
  | 'place'
  | 'invalid'
  | 'clear'
  | 'combo'
  | 'booster'
  | 'click'
  | 'coin'
  | 'levelComplete'
  | 'gameOver'
  | 'spin';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxEnabled = true;
  private musicEnabled = true;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private masterGain: GainNode | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.7;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlockFromGesture(): void {
    const ctx = this.ensureContext();
    if (ctx && this.musicEnabled && this.musicTimer === null) {
      this.startMusicLoop();
    }
  }

  public setSettings(musicEnabled: boolean, sfxEnabled: boolean): void {
    this.musicEnabled = musicEnabled;
    this.sfxEnabled = sfxEnabled;
    if (!musicEnabled) {
      this.stopMusicLoop();
    } else if (this.ctx && this.musicTimer === null) {
      this.startMusicLoop();
    }
  }

  public handleVisibilityChange(hidden: boolean): void {
    if (hidden) {
      this.stopMusicLoop();
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    } else {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (this.musicEnabled && this.ctx && this.musicTimer === null) {
        this.startMusicLoop();
      }
    }
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.14,
    delay = 0,
    freqEnd?: number
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playSfx(type: SfxType, intensity = 1): void {
    if (!this.sfxEnabled) return;

    switch (type) {
      case 'click':
        this.playTone(540, 0.045, 'triangle', 0.08, 0, 420);
        break;
      case 'pickup':
        this.playTone(320, 0.06, 'sine', 0.1, 0, 460);
        break;
      case 'place':
        this.playTone(170, 0.09, 'triangle', 0.18, 0, 110);
        this.playTone(340, 0.06, 'sine', 0.08, 0.01, 240);
        break;
      case 'invalid':
        this.playTone(160, 0.11, 'sawtooth', 0.06, 0, 110);
        break;
      case 'clear': {
        const base = 440 * Math.pow(1.06, Math.min(6, intensity - 1));
        this.playTone(base, 0.14, 'triangle', 0.15, 0);
        this.playTone(base * 1.25, 0.16, 'sine', 0.14, 0.05);
        this.playTone(base * 1.5, 0.22, 'sine', 0.14, 0.1);
        break;
      }
      case 'combo': {
        const pitch = Math.min(1.6, 1 + intensity * 0.1);
        this.playTone(523.25 * pitch, 0.14, 'sine', 0.15, 0);
        this.playTone(659.25 * pitch, 0.16, 'sine', 0.15, 0.06);
        this.playTone(783.99 * pitch, 0.24, 'triangle', 0.16, 0.12);
        break;
      }
      case 'booster':
        this.playTone(300, 0.18, 'sine', 0.15, 0, 720);
        this.playTone(620, 0.16, 'triangle', 0.12, 0.07, 940);
        break;
      case 'coin':
        this.playTone(987.77, 0.09, 'sine', 0.12, 0);
        this.playTone(1318.51, 0.2, 'sine', 0.13, 0.06);
        break;
      case 'spin':
        this.playTone(620, 0.035, 'triangle', 0.07, 0, 500);
        break;
      case 'levelComplete': {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((n, idx) => {
          this.playTone(n, 0.28, 'triangle', 0.15, idx * 0.09);
        });
        break;
      }
      case 'gameOver': {
        const notes = [392.0, 349.23, 311.13, 261.63];
        notes.forEach((n, idx) => {
          this.playTone(n, 0.25, 'sine', 0.12, idx * 0.12);
        });
        break;
      }
    }
  }

  private startMusicLoop(): void {
    if (this.musicTimer !== null || !this.musicEnabled) return;
    // Gentle pentatonic marimba ambient pattern (C major pentatonic)
    const melody = [
      261.63, 329.63, 392.0, 523.25,
      440.0, 392.0, 329.63, 293.66,
      261.63, 392.0, 440.0, 523.25,
      587.33, 523.25, 392.0, 329.63,
    ];
    const bass = [130.81, 0, 146.83, 0, 164.81, 0, 146.83, 0];

    this.musicTimer = window.setInterval(() => {
      if (!this.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;
      const note = melody[this.musicStep % melody.length];
      this.playTone(note, 0.38, 'sine', 0.032, 0);

      const b = bass[this.musicStep % bass.length];
      if (b > 0) {
        this.playTone(b, 0.55, 'triangle', 0.025, 0);
      }
      this.musicStep = (this.musicStep + 1) % melody.length;
    }, 460);
  }

  private stopMusicLoop(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const soundEngine = new SoundEngine();

export function triggerHaptic(enabled: boolean, ms = 12): void {
  if (!enabled) return;
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(ms);
    } catch {
      // ignore on unsupported browsers
    }
  }
}
