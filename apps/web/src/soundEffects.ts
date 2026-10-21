// Web Audio API Synthesizer & Procedural Sound Effects Engine
// Zero external asset downloads needed; operates reliably and instantly across all browsers.

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * 🎲 Dice Roll Sound: Multi-bounce noise bursts simulating wooden/plastic dice tumbling
   */
  public playDiceRoll() {
    const ctx = this.getContext();
    if (!ctx) return;

    const bounces = [0, 0.08, 0.16, 0.23, 0.29, 0.34];
    bounces.forEach((time, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = index % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(140 + Math.random() * 80, ctx.currentTime + time);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + time + 0.05);

      gain.gain.setValueAtTime(0.35 / (index + 1), ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + 0.06);
    });
  }

  /**
   * 🃏 Card Flip / Draw / Play: Crisp paper flick
   */
  public playCardFlip() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  }

  /**
   * ⚡ Special Card Play (Reverse, Skip, Draw 4, UNO call)
   */
  public playCardSpecial() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [330, 440, 660, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);

      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.05 + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.05);
      osc.stop(ctx.currentTime + idx * 0.05 + 0.16);
    });
  }

  /**
   * 🪙 Cash Register / Property Buy / Win Coins
   */
  public playCashRegister() {
    const ctx = this.getContext();
    if (!ctx) return;

    // Metallic chime
    const freqs = [987.77, 1318.51, 1567.98];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.07);

      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.07);
      osc.stop(ctx.currentTime + i * 0.07 + 0.36);
    });
  }

  /**
   * 🗡️ Highland Gong / Murder Strike in The Traitors
   */
  public playTraitorGong() {
    const ctx = this.getContext();
    if (!ctx) return;

    // Low resonant metallic drone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(65, ctx.currentTime + 1.2);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.25);
  }

  /**
   * 🐍 Snake Venom Slide / Penalty Sound
   */
  public playSnakeHiss() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.45);

    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.46);
  }

  /**
   * 🪜 Ladder Climb / Level Up / Token Safe Zone
   */
  public playLadderClimb() {
    const ctx = this.getContext();
    if (!ctx) return;

    const scale = [261.63, 329.63, 392.0, 523.25, 659.25];
    scale.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);

      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.06);
      osc.stop(ctx.currentTime + idx * 0.06 + 0.14);
    });
  }

  /**
   * 🥊 Token Cut / Knockback in Ludo
   */
  public playTokenCut() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.16);
  }

  /**
   * 🪙 Coin Collect
   */
  public playCoin() {
    const ctx = this.getContext();
    if (!ctx) return;

    const freqs = [1046.5, 1396.91, 2093.0];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);

      gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.06);
      osc.stop(ctx.currentTime + i * 0.06 + 0.16);
    });
  }

  /**
   * 🖱️ UI Click
   */
  public playClick() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.02);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.03);
  }

  /**
   * 🎉 Victory Fanfare (legacy alias kept for Store / celebration integrations)
   */
  public playFanfare(): void {
    this.playVictory();
  }

  /**
   * 🎉 Victory Fanfare
   */
  public playVictory() {
    const ctx = this.getContext();
    if (!ctx) return;

    const fanfare = [
      { f: 523.25, t: 0.0, d: 0.15 },
      { f: 523.25, t: 0.18, d: 0.15 },
      { f: 523.25, t: 0.36, d: 0.15 },
      { f: 659.25, t: 0.54, d: 0.4 },
      { f: 783.99, t: 0.98, d: 0.6 },
    ];

    fanfare.forEach(({ f, t, d }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, ctx.currentTime + t);

      gain.gain.setValueAtTime(0.25, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + d + 0.02);
    });
  }

  /**
   * 🚶 Token Step Hop: Short, crisp wooden/plastic tap
   */
  public playStep() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320 + Math.random() * 40, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.035);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  }

  /**
   * 🔒 Jail Iron Door Slam: Heavy metallic impact + reverberation
   */
  public playJailDoor() {
    const ctx = this.getContext();
    if (!ctx) return;

    // Heavy slam
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);

    // Iron bar rattle clang
    [0.08, 0.16, 0.24].forEach((time, i) => {
      const metalOsc = ctx.createOscillator();
      const metalGain = ctx.createGain();
      metalOsc.type = 'sawtooth';
      metalOsc.frequency.setValueAtTime(800 - i * 150, ctx.currentTime + time);
      metalGain.gain.setValueAtTime(0.15, ctx.currentTime + time);
      metalGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.12);
      metalOsc.connect(metalGain);
      metalGain.connect(ctx.destination);
      metalOsc.start(ctx.currentTime + time);
      metalOsc.stop(ctx.currentTime + time + 0.13);
    });
  }

  /**
   * 🏗️ House / Hotel Construction: Solid double hammer tap
   */
  public playHouseBuild() {
    const ctx = this.getContext();
    if (!ctx) return;

    [0, 0.09].forEach((time, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(540 + idx * 80, ctx.currentTime + time);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + time + 0.06);

      gain.gain.setValueAtTime(0.3, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + 0.07);
    });
  }

  /**
   * 📜 Mortgage / Unmortgage Contract Stamp: Paper flick + dull thud
   */
  public playMortgage() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.13);
  }

  /**
   * 💸 Rent Payment: Quick coin exchange swoosh
   */
  public playRent() {
    const ctx = this.getContext();
    if (!ctx) return;

    const freqs = [880, 659.25, 523.25];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);

      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.05 + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.05);
      osc.stop(ctx.currentTime + idx * 0.05 + 0.2);
    });
  }

  /**
   * 💀 Bankruptcy Horn: Descending sad slide
   */
  public playBankruptcy() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [440, 415.3, 392, 349.23];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.2);

      gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.2 + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.2);
      osc.stop(ctx.currentTime + idx * 0.2 + 0.3);
    });
  }

  /**
   * 🌴 Vacation / Free Parking Jackpot: Rapid sparkling coin cascades
   */
  public playJackpot() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);

      gain.gain.setValueAtTime(0.22, ctx.currentTime + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.06);
      osc.stop(ctx.currentTime + idx * 0.06 + 0.28);
    });
  }

  /**
   * 📳 Mobile Haptic Vibration
   */
  public vibrate(pattern: number | number[] = 40) {
    if (typeof window !== 'undefined' && 'navigator' in window && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  /**
   * 📢 Authentic Tambola Speech Synthesis Caller (Hindi & Indian English)
   */
  public announceTambolaNumber(num: number, slangText?: string, language: 'en' | 'hi' = 'en') {
    if (this.isMuted) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Stop prior speeches

      const HINDI_NUMBERS: Record<number, string> = {
        1: 'Ek', 2: 'Do', 3: 'Teen', 4: 'Chaar', 5: 'Paanch', 6: 'Chhe', 7: 'Saat', 8: 'Aath', 9: 'Nau', 10: 'Dus',
        11: 'Gyarah', 12: 'Barah', 13: 'Terah', 14: 'Chaudah', 15: 'Pandrah', 16: 'Solah', 17: 'Satrah', 18: 'Atharah', 19: 'Unnees', 20: 'Bees',
        21: 'Ikkis', 22: 'Baais', 23: 'Teis', 24: 'Chaubees', 25: 'Pachchees', 26: 'Chhabbees', 27: 'Sattaais', 28: 'Atthaais', 29: 'Untees', 30: 'Tees',
        31: 'Iktees', 32: 'Battees', 33: 'Taintees', 34: 'Chautees', 35: 'Pentees', 36: 'Chhattees', 37: 'Saintees', 38: 'Adhtees', 39: 'Untalees', 40: 'Chalees',
        41: 'Iktalees', 42: 'Bayalees', 43: 'Taintalees', 44: 'Chawalees', 45: 'Paintalees', 46: 'Chhiyalees', 47: 'Saintalees', 48: 'Adhtalees', 49: 'Unchaas', 50: 'Pachaas',
        51: 'Ikyawan', 52: 'Baawan', 53: 'Tirpan', 54: 'Chauwan', 55: 'Pachpan', 56: 'Chhappan', 57: 'Sattawan', 58: 'Atthawan', 59: 'Unsath', 60: 'Saath',
        61: 'Iksath', 62: 'Baasath', 63: 'Tirsath', 64: 'Chausath', 65: 'Painsath', 66: 'Chhiyasath', 67: 'Sadsath', 68: 'Arsath', 69: 'Unhattar', 70: 'Sattar',
        71: 'Ikhattar', 72: 'Bahattar', 73: 'Tihattar', 74: 'Chauhattar', 75: 'Pachhattar', 76: 'Chhihattar', 77: 'Satattar', 78: 'Athhattar', 79: 'Unasi', 80: 'Assi',
        81: 'Ikyasi', 82: 'Bayasi', 83: 'Tirasi', 84: 'Chaurasi', 85: 'Pachasi', 86: 'Chhiyasi', 87: 'Satasi', 88: 'Atthasi', 89: 'Nauasi', 90: 'Nabbee'
      };

      let phrase = '';
      if (language === 'hi') {
        const hindiWord = HINDI_NUMBERS[num] || num.toString();
        phrase = `${hindiWord}! Number ${num}.`;
        if (slangText) phrase = `${slangText}. ${phrase}`;
      } else {
        if (num < 10) {
          phrase = `Single number ${num}.`;
        } else {
          const d1 = Math.floor(num / 10);
          const d2 = num % 10;
          phrase = `${d1} and ${d2}, number ${num}.`;
        }
        if (slangText) phrase = `${slangText}! ${phrase}`;
      }

      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Select matching voice
      const voices = window.speechSynthesis.getVoices();
      const hindiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN'));
      if (language === 'hi' && hindiVoice) {
        utterance.voice = hindiVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  }
}

export const soundFx = new SoundEffectsEngine();
