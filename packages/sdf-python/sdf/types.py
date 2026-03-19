# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
"""SDF type definitions — SDF_FORMAT.md Section 4.6."""

from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class SDFMeta:
    """Meta.json structure — SDF_FORMAT.md Section 4.6."""

    sdf_version: str
    document_id: str
    issuer: str
    created_at: str
    issuer_id: Optional[str] = None
    document_type: Optional[str] = None
    document_version: Optional[str] = None
    recipient: Optional[str] = None
    recipient_id: Optional[str] = None
    schema_id: Optional[str] = None
    signature_algorithm: Optional[str] = None
    parent_document_id: Optional[str] = None
    expires_at: Optional[str] = None
    tags: Optional[list[str]] = None

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "SDFMeta":
        return cls(
            sdf_version=d["sdf_version"],
            document_id=d["document_id"],
            issuer=d["issuer"],
            created_at=d["created_at"],
            issuer_id=d.get("issuer_id"),
            document_type=d.get("document_type"),
            document_version=d.get("document_version"),
            recipient=d.get("recipient"),
            recipient_id=d.get("recipient_id"),
            schema_id=d.get("schema_id"),
            signature_algorithm=d.get("signature_algorithm"),
            parent_document_id=d.get("parent_document_id"),
            expires_at=d.get("expires_at"),
            tags=d.get("tags"),
        )

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "sdf_version": self.sdf_version,
            "document_id": self.document_id,
            "issuer": self.issuer,
            "created_at": self.created_at,
            "signature_algorithm": self.signature_algorithm,
        }
        if self.issuer_id is not None:
            d["issuer_id"] = self.issuer_id
        if self.document_type is not None:
            d["document_type"] = self.document_type
        if self.document_version is not None:
            d["document_version"] = self.document_version
        if self.recipient is not None:
            d["recipient"] = self.recipient
        if self.recipient_id is not None:
            d["recipient_id"] = self.recipient_id
        if self.schema_id is not None:
            d["schema_id"] = self.schema_id
        if self.parent_document_id is not None:
            d["parent_document_id"] = self.parent_document_id
        if self.expires_at is not None:
            d["expires_at"] = self.expires_at
        if self.tags is not None:
            d["tags"] = self.tags
        return d


@dataclass
class SDFParseResult:
    """Result of parse_sdf() — meta, data, schema, pdf_bytes."""

    meta: SDFMeta | dict[str, Any]
    data: dict[str, Any]
    schema: dict[str, Any]
    pdf_bytes: bytes


@dataclass
class SDFValidationResult:
    """Schema validation result."""

    valid: bool
    errors: list[dict[str, Any]]
