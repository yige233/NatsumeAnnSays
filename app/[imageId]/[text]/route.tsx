import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 30;
const LINE_HEIGHT = 1.2; // 预估行高倍数

const IMAGES_CONFIG: Record<
    string,
    { x: number; y: number; w: number; h: number; filename: string }
> = {
    NatsumeAnn: { x: 120, y: 290, w: 160, h: 100, filename: "NatsumeAnn.png" },
};

// --- 工具函数 ---

// 1. 获取字符加权长度 (中文1, 英文0.6)
function getWeightedLength(text: string) {
    return text
        .split("")
        .reduce((acc, c) => acc + (c.charCodeAt(0) > 128 ? 1 : 0.6), 0);
}

// 2. 检查在特定字号下是否溢出区域
function doesItFit(
    text: string,
    fontSize: number,
    maxWidth: number,
    maxHeight: number,
) {
    const wLen = getWeightedLength(text);
    const totalWidth = wLen * fontSize;
    const lines = Math.ceil(totalWidth / maxWidth);
    const totalHeight = lines * fontSize * LINE_HEIGHT;
    return totalHeight <= maxHeight;
}

// 3. 核心算法：计算最优布局
function getLayout(text: string, maxWidth: number, maxHeight: number) {
    let fontSize = MAX_FONT_SIZE;
    let currentText = text;

    // 第一步：尝试通过减小字号来适配全文
    while (fontSize > MIN_FONT_SIZE) {
        if (doesItFit(currentText, fontSize, maxWidth, maxHeight)) {
            return { fontSize, text: currentText };
        }
        fontSize -= 2;
    }

    // 第二步：如果字号到了最小值(8px)还放不下，开始截断文字
    fontSize = MIN_FONT_SIZE;
    while (currentText.length > 0) {
        // 如果加上 "..." 后能放下，则返回
        const displayText = currentText + "...";
        if (doesItFit(displayText, fontSize, maxWidth, maxHeight)) {
            return { fontSize, text: displayText };
        }
        // 否则删掉最后一个字符继续试
        currentText = currentText.slice(0, -1);
    }

    return { fontSize: MIN_FONT_SIZE, text: "..." };
}

// 4. 解析 PNG 尺寸
function getPngSize(buffer: ArrayBuffer) {
    const view = new DataView(buffer);
    return { width: view.getInt32(16), height: view.getInt32(20) };
}

// 5. ArrayBuffer 转 Data URI
function bufferToDataUri(buffer: ArrayBuffer, type: string) {
    const base = btoa(
        new Uint8Array(buffer).reduce((d, b) => d + String.fromCharCode(b), ""),
    );
    return `data:${type};base64,${base}`;
}

// --- 主 API 函数 ---

export async function GET(
    request: Request,
    { params }: { params: { imageId: string; text: string } },
) {
    try {
        const { imageId, text: rawText } = await params;
        const decodedText = decodeURIComponent(rawText);
        const config = IMAGES_CONFIG[imageId];

        if (!config) return new Response(`Config not found. Available: ${[...Object.keys(IMAGES_CONFIG)].join(",")}`, { status: 404 });

        const { searchParams } = new URL(request.url);
        const color = (searchParams.get("c") || "000000").replace("#", "");

        // 加载字体和底图
        const domain = new URL(request.url).origin; // 自动获取当前部署的域名

        const [fontData, imageData] = await Promise.all([
            fetch(`${domain}/NotoSansSC-SemiBold.ttf`).then((res) =>
                res.arrayBuffer(),
            ),
            fetch(`${domain}/${config.filename}`).then((res) =>
                res.arrayBuffer(),
            ),
        ]);

        const { width, height } = getPngSize(imageData);
        const imageBase64 = bufferToDataUri(imageData, "image/png");

        // 计算布局：自动字号 + 溢出截断
        const { fontSize, text } = getLayout(decodedText, config.w, config.h);

        return new ImageResponse(
            <div
                style={{
                    display: "flex",
                    width: `${width}px`,
                    height: `${height}px`,
                    position: "relative",
                }}
            >
                {/* 底图层 */}
                <img
                    src={imageBase64}
                    width={width}
                    height={height}
                    style={{ position: "absolute", top: 0, left: 0 }}
                />

                {/* 文字层 */}
                <div
                    style={{
                        position: "absolute",
                        left: `${config.x}px`,
                        top: `${config.y}px`,
                        width: `${config.w}px`,
                        height: `${config.h}px`,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-start", // 顶部
                        alignItems: "center", // 居中
                        textAlign: "center",
                        fontSize: `${fontSize}px`,
                        color: `#${color}`,
                        lineHeight: LINE_HEIGHT,
                        fontWeight: 700,
                        overflow: "hidden",
                        wordBreak: "break-all",
                    }}
                >
                    {text}
                </div>
            </div>,
            {
                width: width,
                height: height,
                fonts: [{ name: "NotoSans", data: fontData, style: "normal" }],
            },
        );
    } catch (e) {
        return new Response("Render Error", { status: 500 });
    }
}
