# 🎬 Video Convert MCP

[![NPM Version](https://img.shields.io/npm/v/@pickstar-2002/video-convert-mcp)](https://www.npmjs.com/package/@pickstar-2002/video-convert-mcp)
[![License](https://img.shields.io/npm/l/@pickstar-2002/video-convert-mcp)](https://github.com/pickstar/video-convert-mcp/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

一款基于 AI MCP (Model Context Protocol) 协议的强大、高效的视频格式转换工具。

## ✨ 功能特性

- **🚀 多格式转换**: 支持 `MP4`, `AVI`, `MOV`, `MKV`, `WEBM` 等多种主流视频格式之间的自由转换。
- **⚙️ 批量处理**: 一次性处理多个视频文件，大幅提升工作效率。
- **📊 质量控制**: 提供从 `low` 到 `ultra` 的多档质量预设，在文件大小和画质之间找到完美平衡。
- **🔧 详细信息**: 轻松获取视频的详细元数据，如格式、分辨率、时长、码率等。
- **🔒 类型安全**: 使用 TypeScript 开发，提供完整的类型定义，确保调用安全。
- **📦 零依赖**: 内置 FFmpeg，用户无需在本地安装任何额外依赖，开箱即用。

## 🛠️ 安装与用法

本工具是一个 MCP 服务，无需全局安装。您只需在支持 MCP 的 AI 编程助手（如 CodeBuddy）中进行配置即可使用。

打开您 IDE 的 MCP 配置文件 (例如 `codebuddy_mcp_settings.json`)，在 `mcpServers` 对象中添加以下配置。**我们推荐使用 `@latest` 标签来确保您总能使用最新的稳定版本。**

```json
{
  "mcpServers": {
    "video-convert": {
      "timeout": 60,
      "type": "stdio",
      "command": "npx",
      "args": [
        "@pickstar-2002/video-convert-mcp@latest"
      ]
    }
  }
}
```

## ✨ 疑难解答 (Troubleshooting)

**问：为什么我会遇到 `MCP error -32000: Connection closed` 错误？**

答：这通常是 `npx` 的缓存问题导致的。如果您之前运行过旧版本的包，`npx` 可能会继续使用缓存中的旧版本。

**解决方案：**

- **首选方案**：使用我们推荐的 `@latest` 标签，如上方的用法示例所示。
- **备用方案 (最稳妥)**：如果您需要锁定在某个特定版本以保证长期稳定性，可以指定确切版本号，例如：
    ```json
    "args": [
      "@pickstar-2002/video-convert-mcp@1.1.1" 
    ]
    ```
- **终极方案**：手动清理 `npx` 缓存。在终端运行 `npm config get cache` 找到缓存目录，然后删除其中的 `_npx` 文件夹。

## 📖 API 文档

本 MCP 服务提供了以下工具：

### `convert_video`

转换单个视频文件。

- **参数**:
  - `inputPath` (string, 必填): 输入视频的完整路径。
  - `outputFormat` (string, 必填): 目标输出格式 (如: 'mp4', 'mov')。
  - `outputPath` (string, 可选): 输出文件的完整路径。若不指定，则在原文件同目录下生成。
  - `quality` (string, 可选): 视频质量预设 (`low`, `medium`, `high`, `ultra`)。
  - `overwrite` (boolean, 可选): 是否覆盖已存在的输出文件，默认为 `false`。
  - ... (更多高级参数如 `resolution`, `videoBitrate` 等)

### `batch_convert`

批量转换多个视频文件。

- **参数**:
  - `inputFiles` (string[], 必填): 输入视频文件路径的数组。
  - `outputFormat` (string, 必填): 目标输出格式。
  - `outputDir` (string, 必填): 输出目录的路径。
  - `quality` (string, 可选): 视频质量预设。
  - `overwrite` (boolean, 可选): 是否覆盖已存在的输出文件。

### `get_video_info`

获取视频文件的详细信息。

- **参数**:
  - `filePath` (string, 必填): 视频文件的完整路径。

## 🤝 贡献

欢迎各种形式的贡献！如果您有任何想法或建议，请随时提交 Pull Request 或创建 Issue。

1.  Fork 本仓库
2.  创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3.  提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4.  推送到分支 (`git push origin feature/AmazingFeature`)
5.  打开一个 Pull Request

## 📄 许可证

本项目使用 [ISC](https://opensource.org/licenses/ISC) 许可证。

---

## 📧 联系我

如果您有任何问题或合作意向，欢迎联系我。

**微信**: pickstar_loveXX