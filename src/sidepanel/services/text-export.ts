export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/** Save text as a .txt download, e.g. a cover letter. */
export function downloadText(fileName: string, text: string, mimeType = 'text/plain'): void {
  const downloadUrl = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = fileName;
  downloadLink.click();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}
