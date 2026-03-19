# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
"""SDF producer — build .sdf from data and schema. SDF_FORMAT.md Section 5."""

import json
import uuid
import zipfile
from datetime import datetime, timezone
from io import BytesIO
from typing import Any, Optional

from . import _constants
from ._pdf import generate_pdf
from .types import SDFMeta
from .validator import validate_schema_or_throw


def build_sdf(
    data: dict[str, Any],
    schema: dict[str, Any],
    issuer: str,
    *,
    issuer_id: Optional[str] = None,
    document_type: Optional[str] = None,
    recipient: Optional[str] = None,
    recipient_id: Optional[str] = None,
    schema_id: Optional[str] = None,
    tags: Optional[list[str]] = None,
) -> bytes:
    """
    Build an SDF archive from data and schema.
    Returns the .sdf file as bytes.
    """
    validate_schema_or_throw(data, schema)

    meta = SDFMeta(
        sdf_version=_constants.SDF_VERSION,
        document_id=str(uuid.uuid4()),
        issuer=issuer,
        created_at=datetime.now(timezone.utc).isoformat(),
        issuer_id=issuer_id,
        document_type=document_type,
        recipient=recipient,
        recipient_id=recipient_id,
        schema_id=schema_id,
        signature_algorithm=None,
        tags=tags,
    )

    pdf_bytes = generate_pdf(meta, data)

    data_json = json.dumps(data, indent=2)
    schema_json = json.dumps(schema, indent=2)
    meta_json = json.dumps(meta.to_dict(), indent=2)

    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        zf.writestr("visual.pdf", pdf_bytes)
        zf.writestr("data.json", data_json)
        zf.writestr("schema.json", schema_json)
        zf.writestr("meta.json", meta_json)

    return buffer.getvalue()
