# 🎬 Video Convert MCP

[![NPM Version](https://img.shields.io/npm/v/@pickstar-2002/video-convert-mcp)](https://www.npmjs.com/package/@pickstar-2002/video-convert-mcp)
[![License](https://img.shields.io/npm/l/@pickstar-2002/video-convert-mcp)](https://github.com/pickstar-2002/video-convert-mcp/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![Downloads](https://img.shields.io/npm/dm/@pickstar-2002/video-convert-mcp)](https://www.npmjs.com/package/@pickstar-2002/video-convert-mcp)

一款基于 MCP (Model Context Protocol) 协议的强大、高效的视频格式转换工具。支持在 AI 编程助手中直接进行视频格式转换，让视频处理变得前所未有的简单。

## ✨ 功能特性

- **🚀 多格式转换**: 支持 MP4、AVI、MOV、WMV、MKV、WEBM、M4V 等主流视频格式之间的相互转换
- **⚡ 批量处理**: 一次性处理多个视频文件，大幅提升工作效率
- **📊 质量控制**: 提供 low、medium、high、ultra 四档质量预设，完美平衡文件大小和画质
- **🔧 详细信息**: 轻松获取视频的详细元数据，如格式、分辨率、时长、码率等
- **🔒 类型安全**: 使用 TypeScript 开发，提供完整的类型定义，确保调用安全
- **📦 零配置**: 内置 FFmpeg，用户无需在本地安装任何额外依赖，开箱即用

## 🛠️ 安装与配置

本工具是一个 MCP 服务，无需全局安装。您只需在支持 MCP 的 AI 编程助手（如 CodeBuddy、Cursor、Claude Desktop 等）中进行配置即可使用。

### CodeBuddy 配置

打开 CodeBuddy 的 MCP 配置文件 `codebuddy_mcp_settings.json`，在 `mcpServers` 对象中添加以下配置：

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

### Cursor 配置

在 Cursor 的设置中找到 MCP 配置，添加：

```json
{
  "mcpServers": {
    "video-convert": {
      "command": "npx",
      "args": ["@pickstar-2002/video-convert-mcp@latest"]
    }
  }
}
```

### Claude Desktop 配置

编辑 `claude_desktop_config.json` 文件：

```json
{
  "mcpServers": {
    "video-convert": {
      "command": "npx",
      "args": ["@pickstar-2002/video-convert-mcp@latest"]
    }
  }
}
```

**💡 推荐使用 `@latest` 标签来确保您总能使用最新的稳定版本。**

## 🚨 疑难解答 (Troubleshooting)

### 常见问题 1: Connection closed 错误

**问题**: 遇到 `MCP error -32000: Connection closed` 或类似的连接错误。

**原因**: 这通常是 `npx` 的缓存问题导致的。如果您之前运行过旧版本的包，`npx` 可能会继续使用缓存中的旧版本。

**解决方案** (按推荐顺序)：

1. **首选方案**: 确认使用了 `@latest` 标签
   ```json
   "args": ["@pickstar-2002/video-convert-mcp@latest"]
   ```

2. **备用方案**: 锁定到特定的稳定版本号
   ```json
   "args": ["@pickstar-2002/video-convert-mcp@1.2.1"]
   ```

3. **终极方案**: 清理 `npx` 缓存
   ```bash
   # Windows
   npm config get cache
   # 然后删除缓存目录中的 _npx 文件夹
   
   # macOS/Linux
   rm -rf ~/.npm/_npx
   ```

### 常见问题 2: FFmpeg 相关错误

**问题**: 提示找不到 FFmpeg 或 FFmpeg 执行失败。

**解决方案**: 本工具内置了 FFmpeg，通常不会出现此问题。如果遇到，请尝试：
- 重启您的 AI 编程助手
- 检查网络连接（首次运行时需要下载依赖）

### 常见问题 3: 权限错误

**问题**: 在某些系统上可能遇到权限相关的错误。

**解决方案**:
- 确保输出目录有写入权限
- 在 Windows 上，尝试以管理员身份运行您的 AI 编程助手

## 📖 API 文档

本 MCP 服务提供了以下工具：

### `convert_video`

转换单个视频文件为指定格式。

**参数**:
- `inputPath` (string, 必填): 输入视频文件的完整路径
- `outputFormat` (string, 必填): 目标输出格式，支持: `mp4`, `avi`, `mov`, `wmv`, `mkv`, `webm`, `m4v`
- `outputPath` (string, 可选): 输出文件路径，不指定则自动生成
- `quality` (string, 可选): 视频质量预设 (`low`, `medium`, `high`, `ultra`)
- `resolution` (string, 可选): 输出分辨率，格式为 "宽度x高度"，如 "1920x1080"
- `videoBitrate` (number, 可选): 视频码率，单位 kbps
- `audioBitrate` (number, 可选): 音频码率，单位 kbps
- `frameRate` (number, 可选): 输出帧率，单位 fps
- `overwrite` (boolean, 可选): 是否覆盖已存在的输出文件，默认 false

**示例**:
```typescript
// 基本转换
convert_video({
  inputPath: "/path/to/input.avi",
  outputFormat: "mp4"
})

// 高质量转换
convert_video({
  inputPath: "/path/to/input.mov",
  outputFormat: "mp4",
  quality: "high",
  resolution: "1920x1080"
})
```

### `batch_convert`

批量转换多个视频文件。

**参数**:
- `inputFiles` (string[], 必填): 输入视频文件路径数组
- `outputFormat` (string, 必填): 目标输出格式
- `outputDir` (string, 必填): 输出目录路径
- `quality` (string, 可选): 视频质量预设
- `overwrite` (boolean, 可选): 是否覆盖已存在的输出文件

**示例**:
```typescript
batch_convert({
  inputFiles: [
    "/path/to/video1.avi",
    "/path/to/video2.mov",
    "/path/to/video3.wmv"
  ],
  outputFormat: "mp4",
  outputDir: "/path/to/output",
  quality: "high"
})
```

### `get_video_info`

获取视频文件的详细信息。

**参数**:
- `filePath` (string, 必填): 视频文件的完整路径

**返回信息**:
- 文件格式和编解码器信息
- 视频分辨率、帧率、码率
- 音频采样率、声道数、码率
- 文件大小和时长
- 元数据信息

**示例**:
```typescript
get_video_info({
  filePath: "/path/to/video.mp4"
})
```

## 🎯 使用示例

### 基本转换
```
请帮我将 /Users/john/Desktop/video.avi 转换为 MP4 格式
```

### 批量转换
```
请将 /Users/john/Videos/ 目录下的所有 AVI 文件批量转换为 MP4 格式，输出到 /Users/john/Converted/ 目录
```

### 获取视频信息
```
请帮我查看 /Users/john/movie.mp4 的详细信息
```

### 高质量转换
```
请将 /Users/john/raw_video.mov 转换为高质量的 MP4 格式，分辨率设置为 1920x1080
```

## 🤝 贡献指南

欢迎各种形式的贡献！如果您有任何想法、建议或发现了 bug，请随时参与到项目中来。

### 如何贡献

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/pickstar-2002/video-convert-mcp.git
cd video-convert-mcp

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建项目
npm run build
```

## 📄 许可证

本项目使用 [MIT](https://opensource.org/licenses/MIT) 许可证。详情请查看 [LICENSE](LICENSE) 文件。

## 🔗 相关链接

- [NPM 包地址](https://www.npmjs.com/package/@pickstar-2002/video-convert-mcp)
- [GitHub 仓库](https://github.com/pickstar-2002/video-convert-mcp)
- [问题反馈](https://github.com/pickstar-2002/video-convert-mcp/issues)
- [MCP 协议文档](https://modelcontextprotocol.io/)

## 📧 联系作者

如果您有任何问题、建议或合作意向，欢迎联系我！

**微信**: pickstar_loveXX

---

<div align="center">

**⭐ 如果这个项目对您有帮助，请给个 Star 支持一下！⭐**

Made with ❤️ by [pickstar-2002](https://github.com/pickstar-2002)

</div>
