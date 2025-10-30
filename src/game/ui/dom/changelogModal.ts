/**
 * Changelog Modal - Display version history and change logs
 * 
 * Fetches changelog data from GitHub releases API or falls back to local markdown files
 */

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  content: string;
  isPrerelease?: boolean;
}

export class ChangelogModal {
  private modal: HTMLDivElement;
  private content: HTMLDivElement;
  private loading: boolean = false;
  private cache: ChangelogEntry[] | null = null;

  constructor() {
    this.modal = this.createModal();
    this.content = this.modal.querySelector('.changelog-content') as HTMLDivElement;
    document.body.appendChild(this.modal);
    this.setupEventListeners();
  }

  private createModal(): HTMLDivElement {
    const modal = document.createElement('div');
    modal.className = 'modal changelog-modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-container">
        <div class="modal-header">
          <h2>📋 Change Log</h2>
          <button class="modal-close" type="button" aria-label="Close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="changelog-content">
            <div class="changelog-loading">
              <div class="spinner"></div>
              <p>Loading changelog...</p>
            </div>
          </div>
        </div>
      </div>
    `;
    modal.style.display = 'none';
    return modal;
  }

  private setupEventListeners(): void {
    // Close modal when clicking backdrop or close button
    this.modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('modal-backdrop') || target.classList.contains('modal-close')) {
        this.hide();
      }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display !== 'none') {
        this.hide();
      }
    });
  }

  /**
   * Show the changelog modal
   */
  async show(): Promise<void> {
    this.modal.style.display = 'flex';
    try {
      (window as any).game?.audioManager?.play('ui.panel.open');
    } catch {}

    // Load changelog if not already loaded
    if (!this.cache && !this.loading) {
      await this.loadChangelog();
    }
  }

  /**
   * Hide the changelog modal
   */
  hide(): void {
    this.modal.style.display = 'none';
    try {
      (window as any).game?.audioManager?.play('ui.panel.close');
    } catch {}
  }

  /**
   * Load changelog data from GitHub API or local files
   */
  private async loadChangelog(): Promise<void> {
    if (this.loading) return;
    this.loading = true;

    try {
      // First, try to fetch from GitHub API
      const entries = await this.fetchFromGitHub();
      if (entries.length > 0) {
        this.cache = entries;
        this.renderChangelog(entries);
      } else {
        // Fallback to local markdown files
        const localEntries = await this.fetchFromLocal();
        this.cache = localEntries;
        this.renderChangelog(localEntries);
      }
    } catch (error) {
      console.error('Failed to load changelog:', error);
      this.renderError();
    } finally {
      this.loading = false;
    }
  }

  /**
   * Fetch changelog from GitHub releases API
   */
  private async fetchFromGitHub(): Promise<ChangelogEntry[]> {
    try {
      const response = await fetch('https://api.github.com/repos/Toast1111/ColonyGame/releases');
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const releases = await response.json();
      return releases.slice(0, 10).map((release: any) => ({
        version: release.tag_name || release.name || 'Unknown',
        date: new Date(release.published_at).toLocaleDateString(),
        title: release.name || release.tag_name || 'Release',
        content: this.parseMarkdown(this.sanitizeContent(release.body || 'No changelog available.')),
        isPrerelease: release.prerelease
      }));
    } catch (error) {
      console.warn('Failed to fetch from GitHub:', error);
      return [];
    }
  }

  /**
   * Fetch changelog from local markdown files in docs folder
   */
  private async fetchFromLocal(): Promise<ChangelogEntry[]> {
    try {
      // List of changelog files to try (you can add more as needed)
      const changelogFiles = [
        'CHANGELOG.md',
        'RECENT_CHANGES.md', 
        'VERSION_HISTORY.md',
        'RELEASE_NOTES.md'
      ];

      for (const filename of changelogFiles) {
        try {
          const response = await fetch(`/docs/${filename}`);
          if (response.ok) {
            const content = await response.text();
            return this.parseLocalMarkdown(content, filename);
          }
        } catch (error) {
          console.warn(`Failed to load ${filename}:`, error);
        }
      }

      // If no files found, create a default entry
      return [{
        version: 'Current',
        date: new Date().toLocaleDateString(),
        title: 'Latest Development Build',
        content: `
          <h3>🚀 Current Features</h3>
          <ul>
            <li>Colony management and survival gameplay</li>
            <li>Building construction system</li>
            <li>Colonist AI and work assignment</li>
            <li>Resource gathering and management</li>
            <li>Combat system with weapons and enemies</li>
            <li>Health and medical system</li>
            <li>Research and technology tree</li>
            <li>Mobile and touch support</li>
          </ul>
          <p><em>This is a development build. Check the GitHub repository for the latest updates!</em></p>
        `
      }];
    } catch (error) {
      console.error('Failed to load local changelog:', error);
      return [];
    }
  }

  /**
   * Parse markdown content from local files
   */
  private parseLocalMarkdown(content: string, filename: string): ChangelogEntry[] {
    const entries: ChangelogEntry[] = [];
    const lines = content.split('\n');
    
    let currentEntry: Partial<ChangelogEntry> | null = null;
    let contentLines: string[] = [];

    for (const line of lines) {
      // Check for version headers (## v1.0.0 or # Version 1.0.0, etc.)
      const versionMatch = line.match(/^#+\s*(v?[\d.]+.*?)(?:\s*-\s*(.+?))?$/i);
      if (versionMatch) {
        // Save previous entry
        if (currentEntry) {
          currentEntry.content = this.parseMarkdown(this.sanitizeContent(contentLines.join('\n')));
          entries.push(currentEntry as ChangelogEntry);
        }

        // Start new entry
        currentEntry = {
          version: versionMatch[1],
          title: versionMatch[2] || versionMatch[1],
          date: 'Recent',
        };
        contentLines = [];
      } else if (currentEntry) {
        // Add content to current entry
        contentLines.push(line);
      }
    }

    // Add the last entry
    if (currentEntry) {
      currentEntry.content = this.parseMarkdown(this.sanitizeContent(contentLines.join('\n')));
      entries.push(currentEntry as ChangelogEntry);
    }

    // If no entries found, create one from the entire content
    if (entries.length === 0) {
      entries.push({
        version: 'Current',
        date: new Date().toLocaleDateString(),
        title: filename.replace('.md', ''),
        content: this.parseMarkdown(this.sanitizeContent(content))
      });
    }

    return entries;
  }

  /**
   * Sanitize content to remove author information and other potentially sensitive data
   */
  public sanitizeContent(content: string): string {
    return content
      // Remove "by @username" patterns (common in GitHub auto-generated release notes)
      .replace(/\s+by\s+@[\w-]+/gi, '')
      // Remove "by username" patterns (without @)
      .replace(/\s+by\s+[\w-]+$/gmi, '')
      // Remove "- by @username" at end of lines
      .replace(/\s*-\s*by\s+@[\w-]+$/gmi, '')
      // Remove "(by @username)" patterns
      .replace(/\s*\(\s*by\s+@[\w-]+\s*\)/gi, '')
      // Remove "authored by" patterns
      .replace(/\s+authored\s+by\s+@?[\w-]+/gi, '')
      // Remove "committed by" patterns
      .replace(/\s+committed\s+by\s+@?[\w-]+/gi, '')
      // Remove GitHub commit signatures like "Signed-off-by:"
      .replace(/^Signed-off-by:.*$/gmi, '')
      // Remove "Co-authored-by:" lines
      .replace(/^Co-authored-by:.*$/gmi, '')
      // Remove excessive newlines that might be left after removing author info
      .replace(/\n\n\n+/g, '\n\n')
      // Trim whitespace
      .trim();
  }

  /**
   * Simple markdown to HTML converter
   */
  private parseMarkdown(markdown: string): string {
    return markdown
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^\* (.*$)/gm, '<li>$1</li>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/<\/ul>\s*<ul>/g, '')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[h|l|u])(.+)$/gm, '<p>$1</p>')
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<h[1-6])/g, '$1')
      .replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  }

  /**
   * Render the changelog entries
   */
  private renderChangelog(entries: ChangelogEntry[]): void {
    if (entries.length === 0) {
      this.renderError();
      return;
    }

    const html = entries.map(entry => `
      <div class="changelog-entry ${entry.isPrerelease ? 'prerelease' : ''}">
        <div class="changelog-header">
          <h3>
            ${entry.version}
            ${entry.isPrerelease ? '<span class="prerelease-badge">Pre-release</span>' : ''}
          </h3>
          <span class="changelog-date">${entry.date}</span>
        </div>
        <div class="changelog-body">
          ${entry.content}
        </div>
      </div>
    `).join('');

    this.content.innerHTML = html;
  }

  /**
   * Render error state
   */
  private renderError(): void {
    this.content.innerHTML = `
      <div class="changelog-error">
        <h3>⚠️ Unable to Load Changelog</h3>
        <p>Could not fetch changelog from GitHub or local files.</p>
        <p>Please check the <a href="https://github.com/Toast1111/ColonyGame/releases" target="_blank">GitHub repository</a> for the latest updates.</p>
      </div>
    `;
  }
}