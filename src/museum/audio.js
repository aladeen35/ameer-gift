// Music (YouTube link chosen by the customer) and soft synthesized footsteps. Sound starts after the first tap.
export function youtubeId(url) {
  const m = String(url || "").match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export class Sound {
  constructor() { this.muted = false; this.ready = false; this.player = null; this.ctx = null; this.wantMusic = null; }
  unlock() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.5; this.master.connect(this.ctx.destination); this._noise(); } catch (e) {}
    if (this.wantMusic) this._startYT(this.wantMusic);
  }
  setMusic(url) { const id = youtubeId(url); if (!id) return; this.wantMusic = id; if (this.ctx) this._startYT(id); }
  _startYT(id) {
    if (this.player) { try { this.player.playVideo(); } catch (e) {} return; }
    const make = () => {
      this.player = new window.YT.Player("yt", { width: 1, height: 1, videoId: id, playerVars: { autoplay: 1, loop: 1, playlist: id, controls: 0, playsinline: 1 },
        events: { onReady: e => { e.target.setVolume(55); if (this.muted) e.target.mute(); e.target.playVideo(); } } });
    };
    if (window.YT?.Player) return make();
    window.onYouTubeIframeAPIReady = make;
    const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.head.append(s);
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
    try { if (this.player) m ? this.player.mute() : this.player.unMute(); } catch (e) {}
  }
  _noise() {
    const n = this.ctx.sampleRate * 0.25; const b = this.ctx.createBuffer(1, n, this.ctx.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);
    this.stepBuf = b;
  }
  step(intensity = 1) {
    if (!this.ctx || this.muted || !this.stepBuf) return;
    const s = this.ctx.createBufferSource(); s.buffer = this.stepBuf; s.playbackRate.value = 0.8 + Math.random() * 0.3;
    const f = this.ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900 + Math.random() * 300;
    const g = this.ctx.createGain(); g.gain.value = 0.05 * intensity;
    s.connect(f); f.connect(g); g.connect(this.master); s.start();
  }
}
