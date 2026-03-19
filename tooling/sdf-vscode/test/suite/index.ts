// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import * as path from 'path';
import Mocha from 'mocha';

async function run(): Promise<void> {
  const mocha = new Mocha({ color: true, ui: 'tdd' });
  const testsRoot = path.resolve(__dirname);
  mocha.addFile(path.join(testsRoot, 'extension.test.js'));

  return new Promise((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} tests failed`));
      } else {
        resolve();
      }
    });
  });
}

export { run };
