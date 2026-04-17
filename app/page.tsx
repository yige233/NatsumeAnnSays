"use client";

import { useEffect, useState } from "react";

export default function Home() {
    const [origin, setOrigin] = useState("");

    useEffect(() => {
        // 只有在客户端才能拿到 origin
        setOrigin(window.location.origin);
    }, []);

    const exampleUrl = "/NatsumeAnn/我很可爱|请给我钱?c=ff4500&al=center";

    return (
        <>
            {/* 浏览器标签页标题 */}
            <title>NatsumeAnn Says: 我很可爱 请给我钱</title>
            <main
                style={{
                    padding: "40px",
                    fontFamily: "system-ui",
                    maxWidth: "800px",
                    margin: "0 auto",
                    lineHeight: "1.6",
                    color: "#333",
                }}
            >
                <section>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: "5em",
                        }}
                    >
                        <h2>NatsumeAnn Says:</h2>
                        <div
                            style={{
                                marginTop: "20px",
                                borderRadius: "12px",
                                overflow: "hidden",
                                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                                display: "flex",
                                justifyContent: "center",
                                width: "40%",
                            }}
                        >
                            <a
                                href={exampleUrl}
                                style={{ color: "#0070f3" }}
                                target="_blank"
                            >
                                <img
                                    src={exampleUrl}
                                    alt="Example"
                                    style={{ display: "block" }}
                                />
                            </a>
                        </div>
                    </div>
                </section>

                <section style={{ marginTop: "40px" }}>
                    <pre
                        style={{
                            background: "#f4f4f4",
                            padding: "15px",
                            borderRadius: "8px",
                            overflowX: "auto",
                        }}
                    >
                        <code>{`${origin}/[imageId]/[text]?params`}</code>
                    </pre>
                    <ul>
                        <li>
                            <strong>imageId</strong>: 在模板中定义的 ID (如{" "}
                            <code>NatsumeAnn</code>)
                        </li>
                        <li>
                            <strong>text</strong>: 叠层文字。支持使用{" "}
                            <code>|</code> 强制换行
                        </li>
                        <li>
                            <strong>c</strong>: 颜色 Hex 码，不带 # (如{" "}
                            <code>ff0000</code>)
                        </li>
                        <li>
                            <strong>al</strong>: 对齐方式 (<code>left</code>,{" "}
                            <code>center</code>, <code>right</code>)
                        </li>
                        <li>
                            <strong>fs</strong>: 强制指定字号 (跳过自动缩放)
                        </li>
                    </ul>
                </section>

                <footer
                    style={{
                        marginTop: "60px",
                        paddingTop: "20px",
                        borderTop: "1px solid #eee",
                        fontSize: "0.8rem",
                        color: "#999",
                        display: "flex",
                        justifyContent: "center",
                    }}
                >
                    <a
                        href="https://github.com/你的用户名/你的仓库名"
                        target="_blank"
                    >
                        View on GitHub
                    </a>
                </footer>
            </main>
        </>
    );
}
