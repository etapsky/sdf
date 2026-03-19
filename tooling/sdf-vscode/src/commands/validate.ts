// ─── SDF: Validate File Command ──────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import * as vscode from 'vscode';
import * as path from 'path';
import { loadSDF } from '../utils/sdf';

export function registerValidateCommand(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('sdf.validate', async (uri?: vscode.Uri) => {
      const fileUri = uri ?? resolveActiveSDF();
      if (!fileUri) {
        await vscode.window.showErrorMessage('Open a .sdf file or right-click one in Explorer');
        return;
      }

      const filePath = fileUri.fsPath;

      try {
        await loadSDF(filePath);
        await vscode.window.showInformationMessage(
          `✓ ${path.basename(filePath)} passed all validation checks`,
          'Inspect'
        ).then((action) => {
          if (action === 'Inspect') {
            vscode.commands.executeCommand('sdf.inspect', fileUri);
          }
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await vscode.window.showErrorMessage(`SDF validation failed: ${msg}`);
      }
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
