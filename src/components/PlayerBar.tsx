import { useSyncExternalStore } from 'react';
import { useState } from 'react';
import { artworkUrl } from '../artwork';
import { fmtTrackLength } from '../format';
import { player } from '../player/player';

export function PlayerBar() {
  const state = useSyncExternalStore(player.subscribe, player.getState);
  const [expanded, setExpanded] = useState(false);
  if (!state.track || !state.album) return null;

  const art = artworkUrl(state.track.artworkId ?? state.album.artworkId, 150);
  const bigArt = artworkUrl(state.track.artworkId ?? state.album.artworkId, 1000);
  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  return (
    <>
      <div
        className="player-bar"
        onClick={() => setExpanded(true)}
        role="button"
        tabIndex={0}
        aria-label="Open now playing"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setExpanded(true);
        }}
      >
        {art ? (
          <img className="player-art" src={art} alt="" />
        ) : (
          <div className="player-art cover-empty">♪</div>
        )}
        <div className="player-meta">
          <span className="player-title">{state.track.title}</span>
          <span className="muted small">
            {state.track.artistName || state.album.artist} — {state.album.title}
          </span>
        </div>
        <div className="player-controls" onClick={(e) => e.stopPropagation()}>
          <button className="pbtn" onClick={() => player.prev()} aria-label="Previous track">
            ⏮
          </button>
          <button
            className="pbtn play"
            onClick={() => player.toggle()}
            aria-label={state.playing ? 'Pause' : 'Play'}
          >
            {state.playing ? '⏸' : '▶'}
          </button>
          <button className="pbtn" onClick={() => player.next()} aria-label="Next track">
            ⏭
          </button>
        </div>
        <div className="player-progress" onClick={(e) => e.stopPropagation()}>
          <span className="muted small">{fmtTrackLength(state.currentTime)}</span>
          <input
            type="range"
            min={0}
            max={state.duration || 0}
            step={1}
            value={Math.min(state.currentTime, state.duration || 0)}
            onChange={(e) => player.seek(Number(e.target.value))}
            aria-label="Seek"
          />
          <span className="muted small">{fmtTrackLength(state.duration)}</span>
        </div>
        <div className="player-progress-bar" style={{ width: `${progress}%` }} aria-hidden />
      </div>
      {expanded && (
        <div
          className="now-playing"
          onClick={() => setExpanded(false)}
          role="dialog"
          aria-label="Now playing"
        >
          <div className="now-playing-inner" onClick={(e) => e.stopPropagation()}>
            <button className="btn now-playing-close" onClick={() => setExpanded(false)}>
              ↓ Close
            </button>
            {bigArt ? (
              <img className="now-playing-art" src={bigArt} alt="" />
            ) : (
              <div className="now-playing-art cover-empty">♪</div>
            )}
            <div className="now-playing-meta">
              <span className="now-playing-title">{state.track.title}</span>
              <span className="muted small">
                {state.track.artistName || state.album.artist} — {state.album.title}
              </span>
            </div>
            <div className="now-playing-seek">
              <span className="muted small">{fmtTrackLength(state.currentTime)}</span>
              <input
                type="range"
                min={0}
                max={state.duration || 0}
                step={1}
                value={Math.min(state.currentTime, state.duration || 0)}
                onChange={(e) => player.seek(Number(e.target.value))}
                aria-label="Seek"
              />
              <span className="muted small">{fmtTrackLength(state.duration)}</span>
            </div>
            <div className="now-playing-controls">
              <button className="pbtn" onClick={() => player.prev()} aria-label="Previous track">
                ⏮
              </button>
              <button
                className="pbtn play"
                onClick={() => player.toggle()}
                aria-label={state.playing ? 'Pause' : 'Play'}
              >
                {state.playing ? '⏸' : '▶'}
              </button>
              <button className="pbtn" onClick={() => player.next()} aria-label="Next track">
                ⏭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
