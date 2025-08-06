import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { FFmpegService } from '../services/ffmpeg.js';
import { ValidatorService } from '../services/validator.js';
import { BatchConvertArgs, VideoFormat } from '../types/index.js';
import path from 'path';

/**
 * 批量视频转换工具
 */
export const batchConvertTool: Tool = {
  name: 'batch_convert',
  description: '批量转换多个视频文件为指定格式。支持同时处理多个文件，提高转换效率。',
  inputSchema: {
    type: 'object',
    properties: {
      inputFiles: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: '输入视频文件路径列表'
      },
      outputFormat: {
        type: 'string',
        enum: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v'],
        description: '目标输出格式'
      },
      outputDir: {
        type: 'string',
        description: '输出目录路径'
      },
      quality: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'ultra'],
        description: '视频质量预设（可选）'
      },
      overwrite: {
        type: 'boolean',
        description: '是否覆盖已存在的输出文件（默认false）'
      }
    },
    required: ['inputFiles', 'outputFormat', 'outputDir']
  }
};

/**
 * 处理批量视频转换请求
 */
export async function handleBatchConvert(args: BatchConvertArgs): Promise<any> {
  const ffmpegService = FFmpegService.getInstance();
  const validator = ValidatorService.getInstance();

  try {
    // 验证输入参数
    if (!args.inputFiles || args.inputFiles.length === 0) {
      return {
        success: false,
        error: '输入文件列表不能为空'
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

    // 验证输入文件
    console.log(`正在验证 ${args.inputFiles.length} 个输入文件...`);
    const fileValidation = await validator.validateInputFiles(args.inputFiles);
    
    if (fileValidation.invalidFiles.length > 0) {
      console.warn('发现无效文件:', fileValidation.invalidFiles);
    }

    if (fileValidation.validFiles.length === 0) {
      return {
        success: false,
        error: '没有有效的输入文件',
        invalidFiles: fileValidation.invalidFiles
      };
    }

    // 验证输出目录
    const outputDirValidation = await validator.validateOutputPath(
      path.join(args.outputDir, 'test.tmp'), 
      true
    );
    if (!outputDirValidation.isValid) {
      return {
        success: false,
        error: `输出目录验证失败: ${outputDirValidation.error}`
      };
    }

    // 构建转换选项
    const conversionOptions: any = {
      outputFormat: args.outputFormat as VideoFormat,
      overwrite: args.overwrite || false
    };

    if (args.quality) {
      conversionOptions.quality = args.quality;
    }

    // 准备转换任务
    const conversionTasks: Array<{
      inputPath: string;
      outputPath: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      error?: string;
    }> = [];

    for (const inputFile of fileValidation.validFiles) {
      const fileName = path.parse(inputFile).name;
      const outputPath = path.join(args.outputDir, `${fileName}.${args.outputFormat}`);
      
      conversionTasks.push({
        inputPath: inputFile,
        outputPath,
        status: 'pending'
      });
    }

    // 检查输出文件冲突
    if (!args.overwrite) {
      const conflicts: string[] = [];
      for (const task of conversionTasks) {
        if (await validator.validateFileExists(task.outputPath)) {
          conflicts.push(task.outputPath);
        }
      }
      
      if (conflicts.length > 0) {
        return {
          success: false,
          error: `以下输出文件已存在，请设置overwrite为true或删除这些文件: ${conflicts.join(', ')}`
        };
      }
    }

    // 执行批量转换
    console.log(`开始批量转换 ${conversionTasks.length} 个文件...`);
    const results: string[] = [];
    const errors: Array<{ file: string; error: string }> = [];

    let completedCount = 0;
    const totalCount = conversionTasks.length;

    for (const task of conversionTasks) {
      try {
        console.log(`[${completedCount + 1}/${totalCount}] 正在转换: ${path.basename(task.inputPath)}`);
        task.status = 'processing';

        const result = await ffmpegService.convertVideo(
          task.inputPath,
          task.outputPath,
          conversionOptions,
          (progress) => {
            console.log(`  进度: ${progress.progress}%`);
          }
        );

        task.status = 'completed';
        results.push(result);
        completedCount++;
        
        console.log(`✓ 完成: ${path.basename(result)}`);

      } catch (error: any) {
        task.status = 'failed';
        task.error = error.message;
        errors.push({ file: task.inputPath, error: error.message });
        
        console.error(`✗ 失败: ${path.basename(task.inputPath)} - ${error.message}`);
      }
    }

    // 生成转换报告
    const report = {
      总文件数: args.inputFiles.length,
      有效文件数: fileValidation.validFiles.length,
      成功转换: results.length,
      转换失败: errors.length,
      无效文件: fileValidation.invalidFiles.length
    };

    const isPartialSuccess = results.length > 0 && errors.length > 0;
    const isCompleteSuccess = results.length > 0 && errors.length === 0;

    return {
      success: isCompleteSuccess || isPartialSuccess,
      message: isCompleteSuccess 
        ? '批量转换全部完成' 
        : isPartialSuccess 
          ? '批量转换部分完成' 
          : '批量转换失败',
      data: {
        转换报告: report,
        成功文件: results,
        失败详情: errors.length > 0 ? errors : undefined,
        无效文件: fileValidation.invalidFiles.length > 0 ? fileValidation.invalidFiles : undefined,
        转换任务: conversionTasks
      }
    };

  } catch (error: any) {
    console.error('批量转换失败:', error);
    return {
      success: false,
      error: `批量转换失败: ${error.message}`
    };
  }
}