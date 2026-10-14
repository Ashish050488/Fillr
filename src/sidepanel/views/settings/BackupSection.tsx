import React from 'react';
import { exportBackup, importBackup } from '../../../shared/storage/extension-storage';
import { downloadText } from '../../services/text-export';

const RELOAD_AFTER_IMPORT_MILLISECONDS = 700;

/** Export your profile and tracker to a file, or restore from one. API keys are never included. */
export default function BackupSection({ onToast }: { onToast: (message: string) => void }) {
  const handleExport = async () => {
    const backup = await exportBackup();
    const backupDate = new Date().toISOString().slice(0, 10);
    downloadText(`jobfill-backup-${backupDate}.json`, JSON.stringify(backup, null, 2), 'application/json');
    onToast('Backup saved. Keys are never included.');
  };
  const handleImport = async (backupFile: File) => {
    try {
      await importBackup(JSON.parse(await backupFile.text()));
      onToast('Restored. Reloading…');
      window.setTimeout(() => window.location.reload(), RELOAD_AFTER_IMPORT_MILLISECONDS);
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Could not import.');
    }
  };

  return (
    <section className="stack-sm">
      <p className="section-title">Your data</p>
      <p className="muted small">
        Everything stays in this browser. Only resume and job text go to Google's AI when you use it.
      </p>
      <div className="row">
        <button className="btn" type="button" onClick={() => void handleExport()}>
          Export backup
        </button>
        <label className="btn" style={{ cursor: 'pointer' }}>
          Import
          <input
            hidden
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              const backupFile = event.target.files?.[0];
              if (backupFile) void handleImport(backupFile);
            }}
          />
        </label>
      </div>
    </section>
  );
}
