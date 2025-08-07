import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import { promises as fs, statSync } from 'fs';
import path from 'path';
import { VideoInfo, ConversionOptions, ConversionProgress, QualityPreset } from '../types/index.js';

/**
 * FFmpeg服务类 - 封装视频处理功能
 */
export class FFmpegService {
  private static instance: FFmpegService;
  private activeConversions = new Map<string, ConversionProgress>();

  private constructor() {
    // 设置ffmpeg可执行文件的路径，确保使用项目内的版本
    ffmpeg.setFfmpegPath(ffmpegPath);
  }

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

          // 修复时长获取逻辑，特别是对WMV等格式
          let duration = metadata.format.duration || 0;
          
          // 如果format中没有时长信息，尝试从视频流中获取
          if (!duration || duration === 0) {
            if (videoStream && videoStream.duration) {
              duration = parseFloat(videoStream.duration);
            } else if (audioStream && audioStream.duration) {
              duration = parseFloat(audioStream.duration);
            }
          }
          
          // 如果还是没有时长，尝试通过帧数和帧率计算
          if (!duration || duration === 0) {
            if (videoStream && videoStream.nb_frames && videoStream.r_frame_rate) {
              const frameCount = parseInt(videoStream.nb_frames);
              const frameRate = this.parseFrameRate(videoStream.r_frame_rate);
              if (frameCount > 0 && frameRate > 0) {
                duration = frameCount / frameRate;
              }
            }
          }

          const videoInfo: VideoInfo = {
            filePath,
            format: metadata.format.format_name || '未知',
            size: stats.size,
            duration: duration,
          };

          if (videoStream) {
            videoInfo.video = {
              codec: videoStream.codec_name || '未知',
              width: videoStream.width || 0,
              height: videoStream.height || 0,
              frameRate: this.parseFrameRate(videoStream.r_frame_rate),
              bitrate: videoStream.bit_rate ? parseInt(videoStream.bit_rate) : null,
            };
          }

