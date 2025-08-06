/**
 * 全局类型声明
 * 
 * 在这里为没有官方@types包的模块提供声明。
 */

declare module '@ffmpeg-installer/ffmpeg' {
  export const path: string;
  export const version: string;
  export const url: string;
}