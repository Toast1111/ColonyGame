import { setChangelogVisible } from '../stores/changelogStore';
import { sanitizeChangelogContent } from './changelogData';

export interface ChangelogModalHandle {
  show(): void;
  hide(): void;
  sanitizeContent(content: string): string;
}

export function createChangelogBridge(): ChangelogModalHandle {
  return {
    show() {
      setChangelogVisible(true);
    },
    hide() {
      setChangelogVisible(false);
    },
    sanitizeContent(content: string) {
      return sanitizeChangelogContent(content);
    }
  };
}
