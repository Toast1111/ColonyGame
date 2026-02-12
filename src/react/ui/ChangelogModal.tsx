import { useEffect, useRef, useSyncExternalStore } from 'react';
import { getChangelogState, setChangelogState, setChangelogVisible, subscribeChangelog } from '../stores/changelogStore';
import { loadChangelogEntries } from './changelogData';
import type { CommitInfo } from '../stores/changelogTypes';

export function ChangelogModal() {
  const state = useSyncExternalStore(subscribeChangelog, getChangelogState, getChangelogState);
  const prevVisible = useRef(state.visible);

  useEffect(() => {
    if (prevVisible.current !== state.visible) {
      try {
        (window as any).game?.audioManager?.play(state.visible ? 'ui.panel.open' : 'ui.panel.close');
      } catch {}
      prevVisible.current = state.visible;
    }
  }, [state.visible]);

  useEffect(() => {
    if (!state.visible || state.loading || state.entries) return;

    let cancelled = false;
    setChangelogState({ loading: true, error: null });
    loadChangelogEntries()
      .then((entries) => {
        if (cancelled) return;
        if (entries.length === 0) {
          setChangelogState({ loading: false, error: 'Unable to load changelog.' });
          return;
        }
        setChangelogState({ loading: false, entries, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Failed to load changelog:', error);
        setChangelogState({ loading: false, error: 'Unable to load changelog.' });
      });

    return () => {
      cancelled = true;
    };
  }, [state.visible, state.loading, state.entries]);

  useEffect(() => {
    if (!state.visible) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        setChangelogVisible(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.visible]);

  if (!state.visible) {
    return null;
  }

  return (
    <div className="modal changelog-modal">
      <div className="modal-backdrop" onClick={() => setChangelogVisible(false)} />
      <div className="modal-container">
        <div className="modal-header">
          <h2>Change Log</h2>
          <button className="modal-close" type="button" aria-label="Close" onClick={() => setChangelogVisible(false)}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="changelog-content">
            {state.loading && (
              <div className="changelog-loading">
                <div className="spinner" />
                <p>Loading changelog...</p>
              </div>
            )}
            {!state.loading && state.error && (
              <div className="changelog-error">
                <h3>Unable to Load Changelog</h3>
                <p>Could not fetch changelog from GitHub or local files.</p>
                <p>
                  Please check the <a href="https://github.com/Toast1111/ColonyGame/releases" target="_blank" rel="noreferrer">GitHub repository</a> for the latest updates.
                </p>
              </div>
            )}
            {!state.loading && !state.error && state.entries?.map((entry) => (
              <div key={`${entry.version}-${entry.date}`} className={`changelog-entry ${entry.isPrerelease ? 'prerelease' : ''}`}>
                <div className="changelog-header">
                  <h3>
                    {entry.version}
                    {entry.isPrerelease ? <span className="prerelease-badge">Pre-release</span> : null}
                  </h3>
                  <span className="changelog-date">{entry.date}</span>
                </div>
                <div className="changelog-body">
                  <div dangerouslySetInnerHTML={{ __html: entry.contentHtml }} />
                  {entry.commits && entry.commits.length > 0 ? (
                    <div className="changelog-commits">
                      <h4>Commits in this release</h4>
                      {entry.commits.map((commit: CommitInfo) => (
                        <div key={commit.sha + commit.message} className="changelog-commit">
                          <span className="commit-sha">{commit.sha}</span>
                          <span className="commit-message">{commit.message}</span>
                          <span className="commit-date">{commit.date}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
