import type { ChangelogEntry, CommitInfo } from '../stores/changelogTypes';

export async function loadChangelogEntries(): Promise<ChangelogEntry[]> {
  try {
    const entries = await fetchFromGitHub();
    if (entries.length > 0) {
      return entries;
    }
    return await fetchFromLocal();
  } catch (error) {
    console.warn('Failed to load changelog:', error);
    return [];
  }
}

export function sanitizeChangelogContent(content: string): string {
  return content
    .replace(/\s+by\s+@[\w-]+/gi, '')
    .replace(/\s+by\s+[\w-]+$/gmi, '')
    .replace(/\s*-\s*by\s+@[\w-]+$/gmi, '')
    .replace(/\s*\(\s*by\s+@[\w-]+\s*\)/gi, '')
    .replace(/\s+authored\s+by\s+@?[\w-]+/gi, '')
    .replace(/\s+committed\s+by\s+@?[\w-]+/gi, '')
    .replace(/^Signed-off-by:.*$/gmi, '')
    .replace(/^Co-authored-by:.*$/gmi, '')
    .replace(/\n\n\n+/g, '\n\n')
    .trim();
}

function sanitizeCommitMessage(message: string): string {
  return message
    .split('\n')[0]
    .replace(/\(#\d+\)/g, '')
    .replace(/Co-authored-by:.*$/gmi, '')
    .replace(/Signed-off-by:.*$/gmi, '')
    .trim();
}

function sanitizeAuthor(_author: string): string {
  return 'Developer';
}

async function fetchFromGitHub(): Promise<ChangelogEntry[]> {
  try {
    const response = await fetch('https://api.github.com/repos/Toast1111/ColonyGame/releases');
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const releases = await response.json();
    const releaseData = releases.slice(0, 10);

    const entriesWithCommits = await Promise.all(
      releaseData.map(async (release: any, index: number) => {
        const commits = await fetchCommitsForRelease(release, releaseData[index + 1]);
        const contentHtml = parseMarkdown(
          sanitizeChangelogContent(release.body || 'No changelog available.')
        );

        return {
          version: release.tag_name || release.name || 'Unknown',
          date: new Date(release.published_at).toLocaleDateString(),
          title: release.name || release.tag_name || 'Release',
          contentHtml,
          isPrerelease: release.prerelease,
          commits
        } satisfies ChangelogEntry;
      })
    );

    return entriesWithCommits;
  } catch (error) {
    console.warn('Failed to fetch from GitHub:', error);
    return [];
  }
}

async function fetchCommitsForRelease(release: any, previousRelease?: any): Promise<CommitInfo[]> {
  try {
    let commitsUrl = '';

    if (previousRelease && previousRelease.tag_name) {
      commitsUrl = `https://api.github.com/repos/Toast1111/ColonyGame/compare/${previousRelease.tag_name}...${release.tag_name}`;
    } else {
      const releaseDate = new Date(release.published_at);
      releaseDate.setDate(releaseDate.getDate() - 30);
      const since = releaseDate.toISOString();
      commitsUrl = `https://api.github.com/repos/Toast1111/ColonyGame/commits?since=${since}&until=${release.published_at}`;
    }

    const response = await fetch(commitsUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch commits for ${release.tag_name}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const commits = data.commits || data;

    return commits.slice(0, 20).map((commit: any) => ({
      sha: commit.sha.substring(0, 7),
      message: sanitizeCommitMessage(commit.commit?.message || commit.message || 'No message'),
      author: sanitizeAuthor(commit.commit?.author?.name || commit.author?.login || 'Unknown'),
      date: new Date(commit.commit?.author?.date || commit.commit?.committer?.date || release.published_at).toLocaleDateString(),
      url: commit.html_url || `https://github.com/Toast1111/ColonyGame/commit/${commit.sha}`
    }));
  } catch (error) {
    console.warn(`Failed to fetch commits for release ${release.tag_name}:`, error);
    return [];
  }
}

async function fetchFromLocal(): Promise<ChangelogEntry[]> {
  try {
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
          return parseLocalMarkdown(content, filename);
        }
      } catch (error) {
        console.warn(`Failed to load ${filename}:`, error);
      }
    }

    return [{
      version: 'Current',
      date: new Date().toLocaleDateString(),
      title: 'Latest Development Build',
      contentHtml: `
        <h3>Current Features</h3>
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

function parseLocalMarkdown(content: string, filename: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const lines = content.split('\n');

  let currentEntry: Partial<ChangelogEntry> | null = null;
  let contentLines: string[] = [];

  for (const line of lines) {
    const versionMatch = line.match(/^#+\s*(v?[\d.]+.*?)(?:\s*-\s*(.+?))?$/i);
    if (versionMatch) {
      if (currentEntry) {
        currentEntry.contentHtml = parseMarkdown(
          sanitizeChangelogContent(contentLines.join('\n'))
        );
        entries.push(currentEntry as ChangelogEntry);
      }

      currentEntry = {
        version: versionMatch[1],
        title: versionMatch[2] || versionMatch[1],
        date: 'Recent'
      };
      contentLines = [];
    } else if (currentEntry) {
      contentLines.push(line);
    }
  }

  if (currentEntry) {
    currentEntry.contentHtml = parseMarkdown(
      sanitizeChangelogContent(contentLines.join('\n'))
    );
    entries.push(currentEntry as ChangelogEntry);
  }

  if (entries.length === 0) {
    entries.push({
      version: 'Current',
      date: new Date().toLocaleDateString(),
      title: filename.replace('.md', ''),
      contentHtml: parseMarkdown(sanitizeChangelogContent(content))
    });
  }

  return entries;
}

function parseMarkdown(markdown: string): string {
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
