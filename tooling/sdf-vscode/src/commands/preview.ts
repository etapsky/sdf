// ─── SDF: Open Preview Command ────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import * as vscode from 'vscode';

export function registerPreviewCommand(
  context: vscode.ExtensionContext
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('sdf.preview', async (uri?: vscode.Uri) => {
      const fileUri = uri ?? resolveActiveSDF();
      if (!fileUri) {
        await vscode.window.showErrorMessage('Open a .sdf file or right-click one in Explorer');
        return;
      }

      await vscode.commands.executeCommand(
        'vscode.openWith',
        fileUri,
        'sdf.preview',
        { viewColumn: vscode.ViewColumn.Beside, preview: false }
      );
    })
  );
}

function resolveActiveSDF(): vscode.Uri | undefined {
  const editor = vscode.window.activeTextEditor;
  if (editor?.document.uri.fsPath.endsWith('.sdf')) {
    return editor.document.uri;
  }
  return undefined;
}
