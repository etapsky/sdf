// ─── SDF: Inspect File Command ───────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import * as vscode from 'vscode';
import * as path from 'path';
import { SDFTreeProvider } from '../providers/sdfTreeProvider';
import { loadSDF } from '../utils/sdf';

export function registerInspectCommand(
  context: vscode.ExtensionContext,
  treeProvider: SDFTreeProvider
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('sdf.inspect', async (uri?: vscode.Uri) => {
      const fileUri = uri ?? resolveActiveSDF();
      if (!fileUri) {
        await vscode.window.showErrorMessage('Open a .sdf file or right-click one in Explorer');
        return;
      }

      const filePath = fileUri.fsPath;

      try {
        const result = await loadSDF(filePath);
        treeProvider.setDocument(filePath, result);

        const { meta, data, schema, pdfBytes } = result;
        const docType = meta.document_type ?? 'document';
        const signed = meta.signature_algorithm ? 'signed' : 'unsigned';

        await vscode.window.showInformationMessage(
          `SDF ${meta.sdf_version} · ${docType} · ${signed} · ${Object.keys(data).length} data fields`,
          'Open Preview'
        ).then((action) => {
          if (action === 'Open Preview') {
            vscode.commands.executeCommand('sdf.preview', fileUri);
          }
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await vscode.window.showErrorMessage(`SDF Inspect failed: ${msg}`);
      }
    })
  );
}

function resolveActiveSDF(): vscode.Uri | undefined {
  const editor = vscode.window.activeTextEditor;
  if (editor?.document.uri.fsPath.endsWith('.sdf')) {
    return editor.document.uri;
  }

  const uri = vscode.window.activeTextEditor?.document.uri
    ?? vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!uri) return undefined;

  const name = path.basename(uri.fsPath);
  if (name.endsWith('.sdf')) return uri;
  return undefined;
}
