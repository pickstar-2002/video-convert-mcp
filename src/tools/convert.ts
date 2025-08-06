import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { FFmpegService } from '../services/ffmpeg.js';
import { ValidatorService } from '../services/validator.js';
import { ConvertVideoArgs, VideoFormat } from '../types/index.js';
import path from 'path';

/**
 * 视频转换工具
 */
export const convertVideoTool: Tool = {
  name: 'convert_video',
  description: '将视频文件转换为指定格式。支持MP4、AVI、MOV、WMV、FLV、MKV、WEBM、M4V等主流格式之间的相互转换。',
  inputSchema: {
    type: 'object',
    properties: {
      inputPath: {
        type: 'string',
        description: '输入视频文件的完整路径'
      },
      outputFormat: {
        type: 'string',
        enum: ['mp4', 'avi', 'mov', 'wmv', 'mkv', 'webm', 'm4v'],
        description: '目标输出格式'
      },
      outputPath: {
        type: 'string',
        description: '输出文件路径（可选，如果不指定则自动生成）'
      },
      quality: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'ultra'],
        description: '视频质量预设（可选）'
      },
      resolution: {
        type: 'string',
        description: '输出分辨率，格式为"宽度x高度"，如"1920x1080"（可选）'
      },
      videoBitrate: {
        type: 'number',
        description: '视频码率，单位kbps（可选）'
      },
      audioBitrate: {
        type: 'number',
        description: '音频码率，单位kbps（可选）'
      },
      frameRate: {
        type: 'number',
        description: '输出帧率，单位fps（可选）'
      },
      overwrite: {
        type: 'boolean',
        description: '是否覆盖已存在的输出文件（默认false）'
      }
    },
    required: ['inputPath', 'outputFormat']
  }
};

/**
 * 处理视频转换请求
 */
export async function handleConvertVideo(args: ConvertVideoArgs): Promise<any> {
  const ffmpegService = FFmpegService.getInstance();
  const validator = ValidatorService.getInstance();

  try {
    // 验证输入文件
    const inputValidation = await validator.validateVideoFile(args.inputPath);
    if (!inputValidation.isValid) {
      return {
        success: false,
        error: `输入文件验证失败: ${inputValidation.error}`
      };
    }

    // 验证输出格式
    const formatValidation = validator.validateOutputFormat(args.outputFormat);
    if (!formatValidation.isValid) {
      return {
        success: false,
        error: formatValidation.error
      };
    }

    // 生成输出路径（如果未指定）
    let outputPath = args.outputPath;
    if (!outputPath) {
      const inputDir = path.dirname(args.inputPath);
      const inputName = path.parse(args.inputPath).name;
      outputPath = path.join(inputDir, `${inputName}_converted.${args.outputFormat}`);
    }

    // 验证输出路径
    const outputValidation = await validator.validateOutputPath(outputPath, args.overwrite || false);
    if (!outputValidation.isValid) {
      return {
        success: false,
        error: outputValidation.error
      };
    }

    // 构建转换选项
    const conversionOptions: any = {
      outputFormat: args.outputFormat as VideoFormat,
      overwrite: args.overwrite || false
    };

    // 添加可选参数
    if (args.quality) {
      conversionOptions.quality = args.quality;
    }

    if (args.resolution) {
      const resolutionValidation = validator.validateResolution(args.resolution);
      if (!resolutionValidation.isValid) {
        return {
          success: false,
          error: resolutionValidation.error
        };
      }
      conversionOptions.resolution = {
        width: resolutionValidation.width!,
        height: resolutionValidation.height!
      };
    }

    if (args.videoBitrate) {
      const bitrateValidation = validator.validateBitrate(args.videoBitrate, 'video');
      if (!bitrateValidation.isValid) {
        return {
          success: false,
          error: bitrateValidation.error
        };
      }
      conversionOptions.videoBitrate = args.videoBitrate;
    }

    if (args.audioBitrate) {
      const bitrateValidation = validator.validateBitrate(args.audioBitrate, 'audio');
      if (!bitrateValidation.isValid) {
        return {
          success: false,
          error: bitrateValidation.error
        };
      }
      conversionOptions.audioBitrate = args.audioBitrate;
    }

    if (args.frameRate) {
      const frameRateValidation = validator.validateFrameRate(args.frameRate);
      if (!frameRateValidation.isValid) {
        return {
          success: false,
          error: frameRateValidation.error
        };
      }
      conversionOptions.frameRate = args.frameRate;
    }

    // 获取输入文件信息
    const inputInfo = await ffmpegService.getVideoInfo(args.inputPath);

    // 执行转换
    console.log(`开始转换视频: ${args.inputPath} -> ${outputPath}`);
    
    const result = await ffmpegService.convertVideo(
      args.inputPath,
      outputPath,
      conversionOptions,
      (progress) => {
        console.log(`转换进度: ${progress.progress}% (${progress.status})`);
      }
    );

    // 获取输出文件信息
    const outputInfo = await ffmpegService.getVideoInfo(result);

    return {
      success: true,
      message: '视频转换完成',
      data: {
        inputPath: args.inputPath,
        outputPath: result,
        inputInfo: {
          format: inputInfo.format,
          size: `${(inputInfo.size / (1024 * 1024)).toFixed(2)} MB`,
          duration: `${Math.round(inputInfo.duration)} 秒`,
          resolution: inputInfo.video ? `${inputInfo.video.width}x${inputInfo.video.height}` : '未知',
          videoCodec: inputInfo.video?.codec || '未知',
          audioCodec: inputInfo.audio?.codec || '未知'
        },
        outputInfo: {
          format: outputInfo.format,
          size: `${(outputInfo.size / (1024 * 1024)).toFixed(2)} MB`,
          duration: `${Math.round(outputInfo.duration)} 秒`,
          resolution: outputInfo.video ? `${outputInfo.video.width}x${outputInfo.video.height}` : '未知',
          videoCodec: outputInfo.video?.codec || '未知',
          audioCodec: outputInfo.audio?.codec || '未知'
        },
        conversionOptions
      }
    };

  } catch (error: any) {
    console.error('视频转换失败:', error);
    return {
      success: false,
      error: `转换失败: ${error.message}`
    };
  }
}