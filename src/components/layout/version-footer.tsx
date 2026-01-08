"use client";

import packageJson from "../../../package.json";

const APP_VERSION = packageJson.version;
const GITHUB_URL = packageJson.repository?.url?.replace(".git", "") || "https://github.com/devenspear/devatar";

export function VersionFooter() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Devatar v{APP_VERSION}
          </a>
          <span className="text-border">|</span>
          <span>AI Avatar Video Generation</span>
        </div>
        <div className="flex items-center gap-2">
          <span>&copy; {new Date().getFullYear()} Deven Spear</span>
        </div>
      </div>
    </footer>
  );
}
