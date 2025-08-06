import { promises as fs } from 'fs';
import path from 'path';
import mime from 'mime-types';
import { VideoFormat } from '../types/index.js';

/**
 * 视频格式验证服务
 */
export class ValidatorService {
  private static instance: ValidatorService;
  
  // 支持的视频格式及其MIME类型
  private readonly supportedFormats: Record<VideoFormat, string[]> = {
    mp4: ['video/mp4', 'video/x-mp4'],
    avi: ['video/avi', 'video/x-msvideo'],
    mov: ['video/quicktime', 'video/x-quicktime'],
    wmv: ['video/x-ms-wmv', 'video/x-ms-asf'],
    mkv: ['video/x-matroska'],
    webm: ['video/webm'],
    m4v: ['video/x-m4v']
  };

  // 常见视频文件扩展名
  private readonly videoExtensions = [
    '.mp4', '.avi', '.mov', '.wmv', '.mkv', '.webm', '.m4v',
    '.mpg', '.mpeg', '.3gp', '.asf', '.rm', '.rmvb'
  ];

  private constructor() {}

  public static getInstance(): ValidatorService {
    if (!ValidatorService.instance) {
      ValidatorService.instance = new ValidatorService();
    }
    return ValidatorService.instance;
  }

  /**
   * 验证文件是否存在
   */
  async validateFileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证文件是否为视频文件
   */
  async validateVideoFile(filePath: string): Promise<{ isValid: boolean; error?: string }> {
    // 检查文件是否存在
    if (!(await this.validateFileExists(filePath))) {
      return { isValid: false, error: `文件不存在: ${filePath}` };
    }

    // 检查文件扩展名
    const ext = path.extname(filePath).toLowerCase();
    if (!this.videoExtensions.includes(ext)) {
      return { isValid: false, error: `不支持的文件扩展名: ${ext}` };
    }

    // 检查文件大小
    try {
      const stats = await fs.stat(filePath);
      if (stats.size === 0) {
        return { isValid: false, error: '文件为空' };
      }

      // 检查文件大小限制 (例如: 最大10GB)
      const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
      if (stats.size > maxSize) {
        return { isValid: false, error: `文件过大，超过${maxSize / (1024 * 1024 * 1024)}GB限制` };
      }
    } catch (error) {
      return { isValid: false, error: `无法读取文件信息: ${error}` };
    }

    // 检查MIME类型
    const mimeType = mime.lookup(filePath);
    if (mimeType && !mimeType.startsWith('video/')) {
      return { isValid: false, error: `文件类型不是视频: ${mimeType}` };
    }

    return { isValid: true };
  }

  /**
   * 验证输出格式是否支持
   */
  validateOutputFormat(format: string): { isValid: boolean; error?: string } {
    const supportedFormats = Object.keys(this.supportedFormats);
    if (!supportedFormats.includes(format as VideoFormat)) {
      return {
        isValid: false,
        error: `不支持的输出格式: ${format}。支持的格式: ${supportedFormats.join(', ')}`
      };
    }
    return { isValid: true };
  }

  /**
   * 验证输出路径
   */
  async validateOutputPath(outputPath: string, overwrite: boolean = false): Promise<{ isValid: boolean; error?: string }> {
    // 检查输出目录是否可写
    const outputDir = path.dirname(outputPath);
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
      return { isValid: false, error: `无法创建输出目录: ${outputDir}` };
    }

    // 检查输出文件是否已存在
    if (!overwrite && await this.validateFileExists(outputPath)) {
      return { isValid: false, error: `输出文件已存在: ${outputPath}` };
    }

    // 检查文件名是否有效
    const fileName = path.basename(outputPath);
    if (!this.isValidFileName(fileName)) {
      return { isValid: false, error: `无效的文件名: ${fileName}` };
    }

    return { isValid: true };
  }

  /**
   * 验证分辨率字符串格式
   */
  validateResolution(resolution: string): { isValid: boolean; width?: number; height?: number; error?: string } {
    const resolutionPattern = /^(\d+)x(\d+)$/;
    const match = resolution.match(resolutionPattern);
    
    if (!match) {
      return { isValid: false, error: '分辨率格式无效，应为 "宽度x高度" 格式，如 "1920x1080"' };
    }

    const width = parseInt(match[1]);
    const height = parseInt(match[2]);

    // 检查分辨率范围
    if (width < 1 || height < 1) {
      return { isValid: false, error: '分辨率必须大于0' };
    }

    if (width > 7680 || height > 4320) {
      return { isValid: false, error: '分辨率过大，最大支持8K (7680x4320)' };
    }

    return { isValid: true, width, height };
  }

  /**
   * 验证码率值
   */
  validateBitrate(bitrate: number, type: 'video' | 'audio'): { isValid: boolean; error?: string } {
    if (bitrate <= 0) {
      return { isValid: false, error: `${type === 'video' ? '视频' : '音频'}码率必须大于0` };
    }

    const maxBitrate = type === 'video' ? 50000 : 320; // 视频最大50Mbps，音频最大320kbps
    if (bitrate > maxBitrate) {
      return {
        isValid: false,
        error: `${type === 'video' ? '视频' : '音频'}码率过大，最大支持${maxBitrate}${type === 'video' ? 'kbps' : 'kbps'}`
      };
    }

    return { isValid: true };
  }

  /**
   * 验证帧率
   */
  validateFrameRate(frameRate: number): { isValid: boolean; error?: string } {
    if (frameRate <= 0) {
      return { isValid: false, error: '帧率必须大于0' };
    }

    if (frameRate > 120) {
      return { isValid: false, error: '帧率过高，最大支持120fps' };
    }

    return { isValid: true };
  }

  /**
   * 批量验证输入文件
   */
  async validateInputFiles(filePaths: string[]): Promise<{ validFiles: string[]; invalidFiles: Array<{ path: string; error: string }> }> {
    const validFiles: string[] = [];
    const invalidFiles: Array<{ path: string; error: string }> = [];

    for (const filePath of filePaths) {
      const validation = await this.validateVideoFile(filePath);
      if (validation.isValid) {
        validFiles.push(filePath);
      } else {
        invalidFiles.push({ path: filePath, error: validation.error || '未知错误' });
      }
    }

    return { validFiles, invalidFiles };
  }

  /**
   * 获取支持的格式列表
   */
  getSupportedFormats(): VideoFormat[] {
    return Object.keys(this.supportedFormats) as VideoFormat[];
  }

  /**
   * 获取格式的MIME类型
   */
  getFormatMimeTypes(format: VideoFormat): string[] {
    return this.supportedFormats[format] || [];
  }

  /**
   * 检查文件名是否有效
   */
  private isValidFileName(fileName: string): boolean {
    // 检查文件名长度
    if (fileName.length === 0 || fileName.length > 255) {
      return false;
    }

    // 检查非法字符 (Windows和Unix通用)
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(fileName)) {
      return false;
    }

    // 检查保留名称 (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
    if (reservedNames.test(fileName)) {
      return false;
    }

    return true;
  }

  /**
   * 清理文件名，移除非法字符
   */
  sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i, '_$2')
      .substring(0, 255);
  }
}