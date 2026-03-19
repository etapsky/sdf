# Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
"""PDF generation for visual.pdf — SDF_FORMAT.md Section 4.3."""

import json
from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from .types import SDFMeta


def _render_value(obj: Any, depth: int = 0) -> str:
    """Flatten nested structure for PDF display."""
    if obj is None:
        return ""
    if isinstance(obj, bool):
        return str(obj).lower()
    if isinstance(obj, (int, float, str)):
        return str(obj)
    if isinstance(obj, list):
        parts = [_render_value(x, depth + 1) for x in obj[:5]]
        if len(obj) > 5:
            parts.append(f"... +{len(obj) - 5} more")
        return ", ".join(parts)
    if isinstance(obj, dict):
        if "amount" in obj and "currency" in obj:
            return f"{obj['amount']} {obj['currency']}"
        parts = []
        for k, v in obj.items():
            if isinstance(v, dict) and "amount" in v and "currency" in v:
                parts.append(f"{k}: {v['amount']} {v['currency']}")
            else:
                parts.append(f"{k}: {_render_value(v, depth + 1)}")
        return " | ".join(parts[:8])
    return str(obj)


def generate_pdf(meta: SDFMeta | dict[str, Any], data: dict[str, Any]) -> bytes:
    """Generate visual.pdf from meta and data."""
    if isinstance(meta, dict):
        meta = SDFMeta.from_dict(meta)
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 56

    # Header
    c.setFillColor(colors.HexColor("#1a1735"))
    c.rect(0, height - 60, width, 60, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin, height - 38, "SDF — Smart Document Format")
    c.setFont("Helvetica", 9)
    doc_type = meta.document_type or "document"
    c.drawString(margin, height - 54, f"v{meta.sdf_version}  ·  {doc_type}")

    y = height - 80

    def section(title: str) -> None:
        nonlocal y
        y -= 4
        c.setFillColor(colors.HexColor("#f0edfc"))
        c.rect(margin, y - 2, width - margin * 2, 18, fill=1)
        c.setFillColor(colors.HexColor("#332e8b"))
        c.setFont("Helvetica-Bold", 8)
        c.drawString(margin + 6, y + 2, title.upper())
        y -= 22

    def kv(k: str, v: str) -> None:
        nonlocal y
        if y < 60:
            return
        c.setFillColor(colors.HexColor("#4d4d4d"))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(margin, y, k)
        c.setFillColor(colors.HexColor("#1a1a1a"))
        c.setFont("Helvetica", 9)
        c.drawString(margin + 150, y, str(v)[:80])
        y -= 14

    section("Document Identity")
    kv("Document ID", meta.document_id)
    issuer = meta.issuer
    if meta.issuer_id:
        issuer += f" ({meta.issuer_id})"
    kv("Issuer", issuer)
    if meta.recipient:
        rec = meta.recipient
        if meta.recipient_id:
            rec += f" ({meta.recipient_id})"
        kv("Recipient", rec)
    kv("Created", meta.created_at)
    if meta.document_type:
        kv("Document type", meta.document_type)
    if meta.schema_id:
        kv("Schema", meta.schema_id)
    y -= 8

    section("Document Data")
    for key, val in data.items():
        if y < 60:
            break
        rendered = _render_value(val)
        if len(rendered) > 100:
            rendered = rendered[:97] + "..."
        kv(key, rendered)

    c.setStrokeColor(colors.HexColor("#b3b3b3"))
    c.setLineWidth(0.5)
    c.line(margin, 36, width - margin, 36)
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#666666"))
    c.drawString(margin, 24, "SDF — Smart Document Format")
    c.drawRightString(width - margin, 24, f"v{meta.sdf_version}")

    c.save()
    return buffer.getvalue()
