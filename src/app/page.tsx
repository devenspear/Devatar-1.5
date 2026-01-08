import Link from "next/link";
import { Video, FolderOpen, Settings, Activity } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Devatar</h1>
          <span className="text-sm text-muted-foreground">v0.1.0</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">AI Avatar Video Studio</h2>
          <p className="text-muted-foreground">
            Create cinematic AI avatar videos with natural lip-sync and movement.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link
            href="/projects"
            className="flex flex-col items-center justify-center p-6 bg-card rounded-lg border border-border hover:border-primary transition-colors"
          >
            <FolderOpen className="w-8 h-8 mb-2 text-primary" />
            <span className="font-medium">Projects</span>
            <span className="text-sm text-muted-foreground">Manage videos</span>
          </Link>

          <Link
            href="/projects/new"
            className="flex flex-col items-center justify-center p-6 bg-card rounded-lg border border-border hover:border-primary transition-colors"
          >
            <Video className="w-8 h-8 mb-2 text-primary" />
            <span className="font-medium">New Project</span>
            <span className="text-sm text-muted-foreground">Start creating</span>
          </Link>

          <Link
            href="/settings"
            className="flex flex-col items-center justify-center p-6 bg-card rounded-lg border border-border hover:border-primary transition-colors"
          >
            <Settings className="w-8 h-8 mb-2 text-primary" />
            <span className="font-medium">Settings</span>
            <span className="text-sm text-muted-foreground">API & Voice</span>
          </Link>

          <Link
            href="/logs"
            className="flex flex-col items-center justify-center p-6 bg-card rounded-lg border border-border hover:border-primary transition-colors"
          >
            <Activity className="w-8 h-8 mb-2 text-primary" />
            <span className="font-medium">Logs</span>
            <span className="text-sm text-muted-foreground">View activity</span>
          </Link>
        </div>

        {/* Getting Started */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Getting Started</h3>
          <ol className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm">
                1
              </span>
              <span>Configure your ElevenLabs voice clone ID in Settings</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm">
                2
              </span>
              <span>Create a new project and add your first scene</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm">
                3
              </span>
              <span>
                Describe the scene environment, wardrobe, movement, and dialogue
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm">
                4
              </span>
              <span>Click Generate and wait for your AI avatar video</span>
            </li>
          </ol>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Deven Spear</span>
          <a
            href="https://github.com/devenspear/devatar"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            v0.1.0
          </a>
        </div>
      </footer>
    </div>
  );
}
