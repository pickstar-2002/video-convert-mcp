#!/usr/bin/env node

/**
 * Video MCP Server - 基于MCP协议的视频格式转换服务
 * 
 * 功能特性:
 * - 支持主流视频格式之间的相互转换 (MP4, AVI, MOV, WMV, FLV, MKV, WEBM, M4V)
 * - 提供视频信息获取功能
 * - 支持批量转换
 * - 可配置视频质量、分辨率、码率等参数
 * - 基于FFmpeg引擎，转换质量可靠
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

import { tools, toolHandlers } from './tools/index.js';
import { ValidatorService } from './services/validator.js';

/**
 * 创建并配置MCP服务器
 */
class VideoMcpServer {
  private server: Server;
  private validator: ValidatorService;

  constructor() {
    this.server = new Server(
      {
        name: 'video-mcp',
        version: '1.0.0',
      }
    );

    this.validator = ValidatorService.getInstance();
    this.setupHandlers();
  }

  /**
   * 设置请求处理器
   */
  private setupHandlers(): void {
    // 处理工具列表请求
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      };
    });

    // 处理工具调用请求
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // 检查工具是否存在
        if (!(name in toolHandlers)) {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `未知的工具: ${name}`
          );
        }

        // 验证参数
        if (!args || typeof args !== 'object') {
          throw new McpError(
            ErrorCode.InvalidParams,
            '工具参数必须是一个对象'
          );
        }

        console.log(`正在执行工具: ${name}`);
        console.log('参数:', JSON.stringify(args, null, 2));

        // 调用对应的工具处理器
        const handler = toolHandlers[name as keyof typeof toolHandlers];
        const result = await handler(args as any);

        console.log(`工具 ${name} 执行完成`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };

      } catch (error: any) {
        console.error(`工具 ${name} 执行失败:`, error);

        // 如果是MCP错误，直接抛出
        if (error instanceof McpError) {
          throw error;
        }

        // 包装其他错误
        throw new McpError(
          ErrorCode.InternalError,
          `工具执行失败: ${error.message}`
        );
      }
    });
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    
    console.error('Video MCP Server 正在启动...');
    console.error('支持的功能:');
    console.error('- convert_video: 视频格式转换');
    console.error('- get_video_info: 获取视频信息');
    console.error('- batch_convert: 批量视频转换');
    console.error('');
    console.error('支持的格式:', this.validator.getSupportedFormats().join(', '));
    console.error('服务器已就绪，等待连接...');

    await this.server.connect(transport);
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    // 检查FFmpeg是否可用
    await checkFFmpegAvailability();

    // 创建并启动服务器
    const server = new VideoMcpServer();
    await server.start();

  } catch (error: any) {
    console.error('服务器启动失败:', error.message);
    process.exit(1);
  }
}

/**
 * 检查FFmpeg是否可用
 */
async function checkFFmpegAvailability(): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, ['-version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    ffmpeg.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    ffmpeg.on('close', (code: number) => {
      if (code === 0) {
        console.error('✓ FFmpeg 可用');
        resolve();
      } else {
        reject(new Error(
          'FFmpeg 不可用。请确保已安装FFmpeg并添加到系统PATH中。\n' +
          '安装指南: https://ffmpeg.org/download.html'
        ));
      }
    });

    ffmpeg.on('error', (error: Error) => {
      reject(new Error(
        `FFmpeg 检查失败: ${error.message}\n` +
        '请确保已安装FFmpeg并添加到系统PATH中。\n' +
        '安装指南: https://ffmpeg.org/download.html'
      ));
    });

    // 设置超时
    setTimeout(() => {
      ffmpeg.kill();
      reject(new Error('FFmpeg 检查超时'));
    }, 5000);
  });
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 启动服务器
// 使用 fileURLToPath 将 import.meta.url 转换为平台相关的路径，
// 并与 process.argv[1] (当前执行的脚本路径) 进行比较。
// 这是判断模块是否被直接执行的最可靠、跨平台的方法。
const __filename = fileURLToPath(import.meta.url);
if (__filename === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error('启动失败:', error);
    process.exit(1);
  });
}

export default VideoMcpServer;