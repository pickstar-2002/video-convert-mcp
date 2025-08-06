/**
 * MCP工具导出
 */

import { convertVideoTool, handleConvertVideo } from './convert.js';
import { getVideoInfoTool, handleGetVideoInfo } from './info.js';
import { batchConvertTool, handleBatchConvert } from './batch.js';

// 重新导出
export { convertVideoTool, handleConvertVideo } from './convert.js';
export { getVideoInfoTool, handleGetVideoInfo } from './info.js';
export { batchConvertTool, handleBatchConvert } from './batch.js';

// 导出所有工具
export const tools = [
  convertVideoTool,
  getVideoInfoTool,
  batchConvertTool
];

// 工具处理器映射
export const toolHandlers = {
  convert_video: handleConvertVideo,
  get_video_info: handleGetVideoInfo,
  batch_convert: handleBatchConvert
};
