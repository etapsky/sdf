// ─── Version Checker ──────────────────────────────────────────────────────────
// SDF_FORMAT.md Section 9.3 — Version Forward Compatibility

import { SDFError, SDF_ERRORS, SDF_VERSION } from '../core/index.js';

export interface VersionCheckResult {
  supported: boolean;
  warning?:  string;
}

export function checkVersion(sdfVersion: string): VersionCheckResult {
  const [fileMajor, fileMinor] = sdfVersion.split('.').map(Number);
  const [currentMajor, currentMinor] = SDF_VERSION.split('.').map(Number);

  // MUST reject files with a higher MAJOR version
  if (fileMajor > currentMajor) {
    throw new SDFError(
      SDF_ERRORS.UNSUPPORTED_VERSION,
      `SDF version ${sdfVersion} is not supported. Maximum supported version is ${SDF_VERSION}.`,
    );
  }

  // SHOULD warn on higher MINOR version within same MAJOR
  if (fileMajor === currentMajor && fileMinor > currentMinor) {
    return {
      supported: true,
      warning: `File was produced against SDF ${sdfVersion}, which is newer than the supported ${SDF_VERSION}. Some fields may be ignored.`,
    };
  }

  return { supported: true };
}