// ─── SDF VS Code Extension — Entry Point ─────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import * as vscode from 'vscode';

import { registerInspectCommand } from './commands/inspect';
import { registerValidateCommand } from './commands/validate';
import { registerPreviewCommand } from './commands/preview';
import { SDFDocumentProvider } from './providers/sdfDocumentProvider';
import { SDFTreeProvider } from './providers/sdfTreeProvider';
import { initStatusBar } from './utils/statusBar';

/**
 * Called when the extension is activated.
 * Commands and providers are registered here.
 */
export function activate(context: vscode.ExtensionContext): void {
  const documentProvider = new SDFDocumentProvider();
  const treeProvider = new SDFTreeProvider();

  context.subscriptions.push(
    // Custom editor for .sdf files
    vscode.window.registerCustomEditorProvider(
      'sdf.preview',
      documentProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    ),
    // Tree view in Explorer
    vscode.window.createTreeView('sdf.explorer', {
      treeDataProvider: treeProvider,
      showCollapseAll: true,
    }),
  );

  registerInspectCommand(context, treeProvider);
  registerValidateCommand(context);
  registerPreviewCommand(context);

  initStatusBar(context);
}

/**
 * Called when the extension is deactivated.
 */
export function deactivate(): void {
  // Cleanup handled by context.subscriptions
}
