/**
 * @file Artifact 渲染器注册表
 * @description 单例模式管理所有 Artifact 渲染器，支持动态注册和查询
 * @module lib/artifact/registry
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.6
 */

import type { ArtifactType, RendererEntry } from "./types";
import {
  DEFAULT_FILE_EXTENSIONS,
  isCanvasType as checkIsCanvasType,
} from "./types";

/**
 * Artifact 渲染器注册表
 * 单例模式，管理所有渲染器
 *
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.6
 */
class ArtifactRegistry {
  /** 渲染器映射表 */
  private entries: Map<ArtifactType, RendererEntry> = new Map();

  /**
   * 注册渲染器
   * @param entry - 渲染器注册项
   * @requirements 3.1
   */
  register(entry: RendererEntry): void {
    this.entries.set(entry.type, entry);
  }

  /**
   * 获取渲染器
   * @param type - Artifact 类型
   * @returns 渲染器注册项，如果未注册则返回 undefined
   * @requirements 3.2
   */
  get(type: ArtifactType): RendererEntry | undefined {
    return this.entries.get(type);
  }

  /**
   * 检查是否已注册
   * @param type - Artifact 类型
   * @returns 是否已注册
   * @requirements 3.3
   */
  has(type: ArtifactType): boolean {
    return this.entries.has(type);
  }

  /**
   * 获取所有渲染器
   * @returns 所有已注册的渲染器列表
   * @requirements 3.6
   */
  getAll(): RendererEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * 判断是否为 Canvas 类型
   * Canvas 类型的 Artifact 将委托给现有 Canvas 系统渲染
   * @param type - Artifact 类型
   * @returns 是否为 Canvas 类型
   * @requirements 3.4
   */
  isCanvasType(type: ArtifactType): boolean {
    return checkIsCanvasType(type);
  }

  /**
   * 获取文件扩展名
   * 优先使用渲染器注册项中的扩展名，否则使用默认扩展名
   * @param type - Artifact 类型
   * @returns 文件扩展名（不含点号）
   */
  getFileExtension(type: ArtifactType): string {
    const entry = this.entries.get(type);
    if (entry?.fileExtension) {
      return entry.fileExtension;
    }
    return DEFAULT_FILE_EXTENSIONS[type] || "txt";
  }
}

/**
 * 全局 Artifact 渲染器注册表实例
 * 使用单例模式确保全局唯一
 */
export const artifactRegistry = new ArtifactRegistry();

// 同时导出类以便测试
export { ArtifactRegistry };
