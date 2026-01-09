"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  Activity,
  Video,
  PanelLeftClose,
  PanelLeft,
  MousePointer2,
  User,
} from "lucide-react";
import { useSidebar, SidebarMode } from "@/contexts/sidebar-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: FolderOpen },
  { name: "Assets", href: "/assets", icon: User },
  { name: "Logs", href: "/logs", icon: Activity },
  { name: "Settings", href: "/settings", icon: Settings },
];

// Devatar Logo component
function DevatarLogo() {
  return (
    <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25 overflow-hidden">
      {/* Video frame effect */}
      <div className="absolute inset-1 rounded-lg border-2 border-white/20" />
      {/* Center icon */}
      <Video className="h-5 w-5 text-white relative z-10" />
      {/* Animated pulse */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/20 animate-pulse" />
    </div>
  );
}

// Mode toggle button component
function ModeToggle() {
  const { mode, setMode } = useSidebar();

  const modes: { value: SidebarMode; icon: typeof PanelLeft; label: string }[] = [
    { value: "wide", icon: PanelLeft, label: "Wide" },
    { value: "narrow", icon: PanelLeftClose, label: "Narrow" },
    { value: "auto", icon: MousePointer2, label: "Auto" },
  ];

  const currentIndex = modes.findIndex((m) => m.value === mode);
  const nextMode = modes[(currentIndex + 1) % modes.length];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setMode(nextMode.value)}
            className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors text-gray-400 hover:text-gray-200"
          >
            {mode === "wide" && <PanelLeft className="h-4 w-4" />}
            {mode === "narrow" && <PanelLeftClose className="h-4 w-4" />}
            {mode === "auto" && <MousePointer2 className="h-4 w-4" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex flex-col">
          <span className="font-medium">
            {mode === "wide" && "Wide mode"}
            {mode === "narrow" && "Narrow mode"}
            {mode === "auto" && "Auto mode"}
          </span>
          <span className="text-xs text-gray-400">
            Click for {nextMode.label.toLowerCase()}
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { mode, effectiveWidth, setIsExpanded } = useSidebar();

  const isCollapsed = effectiveWidth === "narrow";

  // Handle mouse enter/leave for auto mode
  const handleMouseEnter = () => {
    if (mode === "auto") {
      setIsExpanded(true);
    }
  };

  const handleMouseLeave = () => {
    if (mode === "auto") {
      setIsExpanded(false);
    }
  };

  return (
    <motion.div
      className={cn(
        "flex h-full flex-shrink-0 flex-col border-r border-gray-800 overflow-hidden bg-gray-900"
      )}
      initial={false}
      animate={{
        width: isCollapsed ? 64 : 240,
      }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-gray-800",
          isCollapsed ? "px-3 justify-center" : "px-4"
        )}
      >
        <Link href="/" className="flex items-center gap-3 group">
          <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.2 }}>
            <DevatarLogo />
          </motion.div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="font-bold text-lg tracking-tight text-gray-100 group-hover:text-white transition-colors whitespace-nowrap overflow-hidden"
              >
                Devatar
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          "flex-1 space-y-1 py-4",
          isCollapsed ? "px-2" : "px-3"
        )}
      >
        <TooltipProvider delayDuration={0}>
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            const link = (
              <Link key={item.name} href={item.href} className="block">
                <motion.div
                  className={cn(
                    "flex items-center rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                      : "text-gray-400 hover:bg-gray-800 hover:text-gray-200",
                    isCollapsed ? "p-2.5 justify-center" : "gap-3 px-3 py-2.5"
                  )}
                  whileHover={{ x: isActive || isCollapsed ? 0 : 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? "text-blue-400" : ""
                    )}
                  />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.name}</TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}
        </TooltipProvider>
      </nav>

      {/* Mode toggle at bottom */}
      <div
        className={cn(
          "border-t border-gray-800",
          isCollapsed ? "p-2 flex justify-center" : "p-3"
        )}
      >
        <ModeToggle />
      </div>
    </motion.div>
  );
}
