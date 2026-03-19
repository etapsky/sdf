// ─── SDF Tree Provider — Explorer View (meta / data / schema) ────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import * as vscode from 'vscode';
import type { SDFParseResult } from '@etapsky/sdf-kit';

export type SDFTreeItem = SDFMetaItem | SDFSchemaItem | SDFDataItem | SDFFieldItem;

class SDFMetaItem extends vscode.TreeItem {
  constructor(public readonly meta: SDFParseResult['meta']) {
    super('meta.json', vscode.TreeItemCollapsibleState.Expanded);
    this.description = meta.document_type ?? 'metadata';
    this.iconPath = new vscode.ThemeIcon('file');
  }
}

class SDFSchemaItem extends vscode.TreeItem {
  constructor(public readonly schema: Record<string, unknown>) {
    const title = (schema.title as string) ?? 'schema.json';
    super(title, vscode.TreeItemCollapsibleState.Collapsed);
    this.description = `${Object.keys((schema.properties as object) ?? {}).length} properties`;
    this.iconPath = new vscode.ThemeIcon('symbol-misc');
  }
}

class SDFDataItem extends vscode.TreeItem {
  constructor(public readonly data: Record<string, unknown>) {
    super('data.json', vscode.TreeItemCollapsibleState.Expanded);
    this.description = `${Object.keys(data).length} fields`;
    this.iconPath = new vscode.ThemeIcon('database');
  }
}

class SDFFieldItem extends vscode.TreeItem {
  constructor(
    public readonly key: string,
    public readonly value: unknown
  ) {
    const label = formatValue(key, value);
    super(label, isObjectOrArray(value) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
    this.description = typeof value === 'object' && value !== null && !Array.isArray(value)
      ? `${Object.keys(value as object).length} fields`
      : Array.isArray(value)
      ? `${value.length} items`
      : undefined;
  }
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return `${key}: null`;
  if (Array.isArray(value)) return `${key} [${value.length}]`;
  if (typeof value === 'object') return key;
  return `${key}: ${String(value)}`;
}

function isObjectOrArray(v: unknown): boolean {
  return typeof v === 'object' && v !== null && (Array.isArray(v) || Object.keys(v as object).length > 0);
}

export class SDFTreeProvider implements vscode.TreeDataProvider<SDFTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SDFTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _documentPath: string | undefined;
  private _sdf: SDFParseResult | undefined;

  setDocument(filePath: string, sdf: SDFParseResult): void {
    this._documentPath = filePath;
    this._sdf = sdf;
    this._onDidChangeTreeData.fire(undefined);
  }

  getSchemaForDocument(uri: vscode.Uri): Record<string, unknown> | undefined {
    if (!this._sdf || !uri.fsPath.includes(this._documentPath ?? '')) return undefined;
    return this._sdf.schema;
  }

  getTreeItem(element: SDFTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SDFTreeItem): SDFTreeItem[] {
    if (!this._sdf) return [];

    if (!element) {
      return [
        new SDFMetaItem(this._sdf.meta),
        new SDFSchemaItem(this._sdf.schema),
        new SDFDataItem(this._sdf.data),
      ];
    }

    if (element instanceof SDFMetaItem) {
      return Object.entries(element.meta)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => new SDFFieldItem(k, v));
    }

    if (element instanceof SDFSchemaItem) {
      const props = element.schema.properties as Record<string, unknown> | undefined;
      if (!props) return [];
      return Object.entries(props).map(([k, v]) => new SDFFieldItem(k, v));
    }

    if (element instanceof SDFDataItem) {
      return Object.entries(element.data)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => new SDFFieldItem(k, v));
    }

    if (element instanceof SDFFieldItem) {
      const v = element.value;
      if (Array.isArray(v)) {
        return v
          .filter((x) => x !== undefined && x !== null)
          .slice(0, 20)
          .map((x, i) => new SDFFieldItem(`[${i}]`, x));
      }
      if (typeof v === 'object' && v !== null) {
        return Object.entries(v as Record<string, unknown>)
          .filter(([, x]) => x !== undefined && x !== null)
          .map(([k, x]) => new SDFFieldItem(k, x));
      }
    }

    return [];
  }
}
