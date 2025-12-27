// frontend/components/review/BlockOverlayItem.tsx
import React, { CSSProperties, memo } from "react";
import { canRenderInline } from "./utils/canRenderInline";

export type BBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DraftBlock = {
  id: string;
  block_type: string;
  status: "auto" | "edited" | "approved" | "verified" | string;
  bbox: BBox;
  source_text: string;
  translated_text?: string | null;
  edited_text?: string | null;
  page_number?: number; // optional
};

type Props = {
  block: DraftBlock;
  scale: number; // PDF render scale → 乘上 bbox 變成 px
  isSelected: boolean;
  showMissingOnly: boolean;
  onSelect: (id: string) => void;
};

function clampText(text: string, maxChars: number) {
  const t = (text || "").trim();
  if (t.length <= maxChars) return t;
  return t.slice(0, maxChars) + "…";
}

export const BlockOverlayItem = memo(function BlockOverlayItem({
  block,
  scale,
  isSelected,
  showMissingOnly,
  onSelect,
}: Props) {
  const bboxPx = {
    left: block.bbox.x * scale,
    top: block.bbox.y * scale,
    width: block.bbox.width * scale,
    height: block.bbox.height * scale,
  };

  const finalText = ((block.edited_text || block.translated_text || "") + "").trim();
  const missing = finalText.length === 0;

  // Missing only 模式下：非 missing 的 block 半透明/不顯示（你可改成只淡化）
  if (showMissingOnly && !missing) return null;

  const inline = canRenderInline(bboxPx.height, block.source_text, finalText);

  const baseBoxStyle: CSSProperties = {
    position: "absolute",
    left: bboxPx.left,
    top: bboxPx.top,
    width: bboxPx.width,
    height: bboxPx.height,
    boxSizing: "border-box",
    borderRadius: 4,
    cursor: "pointer",
    outline: "none",
    border: missing ? "2px solid rgba(220,38,38,0.95)" : isSelected ? "2px solid rgba(37,99,235,0.95)" : "1px solid rgba(0,0,0,0.25)",
    background: inline ? "rgba(255,255,255,0.70)" : "rgba(255,255,255,0.0)",
    boxShadow: isSelected ? "0 0 0 2px rgba(37,99,235,0.15)" : undefined,
    zIndex: isSelected ? 30 : missing ? 25 : 10,
    pointerEvents: "auto",
  };

  const textWrapStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    padding: 6,
    overflow: "hidden",
    whiteSpace: "pre-line",
    lineHeight: 1.2,
    fontSize: 12,
  };

  const cardStyle: CSSProperties = {
    position: "absolute",
    left: bboxPx.left,
    top: bboxPx.top + bboxPx.height + 6,
    width: Math.max(220, Math.min(360, bboxPx.width)),
    maxWidth: 420,
    padding: 8,
    borderRadius: 8,
    border: missing ? "2px solid rgba(220,38,38,0.95)" : "1px solid rgba(0,0,0,0.20)",
    background: "rgba(255,255,255,0.92)",
    boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
    zIndex: isSelected ? 35 : 20,
    pointerEvents: "auto",
  };

  return (
    <>
      {/* bbox highlight box */}
      <div
        style={baseBoxStyle}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(block.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(block.id);
          }
        }}
        title={`${block.block_type} | ${block.status}\n${clampText(block.source_text, 120)}`}
      >
        {inline ? (
          <div style={textWrapStyle}>
            <div style={{ color: "rgba(55,65,81,0.9)", marginBottom: 4 }}>
              {clampText(block.source_text, 160)}
            </div>
            <div style={{ color: missing ? "rgba(220,38,38,0.95)" : "rgba(17,24,39,0.95)", fontWeight: 700 }}>
              {missing ? "【缺翻譯】" : clampText(finalText, 140)}
            </div>
          </div>
        ) : null}
      </div>

      {/* card mode: bbox 不夠高，中文顯示在 bbox 下方卡片 */}
      {!inline ? (
        <div
          style={cardStyle}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(block.id);
          }}
        >
          <div style={{ fontSize: 11, color: "rgba(107,114,128,1)", marginBottom: 6 }}>
            {block.block_type} · {block.status}
          </div>
          <div style={{ fontSize: 12, color: "rgba(55,65,81,0.95)", whiteSpace: "pre-line" }}>
            {block.source_text}
          </div>
          <div style={{ height: 8 }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: missing ? "rgba(220,38,38,0.95)" : "rgba(17,24,39,0.95)", whiteSpace: "pre-line" }}>
            {missing ? "【缺翻譯】" : finalText}
          </div>
        </div>
      ) : null}
    </>
  );
});
