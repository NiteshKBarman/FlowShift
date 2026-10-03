/**
 * Language Registry — Central registry for language adapters.
 *
 * Adding a new language requires only:
 * 1. Implementing a LanguageAdapter
 * 2. Calling registry.registerLanguage(adapter)
 */

import type { LanguageAdapter } from './language-adapter';

class LanguageRegistryImpl {
  private readonly adapters = new Map<string, LanguageAdapter>();

  /**
   * Register a language adapter.
   */
  registerLanguage(adapter: LanguageAdapter): void {
    if (this.adapters.has(adapter.id)) {
      console.warn(
        `Language adapter "${adapter.id}" is already registered. Overwriting.`
      );
    }
    this.adapters.set(adapter.id, adapter);
  }

  /**
   * Get a language adapter by ID.
   */
  getLanguage(id: string): LanguageAdapter | undefined {
    return this.adapters.get(id);
  }

  /**
   * Get a language adapter, throwing if not found.
   */
  getLanguageOrThrow(id: string): LanguageAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw new Error(`Language adapter "${id}" not found. Available: ${this.listLanguageIds().join(', ')}`);
    }
    return adapter;
  }

  /**
   * List all registered language adapters.
   */
  listLanguages(): LanguageAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * List all registered language IDs.
   */
  listLanguageIds(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check if a language is supported.
   */
  supportsLanguage(id: string): boolean {
    return this.adapters.has(id);
  }

  /**
   * Unregister a language adapter.
   */
  unregisterLanguage(id: string): boolean {
    return this.adapters.delete(id);
  }

  /**
   * Clear all registered adapters.
   */
  clear(): void {
    this.adapters.clear();
  }
}

// Singleton instance
export const languageRegistry = new LanguageRegistryImpl();

// Re-export the type
export type { LanguageAdapter } from './language-adapter';
