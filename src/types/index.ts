/**
 * 视频转换相关类型定义
 */

// 支持的视频格式
export type VideoFormat = 'mp4' | 'avi' | 'mov' | 'wmv' | 'mkv' | 'webm' | 'm4v';

// 视频质量预设
export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra';

// 视频转换参数
export interface ConversionOptions {
  /** 输出格式 */
  outputFormat: VideoFormat;
  /** 输出文件路径 */
  outputPath?: string;
  /** 视频质量预设 */
  quality?: QualityPreset;
  /** 自定义分辨率 */
  resolution?: {
    width: number;
    height: number;
  };
  /** 视频码率 (kbps) */
  videoBitrate?: number;
  /** 音频码率 (kbps) */
  audioBitrate?: number;
  /** 帧率 */
  frameRate?: number;
  /** 是否覆盖已存在的文件 */
  overwrite?: boolean;
}

// 视频信息
export interface VideoInfo {
  /** 文件路径 */
  filePath: string;
  /** 文件格式 */
  format: string;
  /** 文件大小 (字节) */
  size: number;
  /** 时长 (秒) */
  duration: number;
  /** 视频流信息 */
  video?: {
    codec: string;
    width: number;
    height: number;
    frameRate: number;
    bitrate: number | null;
  };
  /** 音频流信息 */
  audio?: {
    codec: string;
    sampleRate: number;
    channels: number;
    bitrate: number | null;
  };
}

// 转换进度信息
export interface ConversionProgress {
  /** 任务ID */
  taskId: string;
  /** 输入文件路径 */
  inputPath: string;
  /** 输出文件路径 */
  outputPath: string;
  /** 进度百分比 (0-100) */
  progress: number;
  /** 当前状态 */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** 错误信息 */
  error?: string;
  /** 开始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime?: Date;
}

// 批量转换任务
export interface BatchConversionTask {
  /** 输入文件列表 */
  inputFiles: string[];
  /** 转换选项 */
  options: ConversionOptions;
  /** 输出目录 */
  outputDir: string;
}

// MCP工具参数类型
export interface ConvertVideoArgs {
  inputPath: string;
  outputFormat: VideoFormat;
  outputPath?: string;
  quality?: QualityPreset;
  resolution?: string; // 格式: "1920x1080"
  videoBitrate?: number;
  audioBitrate?: number;
  frameRate?: number;
  overwrite?: boolean;
}

export interface GetVideoInfoArgs {
  filePath: string;
}

export interface BatchConvertArgs {
  inputFiles: string[];
  outputFormat: VideoFormat;
  outputDir: string;
  quality?: QualityPreset;
  overwrite?: boolean;
}