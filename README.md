# 🎬 Video Convert MCP

[![npm version](https://badge.fury.io/js/@pickstar-2002%2Fvideo-convert-mcp.svg)](https://badge.fury.io/js/@pickstar-2002%2Fvideo-convert-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@pickstar-2002/video-convert-mcp.svg)](https://nodejs.org)
[![Downloads](https://img.shields.io/npm/dm/@pickstar-2002/video-convert-mcp.svg)](https://www.npmjs.com/package/@pickstar-2002/video-convert-mcp)

> 🚀 基于MCP协议的高性能视频格式转换工具，支持多种主流视频格式之间的无缝转换

## ✨ 特性

- 🎯 **多格式支持** - 支持MP4、AVI、MOV、WMV、MKV、WEBM、M4V等主流视频格式
- ⚡ **高性能转换** - 基于FFmpeg引擎，转换速度快，质量可靠
- 🔧 **灵活配置** - 支持自定义分辨率、码率、帧率等参数
- 📦 **批量处理** - 支持批量视频转换，提高工作效率
- 🛡️ **类型安全** - 完整的TypeScript类型定义
- 🔌 **MCP协议** - 基于Model Context Protocol，易于集成到AI应用中

## 📋 系统要求

- Node.js >= 16.0.0
- FFmpeg (需要安装并添加到系统PATH)

### FFmpeg 安装指南

**Windows:**
```bash
# 使用 Chocolatey
choco install ffmpeg

# 或下载预编译版本
# https://ffmpeg.org/download.html#build-windows
```

**macOS:**
```bash
# 使用 Homebrew
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

## 🚀 安装

### 全局安装
```bash
npm install -g @pickstar-2002/video-convert-mcp
```

### 项目依赖
```bash
npm install @pickstar-2002/video-convert-mcp
```

## 🛠️ 使用方式

### 1. 命令行启动
```bash
# 全局安装后直接启动
video-convert-mcp

# 或使用 npx
npx @pickstar-2002/video-convert-mcp
```

### 2. 在 Claude Desktop 中使用

在 Claude Desktop 的配置文件中添加：

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "video-convert": {
      "command": "npx",
      "args": ["@pickstar-2002/video-convert-mcp"]
    }
  }
}
```

### 3. 在其他 MCP 客户端中使用

任何支持MCP协议的客户端都可以连接到此服务器：

```bash
# 启动服务器
npx @pickstar-2002/video-convert-mcp
```

### 4. 编程方式集成

```typescript
import VideoMcpServer from '@pickstar-2002/video-convert-mcp';

const server = new VideoMcpServer();
await server.start();
```

## 🔧 支持的格式

| 格式 | 扩展名 | 描述 | 推荐用途 |
|------|--------|------|----------|
| MP4  | .mp4   | 最常用的视频格式 | 网络分享、移动设备 |
| AVI  | .avi   | 经典的视频容器格式 | 桌面播放 |
| MOV  | .mov   | Apple QuickTime格式 | Mac系统、专业编辑 |
| WMV  | .wmv   | Windows Media Video | Windows系统 |
| MKV  | .mkv   | 开源的多媒体容器 | 高质量存储 |
| WEBM | .webm  | Web优化的视频格式 | 网页播放 |
| M4V  | .m4v   | iTunes兼容格式 | Apple生态系统 |

## 📖 API 文档

### convert_video
转换单个视频文件格式

**参数:**
```typescript
{
  inputPath: string;        // 输入视频文件路径
  outputFormat: string;     // 目标输出格式 (mp4, avi, mov, wmv, mkv, webm, m4v)
  outputPath?: string;      // 输出文件路径 (可选)
  quality?: string;         // 质量预设: low/medium/high/ultra
  resolution?: string;      // 分辨率，如 "1920x1080"
  videoBitrate?: number;    // 视频码率 (kbps)
  audioBitrate?: number;    // 音频码率 (kbps)
  frameRate?: number;       // 帧率 (fps)
  overwrite?: boolean;      // 是否覆盖已存在文件
}
```

**示例:**
```json
{
  "tool": "convert_video",
  "arguments": {
    "inputPath": "/path/to/input.mp4",
    "outputFormat": "avi",
    "quality": "high",
    "resolution": "1920x1080"
  }
}
```

### get_video_info
获取视频文件详细信息

**参数:**
```typescript
{
  filePath: string;  // 视频文件路径
}
```

**返回:**
```typescript
{
  filePath: string;
  format: string;
  size: number;      // 文件大小 (字节)
  duration: number;  // 时长 (秒)
  video?: {
    codec: string;
    width: number;
    height: number;
    frameRate: number;
    bitrate: number;
  };
  audio?: {
    codec: string;
    sampleRate: number;
    channels: number;
    bitrate: number;
  };
}
```

### batch_convert
批量转换视频文件

**参数:**
```typescript
{
  inputFiles: string[];     // 输入文件列表
  outputFormat: string;     // 目标格式
  outputDir: string;        // 输出目录
  quality?: string;         // 质量预设
  overwrite?: boolean;      // 是否覆盖已存在文件
}
```

## 💡 使用示例

### 基本转换
将MP4文件转换为AVI格式：
```json
{
  "tool": "convert_video",
  "arguments": {
    "inputPath": "/Users/username/video.mp4",
    "outputFormat": "avi"
  }
}
```

### 高质量转换
转换为高质量的MKV格式：
```json
{
  "tool": "convert_video",
  "arguments": {
    "inputPath": "/Users/username/input.mp4",
    "outputFormat": "mkv",
    "quality": "high",
    "resolution": "1920x1080",
    "videoBitrate": 5000,
    "audioBitrate": 192,
    "frameRate": 30
  }
}
```

### 批量转换
将多个视频文件批量转换为WEBM格式：
```json
{
  "tool": "batch_convert",
  "arguments": {
    "inputFiles": [
      "/path/to/video1.mp4",
      "/path/to/video2.avi",
      "/path/to/video3.mov"
    ],
    "outputFormat": "webm",
    "outputDir": "/path/to/output",
    "quality": "medium"
  }
}
```

### 获取视频信息
```json
{
  "tool": "get_video_info",
  "arguments": {
    "filePath": "/path/to/video.mp4"
  }
}
```

## 🎯 质量预设说明

| 预设 | 描述 | 适用场景 |
|------|------|----------|
| `low` | 低质量，文件小 | 快速预览、网络传输 |
| `medium` | 中等质量 | 日常使用、社交分享 |
| `high` | 高质量 | 专业用途、长期存储 |
| `ultra` | 超高质量 | 专业制作、无损转换 |

## 🔧 开发

### 环境设置

```bash
# 克隆仓库
git clone https://github.com/pickstar-2002/video-convert-mcp.git
cd video-convert-mcp

# 安装依赖
npm install

# 构建项目
npm run build

# 开发模式
npm run dev
```

### 项目结构

```
src/
├── types/          # TypeScript类型定义
│   └── index.ts    # 核心类型接口
├── services/       # 核心服务
│   └── validator.js # 参数验证服务
├── tools/          # MCP工具实现
│   └── index.js    # 工具注册和处理器
└── index.ts        # 服务器入口文件
```

## 🤝 贡献

欢迎提交Issue和Pull Request！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request

## 📄 许可证

本项目基于 [MIT](LICENSE) 许可证开源。

## 🙏 致谢

- [FFmpeg](https://ffmpeg.org/) - 强大的多媒体处理框架
- [Model Context Protocol](https://modelcontextprotocol.io/) - 优秀的协议标准
- [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) - FFmpeg的Node.js封装

## 📞 联系方式

如有问题或建议，欢迎联系：

**微信:** pickstar_loveXX

---

<div align="center">
  <p>如果这个项目对您有帮助，请给它一个 ⭐️</p>
  <p>Made with ❤️ by pickstar-2002</p>
</div>