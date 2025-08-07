import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { FFmpegService } from '../services/ffmpeg.js';
import { ValidatorService } from '../services/validator.js';
import { GetVideoInfoArgs } from '../types/index.js';

/**
 * 获取视频信息工具
 */
export const getVideoInfoTool: Tool = {
  name: 'get_video_info',
  description: '获取视频文件的详细信息，包括格式、分辨率、时长、编解码器、码率等。',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: '视频文件的完整路径'
      }
    },
    required: ['filePath']
  }
};

/**
 * 处理获取视频信息请求
 */
export async function handleGetVideoInfo(args: GetVideoInfoArgs): Promise<any> {
  const ffmpegService = FFmpegService.getInstance();
  const validator = ValidatorService.getInstance();

  try {
    // 验证输入文件
    const validation = await validator.validateVideoFile(args.filePath);
    if (!validation.isValid) {
      return {
        success: false,
        error: `文件验证失败: ${validation.error}`
      };
    }

    // 获取视频信息
    console.log(`正在获取视频信息: ${args.filePath}`);
    const videoInfo = await ffmpegService.getVideoInfo(args.filePath);

    // 格式化输出信息
    const formattedInfo = {
      基本信息: {
        文件路径: videoInfo.filePath,
        文件格式: videoInfo.format,
        文件大小: `${(videoInfo.size / (1024 * 1024)).toFixed(2)} MB`,
        时长: formatDuration(videoInfo.duration)
      },
      视频流: videoInfo.video ? {
        编解码器: videoInfo.video.codec,
        分辨率: `${videoInfo.video.width} x ${videoInfo.video.height}`,
        帧率: `${videoInfo.video.frameRate.toFixed(2)} fps`,
        码率: (videoInfo.video.bitrate && videoInfo.video.bitrate > 0) ? `${Math.round(videoInfo.video.bitrate / 1000)} kbps` : '未知'
      } : null,
      音频流: videoInfo.audio ? {
        编解码器: videoInfo.audio.codec,
        采样率: `${videoInfo.audio.sampleRate} Hz`,
        声道数: videoInfo.audio.channels,
        码率: (videoInfo.audio.bitrate && videoInfo.audio.bitrate > 0) ? `${Math.round(videoInfo.audio.bitrate / 1000)} kbps` : '未知'
      } : null
    };

    return {
      success: true,
      message: '成功获取视频信息',
      data: {
        原始信息: videoInfo,
        格式化信息: formattedInfo
      }
    };

  } catch (error: any) {
    console.error('获取视频信息失败:', error);
    return {
      success: false,
      error: `获取信息失败: ${error.message}`
    };
  }
}

/**
 * 格式化时长显示
 */
function formatDuration(seconds: number): string {
  if (seconds <= 0) return '未知';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}