import React, { useCallback, useEffect, useRef, useState } from 'react';
import { sendMessage } from '../../../shared/messaging/extension-messages';
import type { AIProvider, MessageMap } from '../../../shared/types';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import Dropdown from '../../components/Dropdown';

const PROVIDER_OPTIONS = [
  { value: 'gemini', label: 'Gemini' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'groq', label: 'Groq' },
];

type SavedKey = MessageMap['AI_KEY_INFO']['response']['keys'][number];

interface KeyManagerProps {
  onKeyAdded?: () => void;
  onKeyCountChange?: (keyCount: number) => void;
  /** First-run setup shows just the Gemini key box, without the saved-key list. */
  isCompact?: boolean;
}

/** Add, test and remove AI keys. Shared by Settings and first-run setup. Keys are never shown in full. */
export default function KeyManager({ onKeyAdded, onKeyCountChange, isCompact = false }: KeyManagerProps) {
  const [savedKeys, setSavedKeys] = useState<SavedKey[]>([]);
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [newKey, setNewKey] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [notice, setNotice] = useState<{ isSuccess: boolean; text: string }>();

  // Parents pass inline callbacks; reading the latest one through a ref keeps this load-once.
  const keyCountListener = useRef(onKeyCountChange);
  keyCountListener.current = onKeyCountChange;
  const reloadKeys = useCallback(
    () =>
      sendMessage('AI_KEY_INFO', undefined)
        .then((keyInfo) => {
          setSavedKeys(keyInfo.keys);
          keyCountListener.current?.(keyInfo.keys.length);
        })
        .catch(() => undefined),
    [],
  );
  useEffect(() => {
    void reloadKeys();
  }, [reloadKeys]);

  const runAction = async (action: string, work: () => Promise<string>) => {
    setBusyAction(action);
    setNotice(undefined);
    try {
      setNotice({ isSuccess: true, text: await work() });
    } catch (error) {
      setNotice({ isSuccess: false, text: error instanceof Error ? error.message : 'Request failed.' });
    } finally {
      setBusyAction('');
    }
  };
  const handleAddKey = () =>
    runAction('add', async () => {
      const reply = await sendMessage('AI_SAVE_KEY', { provider, key: newKey.trim() });
      if (!reply.success) throw new Error(reply.error ?? 'That key did not work.');
      setNewKey('');
      await reloadKeys();
      onKeyAdded?.();
      return 'Key works and is saved.';
    });
  const handleTestKey = (savedKey: SavedKey) =>
    runAction(savedKey.id, async () => {
      const reply = await sendMessage('AI_TEST_KEY', { id: savedKey.id });
      if (!reply.success || !reply.models?.length) throw new Error(reply.error ?? 'No usable models.');
      const gemmaCount = reply.models.filter((model) => model.startsWith('gemma')).length;
      return `Working: ${reply.models.length} models, ${gemmaCount} Gemma.`;
    });
  const handleRemoveKey = (savedKey: SavedKey) =>
    runAction(savedKey.id, async () => {
      if (!window.confirm('Remove this key?')) return 'Kept.';
      const reply = await sendMessage('AI_REMOVE_KEY', { id: savedKey.id });
      if (!reply.success) throw new Error(reply.error ?? 'Could not remove.');
      await reloadKeys();
      return 'Key removed.';
    });

  const isBusy = Boolean(busyAction);
  return (
    <div className="stack-sm">
      {!isCompact && savedKeys.length > 0 && (
        <div className="list">
          {savedKeys.map((savedKey) => (
            <div className="item" key={savedKey.id}>
              <div>
                <h4>{savedKey.provider}</h4>
                <p className="meta">
                  <code>{savedKey.masked}</code>
                </p>
              </div>
              <div className="row">
                <button className="btn" type="button" disabled={isBusy} onClick={() => void handleTestKey(savedKey)}>
                  {busyAction === savedKey.id ? <Spinner /> : 'Test'}
                </button>
                <button
                  className="btn quiet"
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleRemoveKey(savedKey)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <form
        className="stack-sm"
        onSubmit={(event) => {
          event.preventDefault();
          void handleAddKey();
        }}
      >
        <div className="row" style={{ alignItems: 'flex-end' }}>
          {!isCompact && (
            <div className="field" style={{ width: 120 }}>
              <span>Provider</span>
              <Dropdown
                ariaLabel="Provider"
                value={provider}
                options={PROVIDER_OPTIONS}
                onChange={(chosenProvider) => setProvider(chosenProvider as AIProvider)}
              />
            </div>
          )}
          <label className="field grow">
            <span>{isCompact ? 'Gemini API key' : 'API key'}</span>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="AIza…"
              value={newKey}
              onChange={(event) => setNewKey(event.target.value)}
            />
          </label>
          <button className="btn primary" type="submit" disabled={!newKey.trim() || isBusy}>
            {busyAction === 'add' ? <Spinner /> : 'Add'}
          </button>
        </div>
        <a className="small soft" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
          Get a free key at Google AI Studio <Icon name="external" />
        </a>
      </form>
      {notice && (
        <p className={notice.isSuccess ? 'note' : 'note err'} role="status">
          {notice.text}
        </p>
      )}
    </div>
  );
}
