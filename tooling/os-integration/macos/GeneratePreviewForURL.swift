// ─── SDFQuickLook — GeneratePreviewForURL.swift ───────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// macOS Quick Look plugin for .sdf files.
//
// A .sdf file is a ZIP archive. This plugin:
//   1. Opens the ZIP archive
//   2. Extracts visual.pdf
//   3. Returns the PDF bytes to Quick Look for rendering
//
// If visual.pdf is not found or the archive is corrupt, falls back to
// a plain text preview showing meta.json contents.
//
// Build requirements:
//   - Xcode 15+
//   - macOS 13+ deployment target
//   - Frameworks: QuickLook, Foundation
//
// Install:
//   cp -r SDFQuickLook.qlgenerator ~/Library/QuickLook/
//   qlmanage -r
//   qlmanage -p invoice.sdf   ← test

import Foundation
import QuickLook

// ─── Entry point ─────────────────────────────────────────────────────────────

func GeneratePreviewForURL(
  _ preview:    QLPreviewRequest,
  _ url:        URL,
  _ contentType: String,
  _ properties: CFMutableDictionary
) -> OSStatus {
  autoreleasepool {
    guard let result = generatePreview(url: url, request: preview) else {
      return noErr
    }

    switch result {
    case .pdf(let data):
      preview.dataReply(data, contentType: "application/pdf")
      return noErr

    case .html(let html):
      preview.dataReply(html.data(using: .utf8)!, contentType: "text/html")
      return noErr
    }
  }
}

func CancelPreviewGeneration(_ preview: QLPreviewRequest) {
  // Nothing to cancel — our preview generation is synchronous
}

// ─── Preview generation ───────────────────────────────────────────────────────

enum PreviewResult {
  case pdf(Data)
  case html(String)
}

func generatePreview(url: URL, request: QLPreviewRequest) -> PreviewResult? {
  // .sdf is a ZIP archive — read it as raw bytes
  guard let archiveData = try? Data(contentsOf: url) else {
    return .html(errorHTML("Could not read file: \(url.lastPathComponent)"))
  }

  // Extract visual.pdf from the ZIP using Foundation's built-in zip support
  if let pdfData = extractFromZIP(archiveData: archiveData, entryName: "visual.pdf") {
    return .pdf(pdfData)
  }

  // Fallback: extract meta.json and show as HTML
  if let metaData = extractFromZIP(archiveData: archiveData, entryName: "meta.json"),
     let metaString = String(data: metaData, encoding: .utf8) {
    return .html(metaPreviewHTML(
      filename: url.lastPathComponent,
      metaJSON: metaString
    ))
  }

  return .html(errorHTML(
    "\(url.lastPathComponent) appears to be a valid ZIP but contains no visual.pdf or meta.json. " +
    "It may not be a valid SDF file."
  ))
}

// ─── ZIP extraction ───────────────────────────────────────────────────────────
// Uses macOS built-in libz via FileManager / NSData.
// For a production plugin, use ZipFoundation or Apple's Compression framework.

func extractFromZIP(archiveData: Data, entryName: String) -> Data? {
  // Write archive to a temp file, use FileManager to unzip
  let tmp     = FileManager.default.temporaryDirectory
  let tmpZip  = tmp.appendingPathComponent(UUID().uuidString + ".zip")
  let tmpDir  = tmp.appendingPathComponent(UUID().uuidString)

  defer {
    try? FileManager.default.removeItem(at: tmpZip)
    try? FileManager.default.removeItem(at: tmpDir)
  }

  do {
    try archiveData.write(to: tmpZip)
    try FileManager.default.createDirectory(at: tmpDir, withIntermediateDirectories: true)

    // Use unzip via Process (available on macOS)
    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/unzip")
    process.arguments     = ["-o", tmpZip.path, entryName, "-d", tmpDir.path]

    let pipe = Pipe()
    process.standardOutput = pipe
    process.standardError  = pipe

    try process.run()
    process.waitUntilExit()

    let extracted = tmpDir.appendingPathComponent(entryName)
    return try? Data(contentsOf: extracted)
  } catch {
    return nil
  }
}

// ─── HTML templates ───────────────────────────────────────────────────────────

