# LicenseAtlas

涵盖 **929** 个软件、AI 模型、数据和智能体许可证的全面集合——支持搜索、筛选，提供中英文双语界面。

**在线访问**：[LicenseAtlas](https://morningd.github.io/license.atlas)

[English](README.md) | 中文

## 功能特性

- **全文搜索** — 按许可证名称或 SPDX ID 检索
- **分类筛选** — 软件、模型、数据、智能体
- **标签筛选** — 宽松许可、Copyleft、知识共享等
- **热度与趋势** — 基于 HuggingFace、GitHub、Kaggle 数据的迷你趋势图
- **双语界面** — 中英文切换，自动检测浏览器语言
- **暗色模式** — 跟随系统偏好 + 手动切换
- **静态导出** — 936 个预渲染页面，加载极速

## 技术栈

- [Next.js 16](https://nextjs.org)（App Router，静态导出）
- [Tailwind CSS v4](https://tailwindcss.com)
- TypeScript

## 开发

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # 静态导出到 out/
```

## 数据来源

许可证原文聚合自：

| 来源 | 覆盖范围 |
|------|---------|
| SPDX | 695 个许可证 |
| TLDRLegal | 145 个许可证 |
| OSI | 122 个批准许可证 |
| GNU / FSF | 66 个许可证 |
| Creative Commons | 37 个许可证 |
| choosealicense.com | 47 个许可证 |
| HuggingFace Hub | 自定义模型与数据集许可证 |
| GitHub | Agent 技能、MCP 服务器及工具许可证 |
| Open Data Commons | 3 个数据许可证 |
| RAIL | 负责任 AI 许可证 |

热度数据来自 HuggingFace Hub（280 万+ 模型）、GitHub（28 种许可证类型）和 Kaggle（通过 Meta-Kaggle 覆盖 71.4 万+ 数据集）。

## 许可证

本项目基于 [Apache License 2.0](LICENSE) 许可。
