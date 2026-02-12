export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  contentHtml: string;
  isPrerelease?: boolean;
  commits?: CommitInfo[];
}
