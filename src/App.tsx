import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, MessageSquare, Mic, Swords, Target, Play, ShieldAlert, Award, AlertTriangle, X, Sprout, Leaf, Sun, Heart, Clock, LogIn } from 'lucide-react';
import { type Task, type UserStats, type MoodEntry, type Badge, type Challenge, type FriendRank, type User } from './types';
import GamifiedHeader from './components/GamifiedHeader';
import Dashboard from './components/Dashboard';
import MoodJournal from './components/MoodJournal';
import VoiceInput from './components/VoiceInput';
import FocusArena from './components/FocusArena';
import Leaderboard from './components/Leaderboard';
import TaskInput from './components/TaskInput';
import SnyxMascot from './components/SnyxMascot';
import { signInWithGoogle, logoutGoogle, getOrRefreshAccessToken, initGoogleAuthClient } from './lib/googleAuth';
import { audioSynth } from './lib/audio';
import LevelUpCelebration from './components/LevelUpCelebration';
import OAuthDisclaimerModal from './components/OAuthDisclaimerModal';

// Date helpers for dynamic local streak calculations
export function getLocalTodayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDaysDiff(date1Str: string, date2Str: string): number {
  const d1 = new Date(date1Str + 'T00:00:00');
  const d2 = new Date(date2Str + 'T00:00:00');
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// Bootstrap initial static data if localStorage is pristine
const INITIAL_FRIENDS: FriendRank[] = [
  { id: 'me', name: 'You (Gardener)', avatar: '', xp: 0, level: 1, streak: 0, isMe: true },
  { id: 'valk_44', name: 'Daisy_Farms', avatar: '', xp: 3450, level: 4, streak: 5 },
  { id: 'cypher_x', name: 'Sow&Reap', avatar: '', xp: 2150, level: 3, streak: 2 },
];

const INITIAL_BADGES: Badge[] = [
  { id: 'ignition', name: 'First Seed Sown', description: 'Plant your first seed task in Today\'s Garden.', iconName: 'Sprout', unlocked: false },
  { id: 'streak_3', name: 'Golden Watering Can', description: 'Maintain your garden with a 3+ day streak.', iconName: 'Sun', unlocked: false },
  { id: 'apex_focus', name: 'Master Gardener', description: 'Tend your crops for one quiet focus nook session.', iconName: 'Award', unlocked: false },
  { id: 'gmail_autonomous', name: 'Pigeon Postmaster', description: 'Dispatch your first carrier pigeon message via Ghibli mail.', iconName: 'Leaf', unlocked: false },
];

const INITIAL_CHALLENGES: Challenge[] = [
  { id: 'clear_sector', title: 'Bountiful Harvest', description: 'Sow and harvest 2 crop tasks to feed the village.', progress: 0, goal: 2, xpReward: 300, completed: false },
  { id: 'focus_pods', title: 'Cottage Solitude', description: 'Tend your crops for 1 full focus session.', progress: 0, goal: 1, xpReward: 200, completed: false },
  { id: 'neural_cal', title: 'Garden Reflections', description: 'Pour your thoughts into your Mood Diary.', progress: 0, goal: 1, xpReward: 150, completed: false },
];

export default function App() {
  // Navigation Tabs: 'dashboard' | 'mood' | 'focus' | 'leaderboard' | 'loadout'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'mood' | 'focus' | 'leaderboard' | 'loadout'>('dashboard');

  // Core App states
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('snygg_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('snygg_stats');
    return saved ? JSON.parse(saved) : {
      xp: 0,
      level: 1,
      streak: 0,
      tasksCompleted: 0,
      focusScore: 0,
    };
  });
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>(() => {
    const saved = localStorage.getItem('snygg_moods');
    return saved ? JSON.parse(saved) : [];
  });
  const [friends, setFriends] = useState<FriendRank[]>(() => {
    const saved = localStorage.getItem('snygg_friends');
    return saved ? JSON.parse(saved) : INITIAL_FRIENDS;
  });
  const [myJoinCode] = useState<string>(() => {
    const saved = localStorage.getItem('snygg_my_join_code');
    if (saved) return saved;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem('snygg_my_join_code', code);
    return code;
  });

  const handleAddFriend = (friendCode: string) => {
    const names = [
      'Ghibli_Girl 🧺',
      'Sprout_Pilot 🛫',
      'FernFinder 🌿',
      'CozyCabbage 🥬',
      'Acorn_Aki 🐿️',
      'BuddingBuddy 🌸',
      'Garden_Guru 🥕',
      'SowSmart 🌾'
    ];
    
    const alreadyExists = friends.some(f => f.id === friendCode);
    if (alreadyExists) {
      alert('This pilot friend has already joined your greenhouse lobby!');
      return false;
    }

    const randomName = names[Math.floor(Math.random() * names.length)];
    const newFriend: FriendRank = {
      id: friendCode,
      name: randomName,
      avatar: '',
      xp: Math.floor(1500 + Math.random() * 3000),
      level: Math.floor(2 + Math.random() * 3),
      streak: Math.floor(1 + Math.random() * 8),
    };

    const updatedFriends = [...friends, newFriend];
    setFriends(updatedFriends);
    alert(`Success! Pilot ${randomName} has joined your garden! 🌻`);
    return true;
  };

  useEffect(() => {
    localStorage.setItem('snygg_friends', JSON.stringify(friends));
  }, [friends]);

  const [badges, setBadges] = useState<Badge[]>(() => {
    const saved = localStorage.getItem('snygg_badges');
    return saved ? JSON.parse(saved) : INITIAL_BADGES;
  });
  const [challenges, setChallenges] = useState<Challenge[]>(() => {
    const saved = localStorage.getItem('snygg_challenges');
    return saved ? JSON.parse(saved) : INITIAL_CHALLENGES;
  });

  // Authentication & token state
  const [gardenerName, setGardenerName] = useState<string>(() => {
    return localStorage.getItem('snygg_gardener_name') || '';
  });
  const [gardenerNameInput, setGardenerNameInput] = useState<string>('');

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('snygg_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    const savedName = localStorage.getItem('snygg_gardener_name');
    if (savedName) {
      return {
        uid: 'local_gardener',
        displayName: savedName,
        email: 'guest@snygg.garden',
        photoURL: '',
      } as any;
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('snygg_access_token') || null;
  });
  const [needsAuth, setNeedsAuth] = useState<boolean>(() => {
    return !localStorage.getItem('snygg_gardener_name');
  });
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showOAuthDisclaimer, setShowOAuthDisclaimer] = useState<boolean>(false);

  // Gemini Nudges
  const [nudgeMsg, setNudgeMsg] = useState<string>('');
  const [showNudge, setShowNudge] = useState<boolean>(false);

  // Level Up Celebration state
  const [levelUpCelebration, setLevelUpCelebration] = useState<{ isOpen: boolean; level: number }>({
    isOpen: false,
    level: 1,
  });

  const [focusSessionsCompleted, setFocusSessionsCompleted] = useState<number>(() => {
    return parseInt(localStorage.getItem('snygg_completed_cycles') || '0', 10);
  });

  // Real-time focus efficiency dynamic calculation
  useEffect(() => {
    const lastMood = moodHistory[0]?.detectedMood;
    let moodScore = 7; // neutral/default
    if (lastMood === 'motivated') {
      moodScore = 10;
    } else if (lastMood === 'stressed' || lastMood === 'anxious') {
      moodScore = 4;
    } else if (lastMood === 'tired') {
      moodScore = 2;
    }

    let focusEfficiency = 0;
    if (focusSessionsCompleted > 0 || stats.tasksCompleted > 0) {
      focusEfficiency = Math.round(
        (
          (focusSessionsCompleted * 40) +
          (stats.tasksCompleted * 30) +
          (stats.streak * 20) +
          (moodScore * 10)
        ) / Math.max(1, focusSessionsCompleted + stats.tasksCompleted)
      );
      focusEfficiency = Math.min(100, focusEfficiency);
    }

    // Always store calculated value in localStorage as 'snygg_focus_efficiency'
    localStorage.setItem('snygg_focus_efficiency', focusEfficiency.toString());

    // Only update if it actually changed to prevent infinite loop
    if (stats.focusScore !== focusEfficiency) {
      setStats(prev => {
        const updated = { ...prev, focusScore: focusEfficiency };
        localStorage.setItem('snygg_stats', JSON.stringify(updated));
        return updated;
      });
    }
  }, [focusSessionsCompleted, stats.tasksCompleted, stats.streak, moodHistory]);

  // 1. Initial Load & Auth States
  useEffect(() => {
    const todayStr = getLocalTodayStr();
    const lastFocus = localStorage.getItem('last_focus_date');
    const savedStatsStr = localStorage.getItem('snygg_stats');

    let baseStats: UserStats = savedStatsStr ? JSON.parse(savedStatsStr) : {
      xp: 0,
      level: 1,
      streak: 0,
      tasksCompleted: 0,
      focusScore: 0,
    };

    let currentStreak = baseStats.streak;
    if (lastFocus) {
      const diff = getDaysDiff(lastFocus, todayStr);
      if (diff >= 2) {
        currentStreak = 0; // reset streak to 0
      }
    } else {
      currentStreak = 0; // reset streak to 0
    }

    // Level formula: level = Math.floor(xp / 1000) + 1
    const currentLevel = Math.floor(baseStats.xp / 1000) + 1;
    const updated = { ...baseStats, streak: currentStreak, level: currentLevel };
    setStats(updated);
    localStorage.setItem('snygg_stats', JSON.stringify(updated));
    localStorage.setItem('snygg_last_active_date', todayStr);

    // Initialize OAuth GSI client
    const fetchClientIdAndInit = async () => {
      try {
        const res = await fetch('/api/auth/google-client-id');
        const data = await res.json();
        initGoogleAuthClient(data.clientId);
      } catch (err) {
        initGoogleAuthClient('505192974168-si8if6ir9mjd3bqdrrpbolv96qftjn1k.apps.googleusercontent.com');
      }
    };
    fetchClientIdAndInit();

    // Check if we have a valid cached token or need to refresh
    const checkAndRestoreSession = async () => {
      const validToken = await getOrRefreshAccessToken();
      if (validToken) {
        setToken(validToken);
        const savedUser = localStorage.getItem('snygg_user');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            if (parsedUser.displayName) {
              setGardenerName(parsedUser.displayName);
              localStorage.setItem('snygg_gardener_name', parsedUser.displayName);
            }
            setNeedsAuth(false);
          } catch (e) {
            // fallback
            setNeedsAuth(true);
          }
        } else {
          setNeedsAuth(true);
        }
      } else {
        // If no valid Google session but we have a local gardener name, let them stay as guest
        if (localStorage.getItem('snygg_gardener_name')) {
          setNeedsAuth(false);
        } else {
          setNeedsAuth(true);
        }
      }
    };
    checkAndRestoreSession();
  }, []);

  // Google Identity Services (GSI) One Tap + Button Initialization
  useEffect(() => {
    if (!needsAuth) return;

    let clientId = '505192974168-si8if6ir9mjd3bqdrrpbolv96qftjn1k.apps.googleusercontent.com';

    const handleCredentialResponse = (response: any) => {
      try {
        // Decode the JWT token
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        const userData = {
          name: payload.name,
          displayName: payload.name,
          email: payload.email,
          picture: payload.picture,
          photoURL: payload.picture,
          uid: payload.sub
        };
        localStorage.setItem('snygg_user', JSON.stringify(userData));
        localStorage.setItem('snygg_gardener_name', payload.name);
        window.location.reload();
      } catch (err) {
        console.error('Failed to parse credential response:', err);
      }
    };

    const initGsi = async () => {
      try {
        const res = await fetch('/api/auth/google-client-id');
        const data = await res.json();
        if (data.clientId) {
          clientId = data.clientId;
        }
      } catch (err) {
        console.error('Failed to fetch client ID, using fallback:', err);
      }

      const checkGoogleLoaded = setInterval(() => {
        const google = (window as any).google;
        if (google?.accounts?.id) {
          clearInterval(checkGoogleLoaded);
          try {
            google.accounts.id.initialize({
              client_id: clientId,
              callback: handleCredentialResponse,
              auto_select: false,
              cancel_on_tap_outside: true
            });

            google.accounts.id.renderButton(
              document.getElementById('google-signin-btn'),
              { 
                theme: 'outline',
                size: 'large',
                width: 300,
                text: 'continue_with'
              }
            );

            google.accounts.id.prompt();
          } catch (e) {
            console.error('Failed to initialize or prompt GSI:', e);
          }
        }
      }, 100);

      setTimeout(() => clearInterval(checkGoogleLoaded), 10000);
    };

    initGsi();
  }, [needsAuth]);

  const setMoodsData = (moods: MoodEntry[]) => {
    setMoodHistory(moods);
    localStorage.setItem('snygg_moods', JSON.stringify(moods));
  };

  // 2. Fetch context aware smart reminders from server via Gemini
  const triggerSmartNudge = async (currentTasks: Task[]) => {
    try {
      const hr = new Date().getHours();
      const timeOfDay = hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : 'evening';

      const response = await fetch('/api/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeOfDay, tasks: currentTasks }),
      });
      const data = await response.json();
      if (data.nudgeText) {
        setNudgeMsg(data.nudgeText);
        setShowNudge(true);
      }
    } catch (err) {
      console.log('Status: Utilizing local backup nudge triggers.');
    }
  };

  // Trigger Nudge logic when tasks update
  useEffect(() => {
    if (tasks.length > 0) {
      triggerSmartNudge(tasks);
    }
  }, [tasks.length]);

  // Sync state modifications to localStorage
  const updateTasksState = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem('snygg_tasks', JSON.stringify(newTasks));
  };

  // Auth Operations
  const handleGoogleLogin = async () => {
    setShowOAuthDisclaimer(true);
  };

  const proceedGoogleLogin = async () => {
    setShowOAuthDisclaimer(false);
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await signInWithGoogle();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        if (result.user.displayName) {
          localStorage.setItem('snygg_gardener_name', result.user.displayName);
          setGardenerName(result.user.displayName);
        }
        setNeedsAuth(false);
        audioSynth.playMilestone();
        return result;
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setAuthError(err?.message || 'Google Sign-In failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    logoutGoogle();
    localStorage.removeItem('snygg_gardener_name');
    setGardenerName('');
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
  };

  // Gamification: Earn XP, handle leveling system
  const handleEarnXP = (amount: number) => {
    // Notify Snyx mascot to cheer and show speech bubble!
    window.dispatchEvent(new CustomEvent('snyx-xp-earned', { detail: { amount } }));

    setStats(prev => {
      const nextXP = prev.xp + amount;
      const currentLevel = Math.floor(prev.xp / 1000) + 1;
      const nextLevel = Math.floor(nextXP / 1000) + 1;

      if (nextLevel > currentLevel) {
        audioSynth.playMilestone();
        setLevelUpCelebration({ isOpen: true, level: nextLevel });
      }

      const updated = { ...prev, xp: nextXP, level: nextLevel };
      localStorage.setItem('snygg_stats', JSON.stringify(updated));

      // Sync Seeds rank to friends list
      setFriends(fList =>
        fList.map(f => (f.isMe ? { ...f, xp: f.xp + amount, level: nextLevel } : f))
      );

      return updated;
    });

    // Check Badges
    setBadges(prevBadges => {
      const updated = prevBadges.map(b => {
        if (b.id === 'streak_3' && stats.streak >= 3) {
          return { ...b, unlocked: true, unlockedAt: new Date().toISOString() };
        }
        return b;
      });
      localStorage.setItem('snygg_badges', JSON.stringify(updated));
      return updated;
    });
  };

  // Focus completed action that updates the daily focus streak, XP, and score dynamically in a single clean update
  const handleFocusComplete = () => {
    // 1. Notify Snyx mascot
    window.dispatchEvent(new CustomEvent('snyx-xp-earned', { detail: { amount: 250 } }));
    
    // 2. Update stats state in one single batch to prevent race conditions or duplicate calculations
    setStats(prev => {
      // XP update
      const nextXP = prev.xp + 250;
      const currentLevel = Math.floor(prev.xp / 1000) + 1;
      const nextLevel = Math.floor(nextXP / 1000) + 1;
      
      if (nextLevel > currentLevel) {
        audioSynth.playMilestone();
        setLevelUpCelebration({ isOpen: true, level: nextLevel });
      }
      
      // Streak update
      const todayStr = getLocalTodayStr();
      const lastFocus = localStorage.getItem('last_focus_date');
      
      let nextStreak = prev.streak;
      if (!lastFocus) {
        nextStreak = 1;
      } else {
        const diff = getDaysDiff(lastFocus, todayStr);
        if (diff === 1) {
          nextStreak = prev.streak + 1;
        } else if (diff === 0) {
          // Keep current streak
        } else if (diff >= 2) {
          nextStreak = 1;
        }
      }
      
      localStorage.setItem('last_focus_date', todayStr);
      
      const updated = {
        ...prev,
        xp: nextXP,
        level: nextLevel,
        streak: nextStreak,
      };
      
      localStorage.setItem('snygg_stats', JSON.stringify(updated));
      
      // Sync Seeds rank to friends list
      setFriends(fList =>
        fList.map(f => (f.isMe ? { ...f, xp: f.xp + 250, level: nextLevel, streak: nextStreak } : f))
      );
      
      return updated;
    });

    setFocusSessionsCompleted(prev => {
      const next = prev + 1;
      localStorage.setItem('snygg_completed_cycles', next.toString());
      return next;
    });

    // Check Badges
    setBadges(prevBadges => {
      const updated = prevBadges.map(b => {
        if (b.id === 'streak_3' && stats.streak >= 3) {
          return { ...b, unlocked: true, unlockedAt: new Date().toISOString() };
        }
        return b;
      });
      localStorage.setItem('snygg_badges', JSON.stringify(updated));
      return updated;
    });
  };

  // Mission Actions
  const handleAddTask = (task: Task) => {
    const updated = [task, ...tasks];
    updateTasksState(updated);

    // Unlock "First Seed Sown" Badge
    setBadges(prev => {
      const nextBadges = prev.map(b => b.id === 'ignition' ? { ...b, unlocked: true, unlockedAt: new Date().toISOString() } : b);
      localStorage.setItem('snygg_badges', JSON.stringify(nextBadges));
      return nextBadges;
    });

    handleEarnXP(50); // XP for planting crop
  };

  const handleUpdateTask = (updatedTask: Task) => {
    const updated = tasks.map(t => (t.id === updatedTask.id ? updatedTask : t));
    updateTasksState(updated);

    // Challenge check: "Bountiful Harvest"
    if (updatedTask.completed) {
      setChallenges(prev => {
        const nextChallenges = prev.map(c => {
          if (c.id === 'clear_sector' && !c.completed) {
            const nextProgress = c.progress + 1;
            return { ...c, progress: nextProgress };
          }
          return c;
        });
        localStorage.setItem('snygg_challenges', JSON.stringify(nextChallenges));
        return nextChallenges;
      });

      // Update Focus Score (calculated reactively from tasksCompleted)
      setStats(prev => {
        const updatedStats = { ...prev, tasksCompleted: prev.tasksCompleted + 1 };
        localStorage.setItem('snygg_stats', JSON.stringify(updatedStats));
        return updatedStats;
      });
    }

    // Check Pigeon Action Badge
    if (updatedTask.draftEmail?.sent) {
      setBadges(prev => {
        const nextBadges = prev.map(b => b.id === 'gmail_autonomous' ? { ...b, unlocked: true, unlockedAt: new Date().toISOString() } : b);
        localStorage.setItem('snygg_badges', JSON.stringify(nextBadges));
        return nextBadges;
      });
    }
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    updateTasksState(updated);
  };

  const handleRescheduleMissions = (updatedTasks: Task[]) => {
    updateTasksState(updatedTasks);
  };

  const handleAddVoiceTask = async (taskName: string, isHard: boolean, hours: number) => {
    const todayStr = '2026-06-25';
    let riskScore = 60;
    let riskLevel: 'red' | 'amber' | 'green' = 'amber';

    try {
      const response = await fetch('/api/calculate-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: taskName, deadline: todayStr, hoursNeeded: hours, progress: 0 }),
      });
      const data = await response.json();
      if (data.riskLevel) {
        riskScore = data.riskScore;
        riskLevel = data.riskLevel;
      }
    } catch (err) {
      console.log('Status: Voice task risk calculation fallback active.');
    }

    const newTask: Task = {
      id: Math.random().toString(36).substring(7),
      name: taskName,
      deadline: todayStr,
      hoursNeeded: hours,
      hoursLeft: hours,
      progress: 0,
      riskScore,
      riskLevel,
      durationMinutes: isHard ? 50 : 25,
      isHard,
      completed: false,
    };
    handleAddTask(newTask);
  };

  const handleClaimChallenge = (id: string, xpReward: number) => {
    setChallenges(prev => {
      const next = prev.map(c => (c.id === id ? { ...c, completed: true } : c));
      localStorage.setItem('snygg_challenges', JSON.stringify(next));
      return next;
    });
    handleEarnXP(xpReward);
  };

  const handleFocusIncrement = () => {
    // 1. Increment completed focus sessions count
    setFocusSessionsCompleted(prev => {
      const next = prev + 1;
      localStorage.setItem('snygg_completed_cycles', next.toString());
      return next;
    });

    // 2. Update stats streak
    setStats(prev => {
      const todayStr = getLocalTodayStr();
      const lastFocus = localStorage.getItem('last_focus_date');
      
      let nextStreak = prev.streak;
      if (!lastFocus) {
        nextStreak = 1;
      } else {
        const diff = getDaysDiff(lastFocus, todayStr);
        if (diff === 1) {
          nextStreak = prev.streak + 1;
        } else if (diff === 0) {
          // Keep current streak
        } else if (diff >= 2) {
          nextStreak = 1;
        }
      }
      
      localStorage.setItem('last_focus_date', todayStr);

      const updated = {
        ...prev,
        streak: nextStreak,
      };

      localStorage.setItem('snygg_stats', JSON.stringify(updated));
      return updated;
    });

    setChallenges(prev => {
      const next = prev.map(c => {
        if (c.id === 'focus_pods' && !c.completed) {
          return { ...c, progress: Math.min(c.goal, c.progress + 1) };
        }
        return c;
      });
      localStorage.setItem('snygg_challenges', JSON.stringify(next));
      return next;
    });

    setBadges(prev => {
      const next = prev.map(b => b.id === 'apex_focus' ? { ...b, unlocked: true, unlockedAt: new Date().toISOString() } : b);
      localStorage.setItem('snygg_badges', JSON.stringify(next));
      return next;
    });
  };

  const handleAddMoodEntry = (entry: MoodEntry) => {
    const updated = [entry, ...moodHistory];
    setMoodsData(updated);

    // Challenge check: "Garden Reflections"
    setChallenges(prev => {
      const next = prev.map(c => {
        if (c.id === 'neural_cal' && !c.completed) {
          return { ...c, progress: Math.min(c.goal, c.progress + 1) };
        }
        return c;
      });
      localStorage.setItem('snygg_challenges', JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F7FF] text-[#1E1B2E] flex flex-col font-sans selection:bg-[#7C3AED]/20 selection:text-[#1E1B2E] pb-10">
      
      {needsAuth ? (
        <div className="min-h-screen bg-[#F8F7FF] text-[#1E1B2E] flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden">
          {/* Beautiful, warm Ghibli-themed backdrop blobs */}
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#EBE8FF]/40 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#FFEAE5]/40 blur-[120px] pointer-events-none" />
          
          <div className="max-w-md w-full bg-white border border-[#F0EEFF] rounded-[32px] p-8 md:p-10 space-y-6 shadow-[0_16px_50px_rgba(124,58,237,0.06)] text-center relative z-10">
            <div className="space-y-3">
              <span className="text-[10px] font-black tracking-[0.2em] text-[#7C3AED] uppercase bg-[#F4F2FF] px-3 py-1.5 rounded-full inline-block">
                Snygg Digital Greenhouse 🐾
              </span>
              <h1 className="text-5xl font-black tracking-widest text-[#1E1B2E] font-orbitron">
                SNYGG
              </h1>
              <p className="text-xs text-[#1E1B2E]/60 max-w-xs mx-auto leading-relaxed">
                Plant daily tasks, synchronize calendar schedules, and log reflections in your digital greenhouse.
              </p>
            </div>

            <div className="py-1">
              <div className="relative rounded-2xl bg-gradient-to-br from-[#F8F7FF] to-white border border-[#F0EEFF] p-5 space-y-3">
                <div className="flex justify-center">
                  <div className="w-14 h-14 bg-[#F4F2FF] border border-[#E0DBFA] rounded-2xl flex items-center justify-center text-2xl">
                    🌱
                  </div>
                </div>
                <p className="text-[11px] text-[#7C3AED] font-black uppercase tracking-wider">
                  Grow Your Digital Garden
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-center w-full">
                <div id="google-signin-btn" className="w-full flex justify-center min-h-[44px]"></div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <div className="h-[1px] bg-[#F0EEFF] flex-1" />
                <span className="text-[9px] font-bold text-[#1E1B2E]/40 uppercase tracking-wider">Or gardener nickname</span>
                <div className="h-[1px] bg-[#F0EEFF] flex-1" />
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (gardenerNameInput.trim()) {
                  const name = gardenerNameInput.trim();
                  localStorage.setItem('snygg_gardener_name', name);
                  setGardenerName(name);
                  
                  const localUser = {
                    uid: "local_gardener",
                    email: "guest@snygg.garden",
                    displayName: name,
                    photoURL: "",
                  };
                  localStorage.setItem('snygg_user', JSON.stringify(localUser));
                  
                  setUser(localUser as any);
                  setNeedsAuth(false);
                  audioSynth.playMilestone();
                }
              }} className="space-y-4 text-left">
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    value={gardenerNameInput}
                    onChange={(e) => setGardenerNameInput(e.target.value)}
                    placeholder="e.g. Samaira, Aero, GreenThumb"
                    className="w-full px-4 py-3.5 rounded-2xl border border-[#E0DBFA] bg-[#F8F7FF] text-sm text-[#1E1B2E] placeholder-[#1E1B2E]/40 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/10 transition-all font-medium text-center"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-5 py-3.5 bg-white border border-[#E0DBFA] text-[#7C3AED] hover:bg-[#F4F2FF] text-xs font-bold uppercase tracking-wider rounded-2xl transition-all cursor-pointer text-center"
                >
                  🌱 ENTER AS GUEST
                </button>
              </form>
            </div>

            {authError && (
              <div className="p-3.5 bg-red-50 border border-red-100 rounded-2xl text-left space-y-1 animate-fade-in">
                <h5 className="text-[10px] font-black text-red-600 uppercase tracking-wider">CONNECTION NOTICE</h5>
                <p className="text-[11px] text-red-500 font-medium leading-relaxed">
                  {authError === 'popup-blocked' 
                    ? 'Your browser blocked the login popup. Please try clicking "Sign In Via Redirect" instead!'
                    : authError === 'cancelled-popup'
                    ? 'Connection window closed or cancelled. Feel free to use the nickname guest route below!'
                    : authError}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Snyx Custom Header */}
          <GamifiedHeader
            stats={stats}
            user={user}
            needsAuth={needsAuth}
            onLogin={handleGoogleLogin}
            onLogout={handleGoogleLogout}
            isLoggingIn={isLoggingIn}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

      {/* Auth Error / Popup Blocked Warning Overlay */}
      {authError && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="max-w-md w-full bg-white border border-[#F0EEFF] rounded-3xl p-6 space-y-4 shadow-[0_12px_40px_rgba(124,58,237,0.12)] text-left">
            <div className="flex items-center gap-3 border-b border-[#F0EEFF] pb-3">
              <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-xl text-[#1E1B2E]">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#7C3AED]">SECURE SIGN-IN ADVICE 🐾</h4>
                <p className="text-[9px] text-[#1E1B2E]/50 font-bold uppercase tracking-wider">IFRAME DETECTED</p>
              </div>
            </div>

            <p className="text-xs text-[#1E1B2E]/80 leading-relaxed font-medium">
              Google Sign-In was blocked or interrupted because this app is running inside an <span className="text-[#7C3AED] font-bold">iframe preview</span> or your browser blocked the window. Open in a new tab or use our offline backup to garden locally!
            </p>

            <div className="space-y-3 pt-2">
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-4 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md"
              >
                🚀 OPEN IN NEW TAB (RECOMMENDED)
              </a>

              <button
                onClick={() => handleGoogleLogin()}
                className="w-full px-4 py-3 bg-white border border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                🔄 SIGN IN VIA REDIRECT (BYPASS POPUP BLOCK)
              </button>

              <div className="flex items-center gap-2 py-1">
                <div className="h-[1px] bg-[#F0EEFF] flex-1" />
                <span className="text-[9px] font-bold text-[#1E1B2E]/40 uppercase tracking-wider">Or bypass securely</span>
                <div className="h-[1px] bg-[#F0EEFF] flex-1" />
              </div>

              <button
                onClick={() => {
                  if (!gardenerName) {
                    const name = "Gardener Samaira";
                    localStorage.setItem('snygg_gardener_name', name);
                    setGardenerName(name);
                    setUser({
                      uid: "local_gardener",
                      displayName: name,
                      email: "guest@snygg.garden",
                      photoURL: ""
                    } as any);
                    setNeedsAuth(false);
                  }
                  setAuthError(null);
                }}
                className="w-full px-4 py-3 bg-[#F8F7FF] border border-[#F0EEFF] text-[#1E1B2E]/80 hover:border-[#7C3AED] hover:text-[#7C3AED] rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                🌱 ENTER AS GUEST GARDENER
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setAuthError(null)}
                className="text-[10px] text-[#1E1B2E]/50 hover:text-[#1E1B2E] uppercase font-bold"
              >
                Close Warning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Smart Nudge Alert popup */}
      {showNudge && nudgeMsg && (
        <div className="fixed bottom-6 right-6 z-40 max-w-sm bg-white border border-[#F0EEFF] rounded-2xl p-4 shadow-[0_8px_30px_rgb(240,238,255,0.5)] flex items-start gap-3 animate-fade-in">
          <div className="bg-[#F0EEFF] p-2 rounded-xl">
            <Sparkles className="w-5 h-5 text-[#7C3AED] animate-pulse" />
          </div>
          <div className="text-left flex-1 space-y-1">
            <h5 className="text-[9px] font-extrabold tracking-widest text-[#7C3AED] uppercase">SNYGG SYSTEM BRIEFING</h5>
            <p className="text-xs text-[#1E1B2E]/80 leading-relaxed font-medium">{nudgeMsg}</p>
          </div>
          <button
            onClick={() => setShowNudge(false)}
            className="text-[#1E1B2E]/40 hover:text-[#1E1B2E] p-0.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Inner Application content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 space-y-6">
        
        {/* Compact Focus Alert Indicator */}
        <div className="flex justify-between items-center bg-[#F4F2FF] border border-[#EBE8FF] rounded-2xl px-5 py-3 shadow-sm">
          <p className="text-xs text-[#1E1B2E]/70 leading-relaxed font-semibold">
            Welcome to <span className="text-[#7C3AED] font-black">SNYGG System Pilot</span>. Plant tasks, track focus, and log reflections.
          </p>
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#7C3AED] flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E0DBFA] rounded-xl shadow-sm">
            <Sun className="w-3.5 h-3.5 text-[#F59E8B] animate-spin" style={{ animationDuration: '20s' }} /> SYSTEM: FULLY TENDED 🌟
          </div>
        </div>

        {/* Dynamic content Router */}
        <div className="space-y-6">
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Dashboard
                  tasks={tasks}
                  stats={stats}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  accessToken={token}
                  onXPUnlock={handleEarnXP}
                  onLogin={handleGoogleLogin}
                  user={user}
                  onRedirectToLoadout={() => setActiveTab('loadout')}
                  onTokenRefresh={setToken}
                />
              </div>
              <div className="space-y-6">
                <VoiceInput
                  tasks={tasks}
                  onAddTask={handleAddVoiceTask}
                  onUpdateTask={handleUpdateTask}
                  onRefreshBriefing={() => {}}
                  onTriggerMoodReschedule={() => setActiveTab('mood')}
                />
              </div>
            </div>
          )}

          {activeTab === 'mood' && (
            <MoodJournal
              tasks={tasks}
              onRescheduleTasks={handleRescheduleMissions}
              onAddMoodEntry={handleAddMoodEntry}
              moodHistory={moodHistory}
            />
          )}

          {activeTab === 'focus' && (
            <FocusArena
              onXPUnlock={handleEarnXP}
              onFocusScoreIncrement={handleFocusIncrement}
              onFocusComplete={handleFocusComplete}
            />
          )}

          {activeTab === 'leaderboard' && (
            <Leaderboard
              friends={friends}
              badges={badges}
              challenges={challenges}
              onClaimChallenge={handleClaimChallenge}
              myJoinCode={myJoinCode}
              onAddFriend={handleAddFriend}
            />
          )}

          {activeTab === 'loadout' && (
            <div className="max-w-2xl mx-auto">
              <TaskInput onAddTask={handleAddTask} />
            </div>
          )}
        </div>

      </main>
      
      {/* Dynamic Digital Co-Pilot Snyx Mascot */}
      <SnyxMascot 
        tasks={tasks} 
        userStats={stats} 
        currentMood={moodHistory[0]?.detectedMood || 'normal'} 
      />

      {/* Level-Up Celebration Modal */}
      <LevelUpCelebration
        isOpen={levelUpCelebration.isOpen}
        level={levelUpCelebration.level}
        onClose={() => setLevelUpCelebration(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Google OAuth Disclaimer Modal */}
      <OAuthDisclaimerModal
        isOpen={showOAuthDisclaimer}
        onClose={() => setShowOAuthDisclaimer(false)}
        onConfirm={proceedGoogleLogin}
        isLoggingIn={isLoggingIn}
      />
        </>
      )}
    </div>
  );
}
