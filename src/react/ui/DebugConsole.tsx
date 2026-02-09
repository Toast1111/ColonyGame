import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  appendDebugConsoleOutput,
  getDebugConsoleState,
  setDebugConsoleOpen,
  setDebugConsoleState,
  subscribeDebugConsole
} from '../stores/debugConsoleStore';

export function DebugConsole() {
  const state = useSyncExternalStore(subscribeDebugConsole, getDebugConsoleState, getDebugConsoleState);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);

  const system = (window as any).game?.debugConsoleSystem;
  const commandNames = useMemo(() => {
    if (!system?.getCommandNames) return [] as string[];
    return system.getCommandNames() as string[];
  }, [system]);

  useEffect(() => {
    if (state.open) {
      inputRef.current?.focus();
    }
  }, [state.open]);

  useEffect(() => {
    if (!outputRef.current) return;
    outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [state.output, state.open]);

  useEffect(() => {
    const trimmed = state.input.trim();
    if (!trimmed || trimmed.includes(' ')) {
      setSuggestions([]);
      return;
    }
    const matches = commandNames.filter((cmd) => cmd.startsWith(trimmed.toLowerCase()));
    setSuggestions(matches.slice(0, 6));
  }, [state.input, commandNames]);

  if (!state.open) return null;

  const runCommand = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (!system?.execute) {
      appendDebugConsoleOutput('debug console system not ready');
      return;
    }

    const history = [trimmed, ...state.history.filter((entry) => entry !== trimmed)].slice(0, 50);
    setDebugConsoleState({ history, historyIndex: -1 });

    appendDebugConsoleOutput(`> ${trimmed}`);
    const result = system.execute(trimmed) as string[];
    if (result && result.length) {
      appendDebugConsoleOutput(result);
    }
  };

  const handleSubmit = () => {
    runCommand(state.input);
    setDebugConsoleState({ input: '' });
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setDebugConsoleOpen(false);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!state.history.length) return;
      const nextIndex = Math.min(state.historyIndex + 1, state.history.length - 1);
      setDebugConsoleState({
        historyIndex: nextIndex,
        input: state.history[nextIndex] || state.input
      });
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (state.historyIndex <= 0) {
        setDebugConsoleState({ historyIndex: -1, input: '' });
        return;
      }
      const nextIndex = state.historyIndex - 1;
      setDebugConsoleState({
        historyIndex: nextIndex,
        input: state.history[nextIndex] || ''
      });
      return;
    }

    if (e.key === 'Tab' && suggestions.length) {
      e.preventDefault();
      setDebugConsoleState({ input: suggestions[0] });
    }
  };

  return (
    <div className="debug-console-overlay" role="dialog" aria-label="Debug console">
      <div className="debug-console-panel">
        <div className="debug-console-header">
          <div className="debug-console-title">Signal Console</div>
          <div className="debug-console-subtitle">diagnostic uplink</div>
          <button
            className="debug-console-close"
            type="button"
            onClick={() => setDebugConsoleOpen(false)}
            aria-label="Close debug console"
          >
            ✕
          </button>
        </div>

        <div className="debug-console-body">
          <div className="debug-console-output" ref={outputRef}>
            {state.output.length === 0 && (
              <div className="debug-console-empty">
                Run <span>help</span> to list commands.
              </div>
            )}
            {state.output.map((line, index) => (
              <div key={`${index}-${line}`} className="debug-console-line">
                {line}
              </div>
            ))}
          </div>

          <div className="debug-console-sidebar">
            <div className="debug-console-section">
              <div className="debug-console-section-title">Commands</div>
              <div className="debug-console-command-list">
                {commandNames.slice(0, 24).map((cmd) => (
                  <button
                    key={cmd}
                    type="button"
                    className="debug-console-command"
                    onClick={() => setDebugConsoleState({ input: cmd })}
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="debug-console-section">
                <div className="debug-console-section-title">Auto-complete</div>
                <div className="debug-console-suggestions">
                  {suggestions.map((cmd) => (
                    <div key={cmd} className="debug-console-suggestion">
                      {cmd}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="debug-console-input-row">
          <span className="debug-console-prompt">$</span>
          <input
            ref={inputRef}
            className="debug-console-input"
            type="text"
            value={state.input}
            onChange={(e) => setDebugConsoleState({ input: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="Type a command…"
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
          />
          <button
            className="debug-console-run"
            type="button"
            onClick={handleSubmit}
          >
            Run
          </button>
        </div>
      </div>
    </div>
  );
}