          if (audioStream) {
            videoInfo.audio = {
              codec: audioStream.codec_name || '未知',
              sampleRate: audioStream.sample_rate || 0,
              channels: audioStream.channels || 0,
              bitrate: audioStream.bit_rate ? parseInt(audioStream.bit_rate) : null,
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
        .on('end', async () => {
          try {
            // 验证输出文件是否完整
            await this.validateOutputFile(outputPath);
            
            progress.status = 'completed';
            progress.progress = 100;
            progress.endTime = new Date();
            this.activeConversions.delete(taskId);
            onProgress?.(progress);
            resolve(outputPath);
          } catch (validationError: any) {
            progress.status = 'failed';
            progress.error = `输出文件验证失败: ${validationError.message}`;
            progress.endTime = new Date();
            this.activeConversions.delete(taskId);
            onProgress?.(progress);
            reject(new Error(`转换完成但文件验证失败: ${validationError.message}`));
          }
        })
        .on('error', (err) => {
          progress.status = 'failed';
          progress.error = err.message;
          progress.endTime = new Date();
          this.activeConversions.delete(taskId);
          onProgress?.(progress);
          
          // 提供更详细的错误信息
          let errorMessage = `视频转换失败: ${err.message}`;
          
          // 针对常见错误提供解决建议
          if (err.message.includes('moov atom not found')) {
            errorMessage += '\n建议: 输入文件可能损坏或格式不完整，请检查源文件';
          } else if (err.message.includes('Invalid data found')) {
            errorMessage += '\n建议: 输入文件格式可能不受支持或文件已损坏';
          } else if (err.message.includes('No such file or directory')) {
            errorMessage += '\n建议: 请检查输入文件路径是否正确';
          } else if (err.message.includes('Permission denied')) {
            errorMessage += '\n建议: 请检查文件权限或确保输出目录可写';
          } else if (err.message.includes('codec not found')) {
            errorMessage += '\n建议: 缺少必要的编解码器，请检查FFmpeg安装';
          }
          
          reject(new Error(errorMessage));
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
        // 修复MP4容器问题的关键参数
        command = command.addOption('-movflags', '+faststart+frag_keyframe+empty_moov');
        command = command.addOption('-f', 'mp4'); // 强制指定容器格式
        // 确保兼容性
        command = command.addOption('-pix_fmt', 'yuv420p');
        command = command.addOption('-profile:v', 'high');
        command = command.addOption('-level', '4.0');
        break;
      
      case 'avi':
        command = command.videoCodec('libx264').audioCodec('aac');
        command = command.addOption('-preset', 'medium');
        command = command.addOption('-crf', '23');
        command = command.addOption('-f', 'avi');
        break;
      
      case 'mov':
        command = command.videoCodec('libx264').audioCodec('aac');
        command = command.addOption('-preset', 'medium');
        command = command.addOption('-crf', '23');
        command = command.addOption('-movflags', '+faststart'); // 优化MOV播放
        command = command.addOption('-f', 'mov');
        break;
      
      case 'webm':
        command = command.videoCodec('libvpx-vp9').audioCodec('libopus');
        command = command.addOption('-crf', '30');
        command = command.addOption('-b:v', '0'); // 使用CRF模式
        command = command.addOption('-row-mt', '1'); // 多线程编码
        command = command.addOption('-f', 'webm');
        // 优化WEBM编码参数
        command = command.addOption('-deadline', 'good');
        command = command.addOption('-cpu-used', '1');
        break;
      
      case 'mkv':
        command = command.videoCodec('libx264').audioCodec('aac');
        command = command.addOption('-preset', 'medium');
        command = command.addOption('-crf', '23');
        command = command.addOption('-f', 'matroska');
        break;
      
      case 'flv':
        command = command.videoCodec('libx264').audioCodec('aac');
        command = command.addOption('-preset', 'medium');
        command = command.addOption('-crf', '25'); // FLV使用稍低质量
        command = command.addOption('-f', 'flv');
        break;
      
      case 'wmv':
        command = command.videoCodec('libx264').audioCodec('aac');
        command = command.addOption('-preset', 'medium');
        command = command.addOption('-crf', '25');
        command = command.addOption('-f', 'asf'); // WMV使用ASF容器
        // 修复WMV时长信息问题的关键参数
        command = command.addOption('-avoid_negative_ts', 'make_zero');
        command = command.addOption('-fflags', '+genpts+igndts');
        command = command.addOption('-use_wallclock_as_timestamps', '1');
        // 确保ASF容器正确写入时长信息
        command = command.addOption('-metadata', 'title=""');
        break;
      
      case 'm4v':
        command = command.videoCodec('libx264').audioCodec('aac');
        command = command.addOption('-preset', 'medium');
        command = command.addOption('-crf', '23');
        // 修复M4V格式的关键参数
        command = command.addOption('-f', 'mp4'); // M4V使用MP4容器
        command = command.addOption('-movflags', '+faststart+frag_keyframe+empty_moov');
        command = command.addOption('-brand', 'M4V '); // 设置M4V品牌标识
        command = command.addOption('-pix_fmt', 'yuv420p');
        command = command.addOption('-profile:v', 'high');
        command = command.addOption('-level', '4.0');
        // 确保moov atom正确写入
        command = command.addOption('-write_tmcd', '0');
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
   * 验证输出文件完整性
   */
  private async validateOutputFile(filePath: string): Promise<void> {
    try {
      // 检查文件是否存在
      await fs.access(filePath);
      
      // 检查文件大小
      const stats = await fs.stat(filePath);
      if (stats.size === 0) {
        throw new Error('输出文件为空');
      }
      
      // 尝试获取视频信息来验证文件完整性
      await this.getVideoInfo(filePath);
      
    } catch (error: any) {
      throw new Error(`文件验证失败: ${error.message}`);
    }
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}