func metaPreviewHTML(filename: String, metaJSON: String) -> String {
  // Parse a few key fields from meta.json for display
  let issuer      = extractJSON(metaJSON, key: "issuer")        ?? "—"
  let docType     = extractJSON(metaJSON, key: "document_type") ?? "—"
  let docId       = extractJSON(metaJSON, key: "document_id")   ?? "—"
  let sdfVersion  = extractJSON(metaJSON, key: "sdf_version")   ?? "—"
  let createdAt   = extractJSON(metaJSON, key: "created_at")    ?? "—"
  let signed      = metaJSON.contains("signature_algorithm") && !metaJSON.contains("\"signature_algorithm\":null")

  return """
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
      background: #1a1a1a; color: #e0e0e0;
      margin: 0; padding: 40px; line-height: 1.6;
    }
    .header { margin-bottom: 32px; }
    .title { font-size: 22px; font-weight: 600; color: #fff; margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: #888; font-family: 'SF Mono', monospace; }
    .card {
      background: #242424; border: 1px solid #333;
      border-radius: 10px; padding: 20px 24px; margin-bottom: 16px;
    }
    .card-title {
      font-size: 10px; font-weight: 600; letter-spacing: 1.5px;
      text-transform: uppercase; color: #666; margin-bottom: 14px;
    }
    .row { display: flex; padding: 6px 0; border-bottom: 1px solid #2a2a2a; }
    .row:last-child { border-bottom: none; }
    .label { color: #888; font-size: 12px; width: 140px; flex-shrink: 0; }
    .value { color: #e0e0e0; font-size: 12px; font-family: 'SF Mono', monospace; }
    .badge {
      display: inline-block; padding: 2px 10px; border-radius: 99px;
      font-size: 10px; font-weight: 600;
    }
    .badge-sdf { background: rgba(100,130,255,0.15); color: #8899ff; border: 1px solid rgba(100,130,255,0.3); }
    .badge-signed { background: rgba(50,200,100,0.15); color: #50c864; border: 1px solid rgba(50,200,100,0.3); }
    .badge-unsigned { background: rgba(200,150,50,0.15); color: #e0a040; border: 1px solid rgba(200,150,50,0.3); }
    .note { font-size: 11px; color: #555; margin-top: 20px; }
  </style>
  </head>
  <body>
  <div class="header">
    <div class="title">\(filename)</div>
    <div class="subtitle" style="margin-top:8px; display:flex; gap:8px; align-items:center;">
      <span class="badge badge-sdf">SDF \(sdfVersion)</span>
      <span class="badge \(signed ? "badge-signed" : "badge-unsigned")">\(signed ? "✓ signed" : "unsigned")</span>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Document</div>
    <div class="row"><span class="label">Type</span><span class="value">\(docType)</span></div>
    <div class="row"><span class="label">Issuer</span><span class="value">\(issuer)</span></div>
    <div class="row"><span class="label">Created</span><span class="value">\(createdAt)</span></div>
    <div class="row"><span class="label">Document ID</span><span class="value">\(docId)</span></div>
  </div>

  <p class="note">
    visual.pdf could not be extracted. Showing meta.json contents.<br>
    Open in SDF Reader for full inspection.
  </p>
  </body>
  </html>
  """
}

func errorHTML(_ message: String) -> String {
  return """
  <!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body { font-family: -apple-system; background:#1a1a1a; color:#e0e0e0;
           display:flex; align-items:center; justify-content:center;
           height:100vh; margin:0; text-align:center; padding:40px; }
    .msg { font-size:14px; color:#888; max-width:400px; }
    .title { font-size:18px; color:#fff; margin-bottom:12px; }
  </style></head>
  <body><div>
    <div class="title">Cannot preview this file</div>
    <div class="msg">\(message)</div>
  </div></body></html>
  """
}

// Minimal JSON string value extractor — no external dependency
func extractJSON(_ json: String, key: String) -> String? {
  let pattern = "\"\(key)\"\\s*:\\s*\"([^\"]+)\""
  guard let regex = try? NSRegularExpression(pattern: pattern),
        let match = regex.firstMatch(in: json, range: NSRange(json.startIndex..., in: json)),
        let range = Range(match.range(at: 1), in: json) else {
    return nil
  }
  return String(json[range])
}