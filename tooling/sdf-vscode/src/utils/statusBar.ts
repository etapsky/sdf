// ─── Status Bar Item — SDF Document Info ────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import * as vscode from 'vscode';
import * as path from 'path';
import { loadSDF } from './sdf';

let statusBarItem: vscode.StatusBarItem | undefined;

/**
 * Initialize the status bar item and register listeners.
 */
export function initStatusBar(context: vscode.ExtensionContext): void {
  const config = vscode.workspace.getConfiguration('sdf');
  if (!config.get<boolean>('statusBar.enabled', true)) return;

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusBarItem);

  const update = (editor?: vscode.TextEditor) => {
    if (!editor?.document.uri.fsPath.endsWith('.sdf')) {
      statusBarItem?.hide();
      return;
    }

    const fp = editor.document.uri.fsPath;
    loadSDF(fp)
      .then((r) => {
        const name = path.basename(fp);
        const docType = r.meta.document_type ?? 'document';
        const signed = r.meta.signature_algorithm ? 'signed' : 'unsigned';
        statusBarItem!.text = `$(file-code) SDF ${r.meta.sdf_version} · ${docType} · ${signed}`;
        statusBarItem!.tooltip = `${name}\n${r.meta.document_id}\n${r.meta.issuer}`;
        statusBarItem!.show();
      })
      .catch(() => statusBarItem?.hide());
  };

  if (vscode.window.activeTextEditor) {
    update(vscode.window.activeTextEditor);
  }
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(update)
  );
}
