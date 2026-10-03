/**
 * Languages Module — Registers all supported language adapters.
 */

import { languageRegistry } from '../core/registry/language-registry';
import { CLanguageAdapter } from './c';
import { CPPLanguageAdapter } from './cpp';
import { PythonLanguageAdapter } from './python';
import { JavaLanguageAdapter } from './java';

export function initializeLanguages(): void {
  languageRegistry.registerLanguage(new CLanguageAdapter());
  languageRegistry.registerLanguage(new CPPLanguageAdapter());
  languageRegistry.registerLanguage(new PythonLanguageAdapter());
  languageRegistry.registerLanguage(new JavaLanguageAdapter());
}

// Auto-initialize on import
initializeLanguages();

export { CLanguageAdapter } from './c';
export { CPPLanguageAdapter } from './cpp';
export { PythonLanguageAdapter } from './python';
export { JavaLanguageAdapter } from './java';
