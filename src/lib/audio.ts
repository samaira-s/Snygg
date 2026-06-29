class AudioSynth {
  private ctx: AudioContext | null = null;

  private getContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Cozy double bird-chirp when completed a task
  playTaskComplete() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      
      const chirp = (startTime: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        
        // Fast pitch sweep up and down to sound like a native forest bird
        osc.frequency.setValueAtTime(1400, now + startTime);
        osc.frequency.exponentialRampToValueAtTime(3400, now + startTime + 0.05);
        osc.frequency.exponentialRampToValueAtTime(2000, now + startTime + 0.12);
        
        gain.gain.setValueAtTime(0, now + startTime);
        gain.gain.linearRampToValueAtTime(0.06, now + startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + startTime + 0.12);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + startTime);
        osc.stop(now + startTime + 0.13);
      };

      chirp(0);
      chirp(0.14); // Cute double-chirp!
    } catch (e) {
      // Graceful failure
    }
  }

  // Cozy warm folk-style ascending bell arpeggio for milestones
  playMilestone() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // E4, G4, C5, E5, G5, C6
      const durations = [0.6, 0.6, 0.8, 0.8, 1.0, 1.5];
      
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        
        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.07, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + durations[idx]);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + durations[idx]);
      });
    } catch (e) {
      // Graceful failure
    }
  }

  // Cozy organic hollow wood tick to start timers
  playTimerStart() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      // Graceful failure
    }
  }

  // Gentle pentatonic wind chimes when focus session concludes
  playTimerEnd() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // High pleasant pentatonic wind chime notes (E6 -> E7)
      const notes = [1318.51, 1567.98, 1975.53, 2349.32, 2637.02];
      const delays = [0, 0.2, 0.45, 0.7, 0.95];
      const volumes = [0.05, 0.04, 0.05, 0.03, 0.03];
      
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delays[idx]);
        
        // Subtle drift representing gentle breezes
        osc.frequency.linearRampToValueAtTime(freq + (Math.random() - 0.5) * 15, now + delays[idx] + 2.5);
        
        gain.gain.setValueAtTime(0, now + delays[idx]);
        gain.gain.linearRampToValueAtTime(volumes[idx], now + delays[idx] + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delays[idx] + 2.8);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + delays[idx]);
        osc.stop(now + delays[idx] + 2.8);
      });
    } catch (e) {
      // Graceful failure
    }
  }
}

export const audioSynth = new AudioSynth();
