import React from 'react';
import { Sparkles, LogOut, LogIn, Flame, Award, Sprout, MessageSquare, Clock, Target } from 'lucide-react';
import { type UserStats, type User } from '../types';

interface GamifiedHeaderProps {
  stats: UserStats;
  user: User | null;
  needsAuth: boolean;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  activeTab: 'dashboard' | 'mood' | 'focus' | 'leaderboard' | 'loadout';
  setActiveTab: (tab: 'dashboard' | 'mood' | 'focus' | 'leaderboard' | 'loadout') => void;
}

export default function GamifiedHeader({
  stats,
  user,
  needsAuth,
  onLogin,
  onLogout,
  isLoggingIn,
  activeTab,
  setActiveTab,
}: GamifiedHeaderProps) {
  // Calculate level progress: every 1000 XP is 1 level up
  const xpWithinLevel = stats.xp % 1000;
  const xpNeededForNextLevel = 1000;
  const progressPercent = Math.min(100, Math.floor((xpWithinLevel / xpNeededForNextLevel) * 100));

  return (
    <header className="bg-white border-b border-[#F0EEFF] sticky top-0 z-40 shadow-sm w-full">
      {/* Row 1: Logo left | XP + Level + Streak + Avatar right (Height: 80px / h-20) */}
      <div className="h-20 px-4 md:px-6 flex items-center justify-between w-full border-b border-[#F4F2FF]">
        {/* Left: Brand Logo: SNYGG with Custom Orbit */}
        <div className="flex items-center flex-shrink-0">
          <div className="relative group">
            {/* Subtle outer glow effect in electric blue */}
            <div className="absolute -inset-2 bg-[#3B82F6]/10 rounded-xl blur-md group-hover:bg-[#3B82F6]/20 transition-all duration-300" />
            
            <div className="relative flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <h1 
                className="text-[28px] md:text-[38px] font-orbitron font-black tracking-widest bg-gradient-to-r from-[#0F0A2E] via-[#6D28D9] to-[#3B82F6] bg-clip-text text-transparent leading-none flex items-center gap-1"
                style={{ filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.4))' }}
              >
                SNYGG <span style={{ WebkitTextFillColor: 'initial', WebkitBackgroundClip: 'unset' }}>🐾</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Right: XP bar + Level + Daily Streak counter + user avatar/sign in - ALL in one straight line */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          {/* Level and XP progress bar (fully visible and polished) */}
          <div className="flex items-center gap-2.5 bg-[#F8F7FF] border border-[#F0EEFF] px-3 py-1.5 rounded-xl shadow-xs">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[8px] font-black uppercase text-[#7C3AED] leading-none">LVL</span>
              <span className="text-sm font-black text-[#1E1B2E] leading-none mt-0.5">{stats.level}</span>
            </div>
            <div className="w-16 md:w-28 h-2.5 bg-[#EBE8FF] rounded-full overflow-hidden p-[1px] shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-[#7C3AED] via-[#5B21B6] to-[#3B82F6] rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-[#7C3AED] whitespace-nowrap hidden xs:inline">
              {xpWithinLevel} / {xpNeededForNextLevel} XP
            </span>
            <span className="text-[10px] font-black text-[#7C3AED] whitespace-nowrap xs:hidden">
              {xpWithinLevel} XP
            </span>
          </div>

          {/* Daily Streak counter */}
          <div className="flex items-center gap-1.5 bg-[#FFF0EC] border border-[#FFE0D9] px-3 py-1.5 rounded-xl shadow-xs" title="Daily Streak">
            <Flame className="w-4 h-4 text-[#F59E8B] animate-pulse" />
            <span className="text-xs font-black text-[#1E1B2E] whitespace-nowrap">
              {stats.streak} DAYS
            </span>
          </div>

          {/* Focus Efficiency */}
          <div className="flex items-center gap-1.5 bg-[#F5F3FF] border border-[#E9E3FF] px-3 py-1.5 rounded-xl shadow-xs" title="Focus Efficiency">
            <Award className="w-4 h-4 text-[#7C3AED]" />
            <span className="text-xs font-black text-[#1E1B2E] whitespace-nowrap">
              <span className="hidden xs:inline">{stats.focusScore}% FOCUS EFFICIENCY</span>
              <span className="inline xs:hidden">{stats.focusScore}% EFF</span>
            </span>
          </div>

          {/* User profile / Login */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-1.5 bg-white border border-[#F0EEFF] rounded-xl p-1 shadow-sm">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-lg border border-[#F0EEFF] object-cover"
                    referrerPolicy="no-referrer"
                    title={`${user.displayName} (${user.email})`}
                  />
                ) : (
                  <div className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center font-black text-sm text-white" title={user.email || 'User'}>
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={onLogout}
                  className="text-[#1E1B2E]/50 hover:text-red-500 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="px-3.5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {isLoggingIn ? 'ENTERING...' : 'ENTER'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Full width tab bar with 5 tabs evenly spaced */}
      <div className="w-full bg-[#FCFBFF] px-2 md:px-6">
        <nav className="grid grid-cols-5 w-full max-w-7xl mx-auto">
          {[
            { id: 'dashboard', label: 'Command Deck', icon: Sprout },
            { id: 'mood', label: 'Neural Journal', icon: MessageSquare },
            { id: 'focus', label: 'Focus Arena', icon: Clock },
            { id: 'leaderboard', label: 'High Scores', icon: Award },
            { id: 'loadout', label: 'Mission Loadout', icon: Target },
          ].map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 py-3 md:py-4 px-1 text-center transition-all cursor-pointer whitespace-nowrap border-b-[3px] text-sm ${
                  isActive
                    ? 'border-[#7C3AED] text-[#7C3AED] font-black bg-[#7C3AED]/[0.02]'
                    : 'border-transparent text-[#1E1B2E]/60 hover:text-[#7C3AED] hover:bg-[#7C3AED]/[0.01] font-semibold'
                }`}
                style={{ fontSize: '14px' }}
                id={`tab-${tab.id}`}
              >
                <TabIcon className={`w-4 h-4 md:w-[18px] md:h-[18px] flex-shrink-0 ${isActive ? 'text-[#7C3AED]' : 'text-current'}`} />
                <span className="hidden md:inline">{tab.label}</span>
                <span className="inline md:hidden text-[11px] sm:text-[13px]">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
