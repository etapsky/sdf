// ─── Webview HTML Template — SDF Preview ──────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import * as vscode from 'vscode';
import type { SDFParseResult } from '@etapsky/sdf-kit';

/**
 * Generates the webview HTML for the SDF preview.
 * Embeds visual.pdf as base64 when present; otherwise shows meta/data/schema summary.
 */
export function getWebviewHtml(webview: vscode.Webview, sdf: SDFParseResult): string {
  const { meta, data, schema, pdfBytes } = sdf;
  const hasPdf = pdfBytes && pdfBytes.length > 0;
  const pdfBase64 = hasPdf ? Buffer.from(pdfBytes).toString('base64') : '';
  const schemaTitle = (schema as Record<string, unknown>).title as string | undefined ?? 'Schema';
  const csp = webview.cspSource;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; script-src 'unsafe-inline' ${csp}; style-src 'unsafe-inline' ${csp};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SDF Preview — ${meta.document_id}</title>
  <style>
    :root { --bg: var(--vscode-editor-background); --fg: var(--vscode-editor-foreground); }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 16px; font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--fg); background: var(--bg); }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--vscode-panel-border); }
    .badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
    .pdf-container { width: 100%; height: calc(100vh - 80px); min-height: 400px; }
    .pdf-container iframe { width: 100%; height: 100%; border: none; }
    .fallback { padding: 24px; }
    .fallback h3 { margin-top: 0; color: var(--vscode-textLink-foreground); }
    .fallback pre { overflow: auto; padding: 12px; background: var(--vscode-textCodeBlock-background); border-radius: 4px; font-size: 12px; }
    .meta-grid { display: grid; grid-template-columns: auto 1fr; gap: 4px 16px; font-size: 13px; }
    .meta-grid dt { color: var(--vscode-descriptionForeground); }
    .meta-grid dd { margin: 0; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <strong>SDF ${meta.sdf_version}</strong>
      <span class="badge" style="margin-left: 8px;">${meta.document_type ?? 'document'}</span>
      ${meta.signature_algorithm ? '<span class="badge">signed</span>' : '<span class="badge" style="opacity: 0.7;">unsigned</span>'}
    </div>
    <span style="font-size: 12px; color: var(--vscode-descriptionForeground);">${meta.document_id}</span>
  </div>

  ${
    hasPdf
      ? `<div class="pdf-container">
           <iframe src="data:application/pdf;base64,${pdfBase64}#toolbar=1" type="application/pdf"></iframe>
         </div>`
      : `<div class="fallback">
           <h3>No visual.pdf</h3>
           <p>This SDF archive does not contain visual.pdf. Showing meta and schema summary.</p>
           <h4>meta.json</h4>
           <dl class="meta-grid">
             <dt>document_id</dt><dd>${escape(meta.document_id)}</dd>
             <dt>issuer</dt><dd>${escape(meta.issuer)}</dd>
             <dt>created_at</dt><dd>${escape(meta.created_at)}</dd>
             <dt>document_type</dt><dd>${escape(meta.document_type ?? '—')}</dd>
           </dl>
           <h4>schema — ${escape(schemaTitle)}</h4>
           <pre>${escape(JSON.stringify(schema, null, 2).slice(0, 2000))}${(JSON.stringify(schema).length > 2000 ? '…' : '')}</pre>
           <h4>data (${Object.keys(data).length} fields)</h4>
           <pre>${escape(JSON.stringify(data, null, 2).slice(0, 1500))}${(JSON.stringify(data).length > 1500 ? '…' : '')}</pre>
         </div>`
  }
</body>
</html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
