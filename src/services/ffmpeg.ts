import ffmpeg from 'fluent-ffmpeg';
import { promises as fs, statSync } from 'fs';
import path from 'path';
import { VideoInfo, ConversionOptions, ConversionProgress, QualityPreset } from '../types/index.js';

/**
 * FFmpeg服务类 - 封装视频处理功能
 */
export class FFmpegService {
  private static instance: FFmpegService;
  private activeConversions = new Map<string, ConversionProgress>();

  private constructor() {}

  public static getInstance(): FFmpegService {
    if (!FFmpegService.instance) {
      FFmpegService.instance = new FFmpegService();
    }
    return FFmpegService.instance;
  }

  /**
   * 获取视频文件信息
   */
  async getVideoInfo(filePath: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(new Error(`获取视频信息失败: ${err.message}`));
          return;
        }

        try {
          const stats = statSync(filePath);
          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

          const videoInfo: VideoInfo = {
            filePath,
            format: metadata.format.format_name || '未知',
            size: stats.size,
            duration: metadata.format.duration || 0,
          };

          if (videoStream) {
            videoInfo.video = {
              codec: videoStream.codec_name || '未知',
              width: videoStream.width || 0,
              height: videoStream.height || 0,
              frameRate: this.parseFrameRate(videoStream.r_frame_rate),
              bitrate: videoStream.bit_rate ? parseInt(videoStream.bit_rate) : 0,
            };
          }

          if (audioStream) {
            videoInfo.audio = {
              codec: audioStream.codec_name || '未知',
              sampleRate: audioStream.sample_rate || 0,
              channels: audioStream.channels || 0,
              bitrate: audioStream.bit_rate ? parseInt(audioStream.bit_rate) : 0,
            };
          }

          resolve(videoInfo);
        } catch (parseError) {
          reject(new Error(`解析视频信息失败: ${parseError}`));
        }
      });
    });
  }

  /**
   * 转换视频格式
   */
  async convertVideo(
    inputPath: string,
    outputPath: string,
    options: ConversionOptions,
    onProgress?: (progress: ConversionProgress) => void
  ): Promise<string> {
    const taskId = this.generateTaskId();
    
    // 检查输入文件是否存在
    try {
      await fs.access(inputPath);
    } catch {
      throw new Error(`输入文件不存在: ${inputPath}`);
    }

    // 确保输出目录存在
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // 检查输出文件是否已存在
    if (!options.overwrite) {
      try {
        await fs.access(outputPath);
        throw new Error(`输出文件已存在: ${outputPath}`);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
    }

    return new Promise((resolve, reject) => {
      const progress: ConversionProgress = {
        taskId,
        inputPath,
        outputPath,
        progress: 0,
        status: 'pending',
        startTime: new Date(),
      };

      this.activeConversions.set(taskId, progress);

      let command = ffmpeg(inputPath);

      // 应用转换选项
      command = this.applyConversionOptions(command, options);

      command
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('开始转换:', commandLine);
          progress.status = 'processing';
          onProgress?.(progress);
        })
        .on('progress', (progressInfo) => {
          progress.progress = Math.round(progressInfo.percent || 0);
          onProgress?.(progress);
        })
        .on('end', () => {
          progress.status = 'completed';
          progress.progress = 100;
          progress.endTime = new Date();
          this.activeConversions.delete(taskId);
          onProgress?.(progress);
          resolve(outputPath);
        })
        .on('error', (err) => {
          progress.status = 'failed';
          progress.error = err.message;
          progress.endTime = new Date();
          this.activeConversions.delete(taskId);
          onProgress?.(progress);
          reject(new Error(`视频转换失败: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * 批量转换视频
   */
  async batchConvert(
    inputFiles: string[],
    outputDir: string,
    options: ConversionOptions,
    onProgress?: (taskId: string, progress: ConversionProgress) => void
  ): Promise<string[]> {
    const results: string[] = [];
    
    for (const inputFile of inputFiles) {
      const fileName = path.parse(inputFile).name;
      const outputPath = path.join(outputDir, `${fileName}.${options.outputFormat}`);
      
      try {
        const result = await this.convertVideo(
          inputFile,
          outputPath,
          options,
          (progress) => onProgress?.(progress.taskId, progress)
        );
        results.push(result);
      } catch (error) {
        console.error(`转换文件失败 ${inputFile}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * 获取转换进度
   */
  getConversionProgress(taskId: string): ConversionProgress | undefined {
    return this.activeConversions.get(taskId);
  }

  /**
   * 应用转换选项到FFmpeg命令
   */
  private applyConversionOptions(command: ffmpeg.FfmpegCommand, options: ConversionOptions): ffmpeg.FfmpegCommand {
    // 根据输出格式设置合适的编解码器和参数
    command = this.setCodecsForFormat(command, options.outputFormat);

    // 应用质量预设
    if (options.quality) {
      command = this.applyQualityPreset(command, options.quality);
    }

    // 设置分辨率
    if (options.resolution) {
      command = command.size(`${options.resolution.width}x${options.resolution.height}`);
    }

    // 设置视频码率（仅在没有使用CRF时）
    if (options.videoBitrate && !this.usesCRF(options.outputFormat)) {
      command = command.videoBitrate(options.videoBitrate);
    }

    // 设置音频码率
    if (options.audioBitrate) {
      command = command.audioBitrate(options.audioBitrate);
    }

    // 设置帧率
    if (options.frameRate) {
      command = command.fps(options.frameRate);
    }

    // 确保完整复制所有流，避免时长截断
    command = command.addOption('-avoid_negative_ts', 'make_zero');
    command = command.addOption('-fflags', '+genpts');
    
    // 添加更多稳定性选项
    command = command.addOption('-max_muxing_queue_size', '1024');

    return command;
  }

  /**
   * 为不同格式设置合适的编解码器
   */
  private setCodecsForFormat(command: ffmpeg.FfmpegCommand, format: string): ffmpeg.FfmpegCommand {
    switch (format.toLowerCase()) {
      case 'mp4':
        command = command.videoCodec('libx264').audioCodec('aac');
        command = command.addOption('-preset', 'medium');
        command = command.addOption('-crf', '23'); // 高质量设置
        command = command.addOption('-movflags', '+faststart');
        break;
      
      case 'avi':
        command = command.videoCodec('libx264').audioCodec('aac');
        command = command.addOption('-preset', 'medium');
        command = command.addOption('-crf', '23');
        break;
      
      case 'mov':
        command = command.videoCodec('libx264').audioCodec('aac');
        command = command.addOption('-preset', 'medium');
        command = command.addOption('-crf', '23');
        command = command.addOption('-movflags', '+faststart'); // 优化MOV播放
        break;
      
      case 'webm':
        command = command.videoCodec('libvpx-vp9').audioCodec('libopus');
        command = command.addOption('-crf', '30');
        command = command.addOption('-b:v', '0'); // 使用CRF模式
        command = command.addOption('-row-mt', '1'); // 多线程编码
        break;
      
      case 'mkv':
        command = command.videoCodec('libx264').audioCodec('aac');
        command = command.addOption('-preset', 'medium');
        command = command.addOption('-crf', '23');
        break;
      
      case 'flv':
        command = command.videoCodec('libx264').audioCodec('aac');
        command = command.addOption('-preset', 'medium');
        command = command.addOption('-crf', '25'); // FLV使用稍低质量
        break;
      
      case 'wmv':
        command = command.videoCodec('libx264').audioCodec('aac');
        command = command.addOption('-preset', 'medium');
        command = command.addOption('-crf', '25');
        break;
      
      case 'm4v':
        command = command.videoCodec('libx264').audioCodec('aac');
        command = command.addOption('-preset', 'medium');
        command = command.addOption('-crf', '23');
        break;
      
      default:
        // 默认使用H.264和AAC
        command = command.videoCodec('libx264').audioCodec('aac');
        command = command.addOption('-preset', 'medium');
        command = command.addOption('-crf', '23');
    }
    
    return command;
  }

  /**
   * 检查格式是否使用CRF模式
   */
  private usesCRF(format: string): boolean {
    const crfFormats = ['mp4', 'avi', 'mov', 'webm', 'mkv', 'flv', 'wmv', 'm4v'];
    return crfFormats.includes(format.toLowerCase());
  }

  /**
   * 应用质量预设
   */
  private applyQualityPreset(command: ffmpeg.FfmpegCommand, quality: string): ffmpeg.FfmpegCommand {
    const presets = this.getQualityPresets();
    const preset = presets[quality];
    
    if (preset) {
      // 对于使用CRF的格式，调整CRF值
      if (preset.videoBitrate) {
        const crf = this.bitrateToQuality(preset.videoBitrate);
        command = command.addOption('-crf', crf.toString());
      }
      if (preset.audioBitrate) {
        command = command.audioBitrate(preset.audioBitrate);
      }
    }
    
    return command;
  }

  /**
   * 将码率转换为质量参数
   */
  private bitrateToQuality(bitrate: number): number {
    // 码率越高，CRF值越低（质量越好）
    if (bitrate >= 8000) return 18; // ultra quality
    if (bitrate >= 5000) return 21; // high quality  
    if (bitrate >= 2500) return 23; // medium quality
    return 25; // low quality
  }

  /**
   * 获取质量预设
   */
  private getQualityPresets(): Record<string, { videoBitrate?: number; audioBitrate?: number }> {
    return {
      low: {
        videoBitrate: 1000,  // 提高最低质量
        audioBitrate: 96
      },
      medium: {
        videoBitrate: 2500,  // 提高中等质量
        audioBitrate: 128
      },
      high: {
        videoBitrate: 5000,  // 提高高质量
        audioBitrate: 192
      },
      ultra: {
        videoBitrate: 8000,  // 提高超高质量
        audioBitrate: 320
      }
    };
  }

  /**
   * 解析帧率字符串
   */
  private parseFrameRate(frameRateStr: string | undefined): number {
    if (!frameRateStr) return 0;
    
    if (frameRateStr.includes('/')) {
      const [num, den] = frameRateStr.split('/').map(Number);
      return den ? Math.round((num / den) * 100) / 100 : 0;
    }
    
    return parseFloat(frameRateStr) || 0;
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}