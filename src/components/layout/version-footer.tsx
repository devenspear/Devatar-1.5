"use client";

import packageJson from "../../../package.json";

const APP_VERSION = packageJson.version;
const GITHUB_URL = packageJson.repository?.url?.replace(".git", "") || "https://github.com/devenspear/devatar";

export function VersionFooter() {
  return (
    <footer className="border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm flex-shrink-0">
      <div className="px-6 py-3 flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-300 transition-colors"
          >
            Devatar v{APP_VERSION}
          </a>
          <span className="text-gray-700">|</span>
          <span>AI Avatar Video Generation</span>
        </div>
        <div className="flex items-center gap-2">
          <span>&copy; {new Date().getFullYear()} Deven Spear</span>
        </div>
      </div>
    </footer>
  );
}
