import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { get } from "@vercel/edge-config";

export const runtime = "edge";

// --- 工具函数 ---

function getPngSize(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  return { width: view.getInt32(16), height: view.getInt32(20) };
}

function bufferToDataUri(buffer: ArrayBuffer, type: string) {
  const base = btoa(new Uint8Array(buffer).reduce((d, b) => d + String.fromCharCode(b), ""));
  return `data:${type};base64,${base}`;
}

/**
 * 核心布局算法：修正了变量名错误
 */
function getLayout(text: string, maxWidth: number, maxHeight: number, manualFs?: number, config?: { max: number; min: number }) {
  const maxFs = config?.max || 30;
  const minFs = config?.min || 8;
  const lineHeight = 1.2;

  // 计算加权宽度
  const getW = (t: string) => t.split("").reduce((a, c) => a + (c.charCodeAt(0) > 128 ? 1 : 0.6), 0);

  // 检查是否溢出
  const checkFit = (str: string, size: number) => {
    const lines = Math.ceil((getW(str) * size) / (maxWidth - 4));
    return lines * size * lineHeight <= maxHeight;
  };

  let targetFs: number;

  if (manualFs) {
    targetFs = Math.max(manualFs, minFs);
  } else {
    targetFs = maxFs;
    // 自动缩放阶段
    while (targetFs > minFs) {
      if (checkFit(text, targetFs)) return { fontSize: targetFs, text };
      targetFs -= 2;
    }
  }

  // 截断阶段 (当 targetFs 已经降到最低或者为手动指定值时)
  let currentText = text;

  // 如果当前文本在 targetFs 下能放下，直接返回
  if (checkFit(currentText, targetFs)) {
    return { fontSize: targetFs, text: currentText };
  }

  // 否则，循环删字直到能放下 (末尾补 ...)
  while (currentText.length > 0) {
    const displayText = currentText + "...";
    if (checkFit(displayText, targetFs)) {
      return { fontSize: targetFs, text: displayText };
    }
    currentText = currentText.slice(0, -1);
  }

  return { fontSize: targetFs, text: "..." };
}

// --- 主 API 函数 ---

export async function GET(request: NextRequest, context: { params: Promise<{ imageId: string; text?: string[] }> }) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const imageId = segments[0];

    const textFromPath = segments.slice(1).join("/") || null;

    const templates = await get<Record<string, any>>("templates");
    const template = templates?.[imageId];
    if (!template) return new Response(`Template Not Found. Available: ${[...Object.keys(templates ?? {})].join(",")}`, { status: 404 });
    const rawText = (textFromPath ? decodeURIComponent(textFromPath) : template.defaultText || imageId).replace(/\||\/n/g, "\n");
    const { searchParams } = new URL(request.url);
    const color = (searchParams.get("c") || template.defaultColor || "000000").replace("#", "");
    const align = (searchParams.get("al") || template.defaultAlign || "center") as "left" | "center" | "right";
    const manualFs = searchParams.get("fs") ? parseInt(searchParams.get("fs")!) : undefined;

    const alignMap = {
      left: { alignItems: "flex-start", textAlign: "left" as const },
      center: { alignItems: "center", textAlign: "center" as const },
      right: { alignItems: "flex-end", textAlign: "right" as const },
    };

    const domain = new URL(request.url).origin;

    // 从 public 目录并行加载资源
    const [fontData, imageData] = await Promise.all([
      fetch(`${domain}/NotoSansSC-SemiBold.ttf`).then((res) => res.arrayBuffer()),
      fetch(`${domain}/${template.filename}`).then((res) => res.arrayBuffer()),
    ]);

    const { width, height } = getPngSize(imageData);

    // 计算布局
    const { fontSize, text } = getLayout(rawText, template.w, template.h, manualFs, { max: template.maxFs, min: template.minFs });

    const imageBase64 = bufferToDataUri(imageData, "image/png");

    return new ImageResponse(
      <div
        style={{
          display: "flex",
          width: `${width}px`,
          height: `${height}px`,
          position: "relative",
        }}
      >
        <img src={imageBase64} width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }} />
        <div
          style={{
            position: "absolute",
            left: `${template.x}px`,
            top: `${template.y}px`,
            width: `${template.w}px`,
            height: `${template.h}px`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: alignMap[align].alignItems,
            textAlign: alignMap[align].textAlign,
            fontSize: `${fontSize}px`,
            color: `#${color}`,
            lineHeight: 1.2,
            fontWeight: 700,
            overflow: "hidden",
            wordBreak: "break-all",
          }}
        >
          {text.split("\n").map((line, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                textAlign: alignMap[align].textAlign,
                wordBreak: "break-all",
              }}
            >
              {line}
            </div>
          ))}
        </div>
      </div>,
      {
        width,
        height,
        fonts: [{ name: "NotoSans", data: fontData, style: "normal" }],
      },
    );
  } catch (e) {
    console.error(e);
    return new Response("Render Error", { status: 500 });
  }
}
