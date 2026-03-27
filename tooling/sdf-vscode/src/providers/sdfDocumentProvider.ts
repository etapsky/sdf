// ─── SDF Custom Editor Provider — Preview .sdf in Webview ─────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { loadSDF } from '../utils/sdf';
import { getWebviewHtml } from '../webview/html';

class SDFDocument implements vscode.CustomDocument {
  public readonly pdfTempPath: string | undefined;

  constructor(
    public readonly uri: vscode.Uri,
    public readonly sdf: Awaited<ReturnType<typeof loadSDF>>
  ) {
    if (sdf.pdfBytes && sdf.pdfBytes.length > 0) {
      this.pdfTempPath = path.join(os.tmpdir(), `sdf-preview-${sdf.meta.document_id}.pdf`);
      fs.writeFileSync(this.pdfTempPath, Buffer.from(sdf.pdfBytes));
    }
  }

  dispose(): void {
    if (this.pdfTempPath) {
      try { fs.unlinkSync(this.pdfTempPath); } catch { /* ignore */ }
    }
  }
}

export class SDFDocumentProvider implements vscode.CustomReadonlyEditorProvider<SDFDocument> {
  constructor(private readonly extensionUri: vscode.Uri) {}

  async openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken
  ): Promise<SDFDocument> {
    const sdf = await loadSDF(uri.fsPath);
    return new SDFDocument(uri, sdf);
  }

  async resolveCustomEditor(
    document: SDFDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const distUri = vscode.Uri.joinPath(this.extensionUri, 'dist');
    const pdfJsUri = webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath(distUri, 'pdf.js'));
    const pdfWorkerUri = webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath(distUri, 'pdf.worker.js'));

    // Also allow temp dir for fallback
    const tmpUri = vscode.Uri.file(os.tmpdir());

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [distUri, tmpUri],
    };

    // Pass PDF as base64 string directly — avoids needing fetch() in webview
    const pdfBase64 = document.sdf.pdfBytes && document.sdf.pdfBytes.length > 0
      ? Buffer.from(document.sdf.pdfBytes).toString('base64')
      : '';

    webviewPanel.webview.html = getWebviewHtml(
      webviewPanel.webview,
      document.sdf,
      pdfBase64,
      pdfJsUri,
      pdfWorkerUri,
    );
  }
}
