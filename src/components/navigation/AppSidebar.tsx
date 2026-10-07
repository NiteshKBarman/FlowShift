import React from 'react';
import { useEditorStore, type AppViewMode } from '../../store/editor-store';
import {
  Columns,
  FileCode,
  Layers,
  Play,
  GraduationCap,
  ArrowRightLeft,
  RotateCw,
  Terminal,
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AppSidebarProps {
  onOpenProgressModal?: () => void;
  onOpenSamplesMenu?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  onOpenProgressModal,
  onOpenSamplesMenu,
}) => {
  const {
    activeView,
    setActiveView,
    sidebarCollapsed,
    toggleSidebar,
    terminalOpen,
    toggleTerminal,
    programIR,
  } = useEditorStore();

  const isRecursionActive = programIR?.functions.some((f) => f.recursion?.isRecursive);

  const workspaceNavItems: Array<{
    id: AppViewMode;
    label: string;
    icon: React.FC<{ className?: string }>;
    accentClass: string;
    badge?: string;
  }> = [
    {
      id: 'split',
      label: 'Dual Studio',
      icon: Columns,
      accentClass: 'text-cyan-400 group-hover:text-cyan-300',
    },
    {
      id: 'code',
      label: 'Code Editor',
      icon: FileCode,
      accentClass: 'text-sky-400 group-hover:text-sky-300',
    },
    {
      id: 'flowchart',
      label: 'Flowchart',
      icon: Layers,
      accentClass: 'text-teal-400 group-hover:text-teal-300',
    },
    {
      id: 'execute',
      label: 'Execute Mode',
      icon: Play,
      accentClass: 'text-emerald-400 group-hover:text-emerald-300',
      badge: 'Live',
    },
    {
      id: 'practice',
      label: 'Practice / Quiz',
      icon: GraduationCap,
      accentClass: 'text-indigo-400 group-hover:text-indigo-300',
    },
  ];

  const handleRecursionClick = () => {
    if (activeView !== 'flowchart' && activeView !== 'split') {
      setActiveView('flowchart');
    }
  };

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-slate-800/90 bg-slate-950/90 backdrop-blur-md select-none transition-all duration-200 z-20 shrink-0 ${
        sidebarCollapsed ? 'w-14' : 'w-52'
      }`}
    >
      {/* Scrollable nav items */}
      <div className="flex-1 py-3 px-2 flex flex-col gap-4 overflow-y-auto overflow-x-hidden">
        {/* Section: WORKSPACE */}
        <div>
          {!sidebarCollapsed ? (
            <div className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Workspace
            </div>
          ) : (
            <div className="w-full text-center text-[9px] font-bold text-slate-400 mb-1">
              WS
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            {workspaceNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-slate-900 text-white border border-slate-700/80 shadow-sm shadow-cyan-950/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                  }`}
                >
                  {/* Active vertical marker */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-cyan-400 rounded-r-full" />
                  )}

                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? item.accentClass : 'text-slate-400'
                    }`}
                  />

                  {!sidebarCollapsed && (
                    <span className="truncate flex-1 text-left">{item.label}</span>
                  )}

                  {!sidebarCollapsed && item.badge && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section: TOOLS */}
        <div>
          {!sidebarCollapsed ? (
            <div className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Tools
            </div>
          ) : (
            <div className="w-full text-center text-[9px] font-bold text-slate-400 mb-1">
              TL
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            {/* Convert / Translate */}
            <button
              onClick={() => setActiveView('translate')}
              title={sidebarCollapsed ? 'Language Conversion' : undefined}
              className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                activeView === 'translate'
                  ? 'bg-slate-900 text-white border border-slate-700/80 shadow-sm shadow-cyan-950/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              {activeView === 'translate' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-cyan-400 rounded-r-full" />
              )}
              <ArrowRightLeft className="w-4 h-4 text-cyan-400 shrink-0 transition-transform group-hover:scale-110" />
              {!sidebarCollapsed && <span className="truncate flex-1 text-left">Convert</span>}
            </button>

            {/* Recursion Analysis */}
            <button
              onClick={handleRecursionClick}
              title={sidebarCollapsed ? 'Recursion Analysis' : undefined}
              className="group relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent transition-all duration-150"
            >
              <RotateCw className="w-4 h-4 text-amber-400 shrink-0 transition-transform group-hover:rotate-45" />
              {!sidebarCollapsed && (
                <div className="flex items-center justify-between flex-1 truncate">
                  <span className="truncate text-left">Recursion</span>
                  {isRecursionActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                  )}
                </div>
              )}
            </button>

            {/* Terminal Drawer Toggle */}
            <button
              onClick={toggleTerminal}
              title={sidebarCollapsed ? 'Toggle Terminal Drawer' : undefined}
              className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                terminalOpen
                  ? 'bg-slate-900 text-cyan-300 border border-slate-800'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <Terminal className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 shrink-0 transition-transform group-hover:scale-110" />
              {!sidebarCollapsed && (
                <span className="truncate flex-1 text-left">Terminal</span>
              )}
            </button>
          </div>
        </div>

        {/* Section: LEARNING */}
        <div>
          {!sidebarCollapsed ? (
            <div className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Learning
            </div>
          ) : (
            <div className="w-full text-center text-[9px] font-bold text-slate-400 mb-1">
              LN
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            {/* Progress Dashboard */}
            <button
              onClick={() => {
                if (activeView !== 'practice') {
                  setActiveView('practice');
                }
                if (onOpenProgressModal) {
                  onOpenProgressModal();
                }
              }}
              title={sidebarCollapsed ? 'Practice Progress' : undefined}
              className="group relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent transition-all duration-150"
            >
              <BarChart3 className="w-4 h-4 text-indigo-400 shrink-0 transition-transform group-hover:scale-110" />
              {!sidebarCollapsed && <span className="truncate flex-1 text-left">Progress</span>}
            </button>

            {/* Samples / Examples */}
            <button
              onClick={onOpenSamplesMenu}
              title={sidebarCollapsed ? 'Educational Examples' : undefined}
              className="group relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent transition-all duration-150"
            >
              <BookOpen className="w-4 h-4 text-emerald-400 shrink-0 transition-transform group-hover:scale-110" />
              {!sidebarCollapsed && <span className="truncate flex-1 text-left">Examples</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Collapse / Expand Toggle Button at Bottom */}
      <div className="p-2 border-t border-slate-800/80 bg-slate-950/80">
        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="w-full py-2 px-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 text-xs font-medium flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-slate-800"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 text-slate-400" />
              <span className="text-[11px] font-mono text-slate-400">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
