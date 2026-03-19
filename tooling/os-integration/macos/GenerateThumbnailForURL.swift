// ─── GenerateThumbnailForURL.swift ────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Generates Finder thumbnails for .sdf files.
//
// Shows the first page of visual.pdf as the thumbnail — same approach
// as Preview.app uses for PDF files. Falls back to a branded placeholder
// if visual.pdf cannot be extracted.

import Foundation
import QuickLook
import CoreGraphics
import ImageIO

func GenerateThumbnailForURL(
  _ thumbnail:  QLThumbnailRequest,
  _ url:        URL,
  _ contentType: String,
  _ properties: CFMutableDictionary,
  _ maxSize:    CGSize
) -> OSStatus {
  autoreleasepool {
    // Extract visual.pdf from the .sdf ZIP archive
    if let archiveData = try? Data(contentsOf: url),
       let pdfData = extractFromZIP(archiveData: archiveData, entryName: "visual.pdf") {
      return renderPDFThumbnail(thumbnail: thumbnail, pdfData: pdfData, maxSize: maxSize)
    }

    // Fallback: branded SDF placeholder thumbnail
    return renderPlaceholderThumbnail(thumbnail: thumbnail, maxSize: maxSize)
  }
}

func CancelThumbnailGeneration(_ thumbnail: QLThumbnailRequest) {
  // Synchronous — nothing to cancel
}

// ─── PDF thumbnail renderer ───────────────────────────────────────────────────

func renderPDFThumbnail(
  thumbnail: QLThumbnailRequest,
  pdfData:   Data,
  maxSize:   CGSize
) -> OSStatus {
  guard let provider   = CGDataProvider(data: pdfData as CFData),
        let pdf        = CGPDFDocument(provider),
        let page       = pdf.page(at: 1) else {
    return renderPlaceholderThumbnail(thumbnail: thumbnail, maxSize: maxSize)
  }

  let pageRect  = page.getBoxRect(.mediaBox)
  let scale     = min(maxSize.width / pageRect.width, maxSize.height / pageRect.height)
  let renderSize = CGSize(width: pageRect.width * scale, height: pageRect.height * scale)

  // Create bitmap context
  let colorSpace = CGColorSpaceCreateDeviceRGB()
  guard let ctx  = CGContext(
    data:             nil,
    width:            Int(renderSize.width),
    height:           Int(renderSize.height),
    bitsPerComponent: 8,
    bytesPerRow:      0,
    space:            colorSpace,
    bitmapInfo:       CGImageAlphaInfo.premultipliedLast.rawValue
  ) else {
    return renderPlaceholderThumbnail(thumbnail: thumbnail, maxSize: maxSize)
  }

  // White background
  ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
  ctx.fill(CGRect(origin: .zero, size: renderSize))

  // Draw PDF page
  ctx.saveGState()
  ctx.translateBy(x: 0, y: renderSize.height)
  ctx.scaleBy(x: scale, y: -scale)
  ctx.drawPDFPage(page)
  ctx.restoreGState()

  guard let image = ctx.makeImage() else {
    return renderPlaceholderThumbnail(thumbnail: thumbnail, maxSize: maxSize)
  }

  thumbnail.setImage(image, withContentRect: CGRect(origin: .zero, size: renderSize))
  return noErr
}

// ─── Branded placeholder ──────────────────────────────────────────────────────
// Shown when visual.pdf cannot be extracted.
// Renders a clean document icon with the SDF brand colors.

func renderPlaceholderThumbnail(
  thumbnail: QLThumbnailRequest,
  maxSize:   CGSize
) -> OSStatus {
  let size   = CGSize(width: min(maxSize.width, 256), height: min(maxSize.height, 256))
  let colorSpace = CGColorSpaceCreateDeviceRGB()

  guard let ctx = CGContext(
    data:             nil,
    width:            Int(size.width),
    height:           Int(size.height),
    bitsPerComponent: 8,
    bytesPerRow:      0,
    space:            colorSpace,
    bitmapInfo:       CGImageAlphaInfo.premultipliedLast.rawValue
  ) else { return noErr }

  let w = size.width
  let h = size.height

  // Background — white document
  let docRect = CGRect(x: w * 0.1, y: h * 0.05, width: w * 0.8, height: h * 0.9)
  ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
  let docPath = CGPath(roundedRect: docRect, cornerWidth: w * 0.05, cornerHeight: w * 0.05, transform: nil)
  ctx.addPath(docPath)
  ctx.fillPath()

  // Shadow
  ctx.setShadow(offset: CGSize(width: 0, height: -2), blur: 6,
                color: CGColor(red: 0, green: 0, blue: 0, alpha: 0.15))

  // Left accent bar — gradient amber→purple (Etapsky brand)
  let barRect = CGRect(x: w * 0.1, y: h * 0.05, width: w * 0.045, height: h * 0.9)
  let gradient = CGGradient(
    colorsSpace: colorSpace,
    colors: [
      CGColor(red: 0.961, green: 0.620, blue: 0.043, alpha: 1), // amber #F59E0B
      CGColor(red: 0.486, green: 0.227, blue: 0.929, alpha: 1), // purple #7C3AED
    ] as CFArray,
    locations: [0.0, 1.0]
  )!
  ctx.saveGState()
  ctx.addPath(CGPath(roundedRect: barRect, cornerWidth: w * 0.02, cornerHeight: w * 0.02, transform: nil))
  ctx.clip()
  ctx.drawLinearGradient(
    gradient,
    start: CGPoint(x: barRect.midX, y: barRect.maxY),
    end:   CGPoint(x: barRect.midX, y: barRect.minY),
    options: []
  )
  ctx.restoreGState()

  // "SDF" text label
  ctx.setShadow(offset: .zero, blur: 0, color: nil)
  let labelRect = CGRect(x: w * 0.2, y: h * 0.38, width: w * 0.65, height: h * 0.24)
  let attrs: [NSAttributedString.Key: Any] = [
    .font: CTFontCreateWithName("Helvetica-Bold" as CFString, h * 0.18, nil),
    .foregroundColor: CGColor(red: 0.1, green: 0.1, blue: 0.1, alpha: 1),
  ]
  let attrStr = NSAttributedString(string: "SDF", attributes: attrs)
  let line    = CTLineCreateWithAttributedString(attrStr)
  ctx.textPosition = CGPoint(x: labelRect.minX, y: labelRect.minY)
  CTLineDraw(line, ctx)

  guard let image = ctx.makeImage() else { return noErr }
  thumbnail.setImage(image, withContentRect: CGRect(origin: .zero, size: size))
  return noErr
}