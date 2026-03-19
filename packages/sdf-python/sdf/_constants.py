# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
"""SDF constants — SDF_FORMAT.md Section 4–11."""

SDF_VERSION = "0.1"
REQUIRED_FILES = ("visual.pdf", "data.json", "schema.json", "meta.json")
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
MAX_TOTAL_SIZE_BYTES = 200 * 1024 * 1024  # 200 MB
SDF_MIME_TYPE = "application/vnd.sdf"
SDF_EXTENSION = ".sdf"
