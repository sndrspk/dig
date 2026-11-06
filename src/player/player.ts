import { reportError } from '../errors';
import { apiCall } from '../ib/client';
import { ensureAccessToken } from '../ib/auth';
import { loadTokens, readSettings } from '../storage';
import type { Album, Track } from '../types';
import { artworkUrl } from '../artwork';
import { historyParam, streamUrl, type HistoryEvent } from './stream';

export interface PlayerState {
  album: Album | null;
  queue: Track[];
  index: number;
  playing: boolean;
  currentTime: number;
  duration: number;
  track: Track | null;
}

const IDLE_ACCENT = '#7c3aed';
const PLAY_SCROBBLE_SECONDS = 15;

class Player {
  private audio: HTMLAudioElement | null = null;
  private state: PlayerState = {
    album: null,
    queue: [],
    index: -1,
    playing: false,
    currentTime: 0,
    duration: 0,
    track: null,
  };
  private listeners = new Set<() => void>();
  private trackStartedAt = 0;
  private scrobbled = false;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = (): PlayerState => this.state;

  private emit(): void {
    for (const l of this.listeners) l();
  }

  private getAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = document.createElement('audio');
      this.audio.preload = 'auto';
      document.body.appendChild(this.audio);
      this.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
      this.audio.addEventListener('play', () => this.setState({ playing: true }));
      this.audio.addEventListener('pause', () => this.setState({ playing: false, currentTime: this.audio?.currentTime ?? 0 }));
      this.audio.addEventListener('ended', () => this.next());
      this.audio.addEventListener('error', () => {
        reportError('audio playback', this.audio?.error?.message ?? 'unknown audio error');
      });
    }
    return this.audio;
  }

  private setState(patch: Partial<PlayerState>): void {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  private getAccessTokenSync(): string | null {
    const t = loadTokens();
    if (t && t.expiresAt - Date.now() > 60_000) return t.accessToken;
    return null;
  }

  playAlbum(album: Album, tracks: Track[], startIndex = 0): void {
    const token = this.getAccessTokenSync();
    if (token) {
      this.start(album, tracks, startIndex, token);
    } else {
      void ensureAccessToken()
        .then((t) => this.start(album, tracks, startIndex, t))
        .catch((err) => reportError('playback (token)', err));
    }
  }

  playTrack(album: Album, tracks: Track[], index: number): void {
    this.playAlbum(album, tracks, index);
  }

  private start(album: Album, tracks: Track[], index: number, token: string): void {
    const audio = this.getAudio();
    const track = tracks[index];
    if (!track) return;
    this.flushSkip();
    const settings = readSettings();
    const url = streamUrl(track, {
      server: settings.streamingServer,
      token,
      userId: settings.userId ?? '',
      bitrate: settings.bitrate ?? 128,
    });
    this.setState({ album, queue: tracks, index, track, currentTime: 0, duration: track.length || 0 });
    this.trackStartedAt = Date.now();
    this.scrobbled = false;
    audio.src = url;
    const p = audio.play();
    if (p) {
      p.catch((err) => {
        reportError('playback (autoplay)', err);
        this.setState({ playing: false });
      });
    }
    this.updateMediaSession(album, track);
    this.updateAccent(track);
  }

  toggle(): void {
    const audio = this.getAudio();
    if (!this.state.track) return;
    if (audio.paused) {
      const p = audio.play();
      if (p) p.catch((err) => reportError('playback (resume)', err));
    } else {
      audio.pause();
    }
  }

  next(): void {
    const { queue, index, album } = this.state;
    if (!album || index < 0) return;
    if (index + 1 < queue.length) {
      const token = this.getAccessTokenSync();
      if (token) this.start(album, queue, index + 1, token);
      else void ensureAccessToken().then((t) => this.start(album, queue, index + 1, t));
    } else {
      this.flushSkip();
      this.getAudio().pause();
      this.setState({ playing: false });
    }
  }

  prev(): void {
    const { queue, index, album } = this.state;
    if (!album || index < 0) return;
    const audio = this.getAudio();
    if (audio.currentTime > 3 && index >= 0) {
      audio.currentTime = 0;
      return;
    }
    if (index > 0) {
      const token = this.getAccessTokenSync();
      if (token) this.start(album, queue, index - 1, token);
      else void ensureAccessToken().then((t) => this.start(album, queue, index - 1, t));
    }
  }

  seek(seconds: number): void {
    const audio = this.getAudio();
    if (this.state.track) audio.currentTime = seconds;
  }

  private onTimeUpdate(): void {
    const audio = this.audio;
    if (!audio || !this.state.track) return;
    this.setState({ currentTime: audio.currentTime, duration: audio.duration || this.state.track.length });
    if (!this.scrobbled && audio.currentTime >= PLAY_SCROBBLE_SECONDS) {
      this.scrobbled = true;
      void this.sendHistory([{ trackId: this.state.track.id, event: 'play' }]);
    }
    if ('mediaSession' in navigator && navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: audio.duration || this.state.track.length,
          position: audio.currentTime,
          playbackRate: 1,
        });
      } catch (err) {
        reportError('media session position', err);
      }
    }
  }

  private flushSkip(): void {
    const audio = this.audio;
    const track = this.state.track;
    if (!track || !audio) return;
    const elapsed = (Date.now() - this.trackStartedAt) / 1000;
    if (!this.scrobbled && elapsed < PLAY_SCROBBLE_SECONDS) {
      void this.sendHistory([{ trackId: track.id, event: 'skip' }]);
    }
  }

  private async sendHistory(events: HistoryEvent[]): Promise<void> {
    try {
      const res = await apiCall<{ result?: boolean; message?: string }>('status', historyParam(events));
      if (res.result === false) reportError('scrobble', res.message ?? 'history rejected');
    } catch (err) {
      reportError('scrobble', err);
    }
  }

  private updateMediaSession(album: Album, track: Track): void {
    if (!('mediaSession' in navigator)) return;
    try {
      const art = artworkUrl(track.artworkId ?? album.artworkId, 1000);
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artistName || album.artist,
        album: album.title,
        artwork: art ? [{ src: art, sizes: '1000x1000', type: 'image/jpeg' }] : [],
      });
      navigator.mediaSession.setActionHandler('play', () => this.toggle());
      navigator.mediaSession.setActionHandler('pause', () => this.toggle());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
    } catch (err) {
      reportError('media session', err);
    }
  }

  private updateAccent(track: Track): void {
    const art = artworkUrl(track.artworkId, 300);
    if (!art) {
      document.documentElement.style.setProperty('--accent', IDLE_ACCENT);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 50;
        c.height = 50;
        const ctx = c.getContext('2d');
        if (!ctx) throw new Error('no 2d context');
        ctx.drawImage(img, 0, 0, 50, 50);
        const data = ctx.getImageData(0, 0, 50, 50).data;
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          n++;
        }
        if (n === 0) throw new Error('no opaque pixels');
        document.documentElement.style.setProperty('--accent', `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`);
      } catch (err) {
        console.warn('[dig] accent sampling failed, using idle purple:', err);
        document.documentElement.style.setProperty('--accent', IDLE_ACCENT);
      }
    };
    img.onerror = () => {
      console.warn('[dig] artwork failed to load for accent sampling, using idle purple');
      document.documentElement.style.setProperty('--accent', IDLE_ACCENT);
    };
    img.src = art;
  }
}

export const player = new Player();
