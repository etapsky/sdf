// ─── Webview HTML Template — SDF Preview ──────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import * as vscode from 'vscode';
import type { SDFParseResult } from '@etapsky/sdf-kit';

export function getWebviewHtml(
  webview: vscode.Webview,
  sdf: SDFParseResult,
  pdfBase64: string,
  pdfJsUri: vscode.Uri,
  pdfWorkerUri: vscode.Uri,
): string {
  const { meta, data, schema } = sdf;
  const csp = webview.cspSource;
  const hasPdf = pdfBase64.length > 0;

  const metaRows = buildMetaRows(meta);
  const dataJson = JSON.stringify(data, null, 2);
  const schemaTitle = (schema as Record<string, unknown>).title as string | undefined ?? 'schema.json';
  const dataFieldCount = Object.keys(data).length;
  const isSigned = !!meta.signature_algorithm;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' ${csp}; style-src 'unsafe-inline'; worker-src ${csp} blob:; connect-src ${csp};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SDF — ${esc(meta.document_id)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    /* ── Header ── */
    .header {
      flex-shrink: 0;
      padding: 8px 16px;
      border-bottom: 1px solid var(--vscode-panel-border);
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .doc-title { font-weight: 600; font-size: 13px; }
    .badge {
      font-size: 11px; padding: 1px 7px; border-radius: 3px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }
    .badge.muted { opacity: 0.55; }
    .badge.signed   { background: #1a7f4e22; color: #4ec994; border: 1px solid #1a7f4e55; }
    .badge.unsigned { background: #8b6f2222; color: #c9a227; border: 1px solid #c9a22755; }
    .doc-id {
      margin-left: auto;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      font-family: var(--vscode-editor-font-family, monospace);
    }

    /* ── Tabs ── */
    .tabs {
      flex-shrink: 0;
      display: flex;
      border-bottom: 1px solid var(--vscode-panel-border);
      background: var(--vscode-editorGroupHeader-tabsBackground, var(--vscode-editor-background));
    }
    .tab {
      padding: 7px 16px;
      font-size: 12px;
      font-family: inherit;
      color: var(--vscode-tab-inactiveForeground);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      white-space: nowrap;
    }
    .tab:hover { color: var(--vscode-tab-activeForeground); }
    .tab.active {
      color: var(--vscode-tab-activeForeground);
      border-bottom-color: var(--vscode-focusBorder);
    }
    .tab-count {
      margin-left: 5px; font-size: 10px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 0 5px; border-radius: 8px;
    }

    /* ── Content ── */
    .tab-content { display: none; flex: 1; overflow: hidden; }
    .tab-content.active { display: flex; flex-direction: column; }

    /* PDF */
    #pane-pdf { background: #404040; }
    #pdf-canvas-container {
      flex: 1; overflow-y: auto; overflow-x: auto;
      display: flex; flex-direction: column; align-items: center;
      padding: 16px; gap: 8px;
    }
    #pdf-canvas-container canvas {
      display: block;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      max-width: 100%;
    }
    #pdf-loading {
      flex: 1; display: flex; align-items: center; justify-content: center;
      flex-direction: column; gap: 10px;
      color: #ccc; font-size: 13px;
    }
    .spinner {
      width: 28px; height: 28px;
      border: 3px solid rgba(255,255,255,0.2);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .no-pdf {
      flex: 1; display: flex; align-items: center; justify-content: center;
      flex-direction: column; gap: 8px;
      color: var(--vscode-descriptionForeground); font-size: 13px;
    }

    /* JSON / meta panes */
    .pane-scroll { flex: 1; overflow: auto; padding: 16px; }

    /* Meta table */
    .meta-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .meta-table tr { border-bottom: 1px solid var(--vscode-panel-border); }
    .meta-table tr:last-child { border-bottom: none; }
    .meta-table td { padding: 6px 8px; vertical-align: top; }
    .meta-table td:first-child {
      width: 170px;
      color: var(--vscode-descriptionForeground);
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
    }
    .meta-val-mono {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px; word-break: break-all;
    }
    .tag-list { display: flex; flex-wrap: wrap; gap: 4px; }
    .tag {
      font-size: 11px; padding: 1px 6px; border-radius: 3px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }

    /* JSON */
    .json-block {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px; line-height: 1.6; white-space: pre;
    }
    .jk { color: var(--vscode-symbolIcon-fieldForeground,  #9cdcfe); }
    .js { color: var(--vscode-symbolIcon-stringForeground, #ce9178); }
    .jn { color: #b5cea8; }
    .jb { color: #569cd6; }
    .jz { color: var(--vscode-disabledForeground); }

    /* Schema */
    .schema-prop-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
    .schema-prop {
      display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
      font-size: 12px; padding: 4px 8px;
      background: var(--vscode-textCodeBlock-background);
      border-radius: 3px;
      font-family: var(--vscode-editor-font-family, monospace);
    }
    .sp-name { font-weight: 600; }
    .sp-type { color: var(--vscode-descriptionForeground); font-size: 11px; }
    .sp-req  { color: #e45050; font-size: 10px; }
    .sp-desc { color: var(--vscode-descriptionForeground); font-size: 11px; }
    .section-label {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--vscode-descriptionForeground);
      margin-bottom: 8px; margin-top: 16px;
    }
    .section-label:first-child { margin-top: 0; }
  </style>
</head>
<body>

  <div class="header">
    <span class="doc-title">${esc(meta.document_type ?? 'SDF Document')}</span>
    <span class="badge">${esc(meta.sdf_version)}</span>
    ${meta.schema_id ? `<span class="badge muted">${esc(meta.schema_id)}</span>` : ''}
    <span class="badge ${isSigned ? 'signed' : 'unsigned'}">${isSigned ? '✓ ' + esc(meta.signature_algorithm!) : 'unsigned'}</span>
    <span class="doc-id">${esc(meta.document_id)}</span>
  </div>

  <div class="tabs">
    <button class="tab ${hasPdf ? 'active' : ''}" onclick="switchTab('pdf')">
      visual.pdf${!hasPdf ? ' <span class="tab-count">—</span>' : ''}
    </button>
    <button class="tab ${!hasPdf ? 'active' : ''}" onclick="switchTab('meta')">meta.json</button>
    <button class="tab" onclick="switchTab('data')">data.json<span class="tab-count">${dataFieldCount}</span></button>
    <button class="tab" onclick="switchTab('schema')">${esc(schemaTitle)}<span class="tab-count">schema</span></button>
  </div>

  <!-- PDF -->
  <div id="pane-pdf" class="tab-content ${hasPdf ? 'active' : ''}">
    ${hasPdf
      ? `<div id="pdf-loading"><div class="spinner"></div><span>Rendering PDF…</span></div>
         <div id="pdf-canvas-container" style="display:none;"></div>`
      : `<div class="no-pdf"><span style="font-size:32px;">📄</span><span>No visual.pdf in this SDF archive</span></div>`
    }
  </div>

  <!-- meta.json -->
  <div id="pane-meta" class="tab-content ${!hasPdf ? 'active' : ''}">
    <div class="pane-scroll">
      <table class="meta-table">${metaRows}</table>
    </div>
  </div>

  <!-- data.json -->
  <div id="pane-data" class="tab-content">
    <div class="pane-scroll">
      <div class="json-block">${colorJson(dataJson)}</div>
    </div>
  </div>

  <!-- schema.json -->
  <div id="pane-schema" class="tab-content">
    <div class="pane-scroll">
      ${buildSchemaPane(schema, schemaTitle)}
    </div>
  </div>

  ${hasPdf ? `<script src="${pdfJsUri}"></script>` : ''}
  <script>
    function switchTab(id) {
      const panes = ['pdf','meta','data','schema'];
      document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', panes[i] === id));
      document.querySelectorAll('.tab-content').forEach(p => p.classList.toggle('active', p.id === 'pane-' + id));
    }

    ${hasPdf ? `
    (function() {
      const PDF_BASE64 = '${pdfBase64}';
      const WORKER_SRC = '${pdfWorkerUri}';

      function b64ToUint8(b64) {
        const bin = atob(b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return arr;
      }

      async function renderPdf() {
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_SRC;
          const pdfData = b64ToUint8(PDF_BASE64);
          const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
          const container = document.getElementById('pdf-canvas-container');
          const loading   = document.getElementById('pdf-loading');

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.width  = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;
            container.appendChild(canvas);
          }

          loading.style.display = 'none';
          container.style.display = 'flex';
        } catch(e) {
          document.getElementById('pdf-loading').innerHTML =
            '<span style="color:#e45050;">Failed to render PDF: ' + e.message + '</span>';
        }
      }

      renderPdf();
    })();
    ` : ''}
  </script>
</body>
</html>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildMetaRows(meta: SDFParseResult['meta']): string {
  const rows: string[] = [];
  const add = (key: string, val: string, mono = false) =>
    rows.push(`<tr><td>${esc(key)}</td><td>${mono ? `<span class="meta-val-mono">${esc(val)}</span>` : esc(val)}</td></tr>`);

  add('document_id',   meta.document_id, true);
  add('sdf_version',   meta.sdf_version);
  if (meta.document_type)      add('document_type',    meta.document_type);
  if (meta.document_version)   add('document_version', meta.document_version);
  if (meta.schema_id)          add('schema_id',        meta.schema_id, true);
  add('issuer',        meta.issuer);
  if (meta.issuer_id)          add('issuer_id',        meta.issuer_id, true);
  if (meta.recipient)          add('recipient',        meta.recipient);
  if (meta.recipient_id)       add('recipient_id',     meta.recipient_id, true);
  add('created_at',    meta.created_at);
  if (meta.expires_at)         add('expires_at',       meta.expires_at);
  if (meta.parent_document_id) add('parent_document_id', meta.parent_document_id, true);
  if (meta.signature_algorithm) add('signature_algorithm', meta.signature_algorithm);

  if (meta.tags?.length) {
    const tagHtml = `<div class="tag-list">${meta.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>`;
    rows.push(`<tr><td>tags</td><td>${tagHtml}</td></tr>`);
  }
  return rows.join('\n');
}

function buildSchemaPane(schema: Record<string, unknown>, _title: string): string {
  const required   = (schema.required as string[] | undefined) ?? [];
  const properties = (schema.properties as Record<string, Record<string, unknown>> | undefined) ?? {};
  const entries    = Object.entries(properties);

  const propList = entries.length > 0
    ? `<div class="section-label">Properties (${entries.length})</div>
       <div class="schema-prop-list">${entries.map(([name, def]) => {
         const type  = Array.isArray(def.type) ? (def.type as string[]).join(' | ') : (def.type as string | undefined ?? '');
         const fmt   = def.format ? ` · ${esc(def.format as string)}` : '';
         const isReq = required.includes(name);
         return `<div class="schema-prop">
           <span class="sp-name">${esc(name)}</span>
           <span class="sp-type">${esc(type)}${fmt}</span>
           ${isReq ? '<span class="sp-req">required</span>' : ''}
           ${def.description ? `<span class="sp-desc">— ${esc(def.description as string)}</span>` : ''}
         </div>`;
       }).join('')}</div>`
    : '';

  return `${propList}
    <div class="section-label">Full schema.json</div>
    <div class="json-block">${colorJson(JSON.stringify(schema, null, 2))}</div>`;
}

function colorJson(json: string): string {
  return esc(json)
    .replace(/(&quot;[^&]+&quot;)(\s*:)/g, '<span class="jk">$1</span>$2')
    .replace(/:\s*(&quot;[^&]*&quot;)/g, ': <span class="js">$1</span>')
    .replace(/:\s*(-?\d+\.?\d*)/g,       ': <span class="jn">$1</span>')
    .replace(/:\s*(true|false)/g,         ': <span class="jb">$1</span>')
    .replace(/:\s*(null)/g,               ': <span class="jz">$1</span>');
}
