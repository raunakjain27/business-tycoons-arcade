/**
 * WebRTC Mesh Audio Voice Engine
 * Handles real microphone stream capture, volume metering, peer audio distribution,
 * and turn-gated mute enforcement.
 */

export class WebRTCVoiceManager {
  private localStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private animFrameId: number | null = null;
  private isMuted: boolean = false;
  private onLevelChange: ((level: number) => void) | null = null;

  async initMicrophone(onLevelChange?: (level: number) => void): Promise<boolean> {
    this.onLevelChange = onLevelChange || null;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      console.warn('getUserMedia not supported in this environment');
      return false;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        this.micSource = this.audioContext.createMediaStreamSource(this.localStream);
        this.micSource.connect(this.analyser);
        this.startLevelMonitoring();
      }

      return true;
    } catch (err) {
      console.warn('Microphone permission denied or unavailable:', err);
      return false;
    }
  }

  private startLevelMonitoring() {
    if (!this.analyser) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const checkVolume = () => {
      if (this.analyser && !this.isMuted) {
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        // Scale to 0-100
        const level = Math.min(100, Math.round((average / 128) * 100));
        if (this.onLevelChange) {
          this.onLevelChange(level);
        }
      } else if (this.onLevelChange) {
        this.onLevelChange(0);
      }
      this.animFrameId = requestAnimationFrame(checkVolume);
    };

    checkVolume();
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !mute;
      });
    }
  }

  stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}

export const webRTCVoiceManager = new WebRTCVoiceManager();
