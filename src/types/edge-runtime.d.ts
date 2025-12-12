/**
 * Edge Runtime Global Type Declaration
 * 
 * EdgeRuntime 是 Cloudflare Workers/Pages 和 Vercel Edge Runtime 的全局变量
 * 用于检测代码是否在 Edge Runtime 环境中运行
 */

declare global {
  // EdgeRuntime 在 Edge 环境中是一个字符串，在 Node.js 中是 undefined
  const EdgeRuntime: string | undefined;
}

export {};
