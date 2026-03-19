// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import * as assert from 'assert';
import * as vscode from 'vscode';

suite('SDF VS Code Extension', () => {
  test('Commands should be registered', async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes('sdf.inspect'), 'sdf.inspect should be registered');
    assert.ok(commands.includes('sdf.validate'), 'sdf.validate should be registered');
    assert.ok(commands.includes('sdf.preview'), 'sdf.preview should be registered');
  });
});
