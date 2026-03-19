// ─── SDF Custom Editor Provider — Preview .sdf in Webview ─────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import * as vscode from 'vscode';
import { loadSDF } from '../utils/sdf';
import { getWebviewHtml } from '../webview/html';

/**
 * Custom document backing an .sdf file.
 * Holds parsed meta, data, schema, and PDF bytes for the webview.
 */
class SDFDocument implements vscode.CustomDocument {
  constructor(
    public readonly uri: vscode.Uri,
    public readonly sdf: Awaited<ReturnType<typeof loadSDF>>
  ) {}

  dispose(): void {
    // No-op for readonly
  }
}

/**
 * Read-only custom editor provider for .sdf files.
 * Extracts visual.pdf and renders it in a webview; falls back to meta/data/schema
 * when PDF is absent.
 */
export class SDFDocumentProvider implements vscode.CustomReadonlyEditorProvider<SDFDocument> {
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
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };

    webviewPanel.webview.html = getWebviewHtml(webviewPanel.webview, document.sdf);
  }
}
