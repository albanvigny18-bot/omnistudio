/**
 * OmniStudio Professional Web Audio Sound FX & Ducking Synthesizer
 * Generates pristine UI audio feedback with zero external network latency.
 */

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgGainNode: GainNode | null = null;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public playClick() { this.play('click'); }
  public playTransition() { this.play('transition'); }
  public playCorrect() { this.play('correct'); }
  public playWrong() { this.play('wrong'); }
  public playHover() { this.play('hover'); }
  public playUnlock() { this.play('unlock'); }

  public play(type: 'click' | 'hover' | 'correct' | 'wrong' | 'unlock' | 'transition' | 'timer_tick') {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    switch (type) {
      case 'click': {
        // Crisp tactile click
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, t);
        osc.frequency.exponentialRampToValueAtTime(140, t + 0.04);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.04);
        break;
      }

      case 'hover': {
        // Subtle micro-tone hover
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(580, t);
        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.03);
        break;
      }

      case 'correct': {
        // Glorious two-tone harmonic chime
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + i * 0.07);
          gain.gain.setValueAtTime(0.14, t + i * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t + i * 0.07);
          osc.stop(t + i * 0.07 + 0.35);
        });
        break;
      }

      case 'wrong': {
        // Soft error buzz / low tone
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.linearRampToValueAtTime(110, t + 0.22);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.22);
        break;
      }

      case 'unlock': {
        // Magical upward sparkling arpeggio
        [392, 523, 659, 784, 1046, 1318].forEach((f, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, t + i * 0.05);
          gain.gain.setValueAtTime(0.12, t + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.4);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t + i * 0.05);
          osc.stop(t + i * 0.05 + 0.4);
        });
        break;
      }

      case 'transition': {
        // Smooth atmospheric whoosh
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(440, t + 0.15);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.18);
        break;
      }

      case 'timer_tick': {
        // Subtle clock tick
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.02);
        break;
      }
    }
  }

  // Audio ducking: lowers background volume smoothly during voiceover or video action
  public duck(duckingFactor: number = 0.3, durationSeconds: number = 1.5) {
    if (!this.ctx || !this.bgGainNode) return;
    const t = this.ctx.currentTime;
    this.bgGainNode.gain.cancelScheduledValues(t);
    this.bgGainNode.gain.setValueAtTime(this.bgGainNode.gain.value, t);
    this.bgGainNode.gain.linearRampToValueAtTime(duckingFactor, t + 0.1);
    this.bgGainNode.gain.linearRampToValueAtTime(1.0, t + durationSeconds);
  }
}

export const soundFX = new SoundEffectsEngine();
