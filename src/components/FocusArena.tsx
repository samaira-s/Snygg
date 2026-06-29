import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, ShieldAlert, Sparkles, EyeOff, Trophy, Users, Shield, Compass, Sprout, Plus, LogIn, LogOut } from 'lucide-react';
import { audioSynth } from '../lib/audio';
import { triggerConfetti } from '../lib/confetti';

interface FocusArenaProps {
  onXPUnlock: (amount: number) => void;
  onFocusScoreIncrement: () => void;
  onFocusComplete?: () => void;
}

export default function FocusArena({ onXPUnlock, onFocusScoreIncrement, onFocusComplete }: FocusArenaProps) {
  // Study Room States
  const [activeRoom, setActiveRoom] = useState<{
    code: string;
    pilots: Array<{ name: string; status: string; isMe?: boolean }>;
  } | null>(() => {
    const saved = localStorage.getItem('snygg_active_room');
    return saved ? JSON.parse(saved) : null;
  });
  const [inputRoomCode, setInputRoomCode] = useState<string>('');

  const handleCreateRoom = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const newRoom = {
      code,
      pilots: [
        { name: 'Gardener Samaira (You)', status: '🔴 FOCUSING', isMe: true },
        { name: 'Daisy_Farms', status: '🔴 FOCUSING' },
        { name: 'Sow&Reap', status: '🟢 BREAK' }
      ]
    };
    setActiveRoom(newRoom);
    localStorage.setItem('snygg_active_room', JSON.stringify(newRoom));
    
    const savedRooms = JSON.parse(localStorage.getItem('snygg_all_rooms') || '{}');
    savedRooms[code] = newRoom;
    localStorage.setItem('snygg_all_rooms', JSON.stringify(savedRooms));
    audioSynth.playMilestone();
  };

  const handleJoinRoom = (codeToJoin: string) => {
    const cleanedCode = codeToJoin.trim();
    if (cleanedCode.length !== 6 || isNaN(Number(cleanedCode))) {
      alert('Please enter a valid 6-digit room code.');
      return;
    }

    const savedRooms = JSON.parse(localStorage.getItem('snygg_all_rooms') || '{}');
    let room = savedRooms[cleanedCode];
    if (!room) {
      room = {
        code: cleanedCode,
        pilots: [
          { name: 'Gardener Samaira (You)', status: '🔴 FOCUSING', isMe: true },
          { name: 'Sprout_Pilot 🛫', status: '🔴 FOCUSING' },
          { name: 'CozyCabbage 🥬', status: '🟢 BREAK' }
        ]
      };
      savedRooms[cleanedCode] = room;
      localStorage.setItem('snygg_all_rooms', JSON.stringify(savedRooms));
    }

    setActiveRoom(room);
    localStorage.setItem('snygg_active_room', JSON.stringify(room));
    audioSynth.playMilestone();
    setInputRoomCode('');
  };

  const handleLeaveRoom = () => {
    setActiveRoom(null);
    localStorage.removeItem('snygg_active_room');
  };

  // Read initial states from localStorage to prevent loss on unmount/tab switch
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const runningStr = localStorage.getItem('snygg_timer_running');
    if (runningStr === 'true') {
      const startStr = localStorage.getItem('snygg_timer_start_time');
      const durationStr = localStorage.getItem('snygg_timer_duration_ms');
      if (startStr && durationStr) {
        const startTimestamp = Number(startStr);
        const duration = Number(durationStr);
        const remainingTime = duration - (Date.now() - startTimestamp);
        if (remainingTime > 0) {
          return Math.ceil(remainingTime / 1000);
        }
      }
    }
    const savedSeconds = localStorage.getItem('snygg_timer_seconds_left');
    return savedSeconds ? Number(savedSeconds) : 25 * 60;
  });

  const [isRunning, setIsRunning] = useState<boolean>(() => {
    const runningStr = localStorage.getItem('snygg_timer_running');
    if (runningStr === 'true') {
      const startStr = localStorage.getItem('snygg_timer_start_time');
      const durationStr = localStorage.getItem('snygg_timer_duration_ms');
      if (startStr && durationStr) {
        const startTimestamp = Number(startStr);
        const duration = Number(durationStr);
        const remainingTime = duration - (Date.now() - startTimestamp);
        return remainingTime > 0;
      }
    }
    return false;
  });

  const [blockerActive, setBlockerActive] = useState<boolean>(false);
  const [livePeers, setLivePeers] = useState<number>(24);
  const [completedCycles, setCompletedCycles] = useState<number>(() => {
    const saved = localStorage.getItem('snygg_completed_cycles');
    return saved ? Number(saved) : 0;
  });
  
  const timerRef = useRef<any>(null);

  // COZY MEMORY GARDEN Game states
  const [showGame, setShowGame] = useState<boolean>(false);
  const [gameCards, setGameCards] = useState<Array<{ id: number; emoji: string; isFlipped: boolean; isMatched: boolean }>>([]);
  const [gameTimeLeft, setGameTimeLeft] = useState<number>(60);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [gameXPAwarded, setGameXPAwarded] = useState<number>(0);

  const startMemoryGame = () => {
    const emojis = ['🌱', '🌿', '🌸', '🌻', '🍎', '🥕', '🍓', '🎃'];
    const pairList = [...emojis, ...emojis].map((emoji, idx) => ({
      id: idx,
      emoji,
      isFlipped: false,
      isMatched: false,
    }));
    
    // Shuffle
    const shuffled = pairList.sort(() => Math.random() - 0.5);
    setGameCards(shuffled);
    setGameTimeLeft(60);
    setSelectedCards([]);
    setGameStatus('playing');
    setGameXPAwarded(0);
    setShowGame(true);
  };

  useEffect(() => {
    let interval: any = null;
    if (showGame && gameStatus === 'playing') {
      interval = setInterval(() => {
        setGameTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setTimeout(() => {
              handleGameEnd(false);
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showGame, gameStatus]);

  const handleCardClick = (index: number) => {
    if (gameStatus !== 'playing') return;
    if (selectedCards.length >= 2) return;
    if (gameCards[index].isFlipped || gameCards[index].isMatched) return;

    // Flip card
    const updatedCards = [...gameCards];
    updatedCards[index].isFlipped = true;
    setGameCards(updatedCards);

    const newSelected = [...selectedCards, index];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      const [firstIdx, secondIdx] = newSelected;
      if (gameCards[firstIdx].emoji === gameCards[secondIdx].emoji) {
        // MATCH FOUND
        setTimeout(() => {
          const matchedCards = [...gameCards];
          matchedCards[firstIdx].isMatched = true;
          matchedCards[secondIdx].isMatched = true;
          setGameCards(matchedCards);
          setSelectedCards([]);
          audioSynth.playTaskComplete(); // play chirpy wind-bell sound

          if (matchedCards.every(card => card.isMatched)) {
            handleGameEnd(true);
          }
        }, 400);
      } else {
        // NO MATCH
        setTimeout(() => {
          const resetCards = [...gameCards];
          resetCards[firstIdx].isFlipped = false;
          resetCards[secondIdx].isFlipped = false;
          setGameCards(resetCards);
          setSelectedCards([]);
        }, 800);
      }
    }
  };

  const handleGameEnd = (won: boolean) => {
    if (won) {
      setGameStatus('won');
      setGameXPAwarded(50);
      setTimeout(() => {
        onXPUnlock(50);
      }, 0);
    } else {
      setGameStatus('lost');
      setGameXPAwarded(20);
      setTimeout(() => {
        onXPUnlock(20);
      }, 0);
    }
  };

  // Organic live harvesters counter
  useEffect(() => {
    const peerInterval = setInterval(() => {
      setLivePeers(prev => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        return Math.max(15, Math.min(35, prev + delta));
      });
    }, 7000);
    return () => clearInterval(peerInterval);
  }, []);

  const syncTimerFromStorage = () => {
    const runningStr = localStorage.getItem('snygg_timer_running');
    const startStr = localStorage.getItem('snygg_timer_start_time');
    const durationStr = localStorage.getItem('snygg_timer_duration_ms');

    if (runningStr === 'true' && startStr && durationStr) {
      const startTimestamp = Number(startStr);
      const duration = Number(durationStr);
      const elapsed = Date.now() - startTimestamp;
      const remainingTime = duration - elapsed;

      if (remainingTime <= 0) {
        localStorage.setItem('snygg_timer_running', 'false');
        localStorage.removeItem('snygg_timer_start_time');
        localStorage.removeItem('snygg_timer_duration_ms');
        
        setSecondsLeft(25 * 60);
        setIsRunning(false);

        // If returned and finished, send notification if not already sent
        const lastNotifiedStart = localStorage.getItem('snygg_last_notified_start');
        if (lastNotifiedStart !== startStr) {
          localStorage.setItem('snygg_last_notified_start', startStr);
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification("🎉 Focus session complete! +100 XP earned");
          }
        }

        handleCycleCompletion();
      } else {
        const remSecs = Math.ceil(remainingTime / 1000);
        setSecondsLeft(remSecs);
        setIsRunning(true);
      }
    } else {
      const savedSeconds = localStorage.getItem('snygg_timer_seconds_left');
      if (savedSeconds) {
        setSecondsLeft(Number(savedSeconds));
      }
      setIsRunning(false);
    }
  };

  useEffect(() => {
    syncTimerFromStorage();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncTimerFromStorage();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Pomodoro countdown ticker
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        const startStr = localStorage.getItem('snygg_timer_start_time');
        const durationStr = localStorage.getItem('snygg_timer_duration_ms');
        
        if (startStr && durationStr) {
          const startTimestamp = Number(startStr);
          const duration = Number(durationStr);
          const remainingTime = duration - (Date.now() - startTimestamp);

          if (remainingTime <= 0) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            localStorage.setItem('snygg_timer_running', 'false');
            localStorage.removeItem('snygg_timer_start_time');
            localStorage.removeItem('snygg_timer_duration_ms');
            setSecondsLeft(25 * 60);

            // Send background notification if hidden on other tab
            const lastNotifiedStart = localStorage.getItem('snygg_last_notified_start');
            if (lastNotifiedStart !== startStr) {
              localStorage.setItem('snygg_last_notified_start', startStr);
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification("🎉 Focus session complete! +100 XP earned");
              }
            }

            handleCycleCompletion();
          } else {
            const remSecs = Math.ceil(remainingTime / 1000);
            setSecondsLeft(remSecs);
          }
        } else {
          // Local fallback
          setSecondsLeft(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              setIsRunning(false);
              setTimeout(() => {
                handleCycleCompletion();
              }, 0);
              return 25 * 60;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const handleCycleCompletion = () => {
    setCompletedCycles(prev => {
      const next = prev + 1;
      localStorage.setItem('snygg_completed_cycles', next.toString());
      return next;
    });
    
    // Play cozy wind chimes end sound
    audioSynth.playTimerEnd();

    // Trigger visual confetti and Snyx happy dance!
    triggerConfetti();
    window.dispatchEvent(new CustomEvent('snyx-focus-complete'));
    
    setTimeout(() => {
      onXPUnlock(250);
      onFocusScoreIncrement();
    }, 0);
    
    // Automatically trigger Memory Garden game for nice slow cooldown
    startMemoryGame();
  };

  const toggleTimer = () => {
    const nextIsRunning = !isRunning;
    if (nextIsRunning) {
      audioSynth.playTimerStart();
      const startTimestamp = Date.now();
      const duration = secondsLeft * 1000;
      localStorage.setItem('snygg_timer_start_time', startTimestamp.toString());
      localStorage.setItem('focusStartTime', startTimestamp.toString());
      localStorage.setItem('snygg_timer_running', 'true');
      localStorage.setItem('snygg_timer_duration_ms', duration.toString());

      // Request browser notification permission on first focus start
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } else {
      localStorage.setItem('snygg_timer_running', 'false');
      localStorage.setItem('snygg_timer_seconds_left', secondsLeft.toString());
      localStorage.removeItem('snygg_timer_start_time');
      localStorage.removeItem('snygg_timer_duration_ms');
    }
    setIsRunning(nextIsRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(25 * 60);
    localStorage.setItem('snygg_timer_running', 'false');
    localStorage.setItem('snygg_timer_seconds_left', (25 * 60).toString());
    localStorage.removeItem('snygg_timer_start_time');
    localStorage.removeItem('snygg_timer_duration_ms');
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const percentage = ((25 * 60 - secondsLeft) / (25 * 60)) * 100;

  return (
    <div className="relative">
      
      {/* Distraction Blocker Overlay - Serene Cottage Mode */}
      {blockerActive && (
        <div className="fixed inset-0 bg-[#F8F7FF] z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          {/* Drifting Clouds Illustration Layer */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
            <div className="absolute top-[10%] left-[-100px] w-48 h-12 bg-white rounded-full blur-xs animate-cloud-slow" />
            <div className="absolute top-[40%] right-[-150px] w-64 h-16 bg-white rounded-full blur-xs animate-cloud-medium" style={{ animationDelay: '5s' }} />
          </div>

          <div className="absolute top-6 left-6 text-[#7C3AED] font-bold text-xs tracking-wider uppercase flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#7C3AED]" /> SERENE DO-NOT-DISTURB MODE ENGAGED 🌿
          </div>
          
          <div className="space-y-6 max-w-md z-10">
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-[#7C3AED] flex items-center justify-center animate-spin-slow mx-auto bg-white">
              <EyeOff className="w-10 h-10 text-[#7C3AED]" />
            </div>
            
            <div>
              <h2 className="text-6xl font-black text-[#1E1B2E] tracking-widest">{formatTime(secondsLeft)}</h2>
              <p className="text-[10px] text-[#F59E8B] font-extrabold tracking-widest uppercase mt-2">COTTAGE HARVEST LOCKS ENGAGED</p>
            </div>

            <p className="text-xs text-[#1E1B2E]/70 font-medium leading-relaxed">
              We've quieted down your external world. Sip a cup of herbal tea, listen to the farm breeze, and stay present on your crops.
            </p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={toggleTimer}
                className="px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-xs font-bold uppercase tracking-wider text-white rounded-xl transition-all cursor-pointer shadow-sm"
              >
                {isRunning ? 'PAUSE TIMER' : 'RESUME TIMER'}
              </button>
              <button
                onClick={() => setBlockerActive(false)}
                className="px-6 py-2.5 border border-[#F0EEFF] hover:border-[#7C3AED] text-xs font-bold uppercase tracking-wider text-[#1E1B2E] rounded-xl transition-all cursor-pointer bg-white"
              >
                DISMISS NOOK LOCK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Focus card layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Timer block */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#F0EEFF] p-6 flex flex-col items-center justify-center text-center space-y-6 shadow-[0_8px_30px_rgb(240,238,255,0.6)] relative overflow-hidden">
          
          {/* Subtle Ghibli Clouds background animation */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
            <div className="absolute top-[15%] left-[5%] w-32 h-8 bg-[#E0DBFA] rounded-full blur-xs" />
            <div className="absolute top-[60%] right-[10%] w-48 h-10 bg-[#E0DBFA] rounded-full blur-xs" />
          </div>

          <div className="w-full flex items-center justify-between border-b border-[#F0EEFF] pb-3 z-10">
            <div className="text-left">
              <h3 className="text-xs font-black text-[#7C3AED] tracking-widest uppercase">
                {activeRoom ? `🏡 Study Room: #${activeRoom.code}` : 'Focus Arena'}
              </h3>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase">
                {activeRoom ? 'SHARED ROOM STUDY SESSION' : 'COZY FLOW STATE DECK'}
              </p>
            </div>
            {/* Blocker trigger */}
            <button
              onClick={() => setBlockerActive(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#F0EEFF] text-[#7C3AED] rounded-xl text-xs font-black uppercase hover:border-[#7C3AED] hover:bg-[#F0EEFF] transition-all cursor-pointer shadow-xs"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              ENGAGE CALM BLOCKER
            </button>
          </div>
 
          {/* Circular timer and mini mascot cheering in corner */}
          <div className="relative flex items-center justify-center w-56 h-56 rounded-full bg-gradient-to-br from-[#F8F7FF] to-white border-2 border-[#E0DBFA] shadow-[0_10px_25px_rgba(124,58,237,0.06)] z-10">
            
            {/* Background SVG radial circle */}
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle
                cx="110"
                cy="110"
                r="90"
                className="stroke-[#F0EEFF]"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="110"
                cy="110"
                r="90"
                className="stroke-[#7C3AED] transition-all duration-300"
                strokeWidth="8"
                strokeDasharray={2 * Math.PI * 90}
                strokeDashoffset={2 * Math.PI * 90 * (1 - percentage / 100)}
                fill="transparent"
                strokeLinecap="round"
              />
            </svg>

            {/* Inner text countdown */}
            <div className="space-y-1 relative z-10">
              <span className="text-[9px] font-black text-[#7C3AED] tracking-widest uppercase flex items-center justify-center gap-1">
                <Sprout className="w-3.5 h-3.5 text-[#10B981] animate-pulse" /> TENDING
              </span>
              <h2 className="text-5xl font-black text-[#1E1B2E] tracking-widest leading-none">
                {formatTime(secondsLeft)}
              </h2>
              <p className="text-[9px] font-extrabold text-[#7C3AED]/70 tracking-wider mt-1">25 MINUTE CYCLE</p>
            </div>
          </div>

          {/* Snyx encouragement inline message bar */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#F0EEFF] text-[#7C3AED] rounded-full shadow-xs border border-[#E0DBFA]/60 z-10">
            <div className="w-6 h-6 min-w-[24px] min-h-[24px] rounded-full bg-white flex items-center justify-center text-xs shadow-xs">
              😸
            </div>
            <span className="text-xs font-bold tracking-tight">Go Samaira! You've got this 🐾</span>
          </div>

          {/* Core Controls */}
          <div className="flex gap-4 z-10">
            <button
              onClick={toggleTimer}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_4px_14px_rgba(124,58,237,0.3)]"
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isRunning ? 'PAUSE SESSION' : 'START SESSION'}
            </button>
            <button
              onClick={resetTimer}
              className="flex items-center justify-center w-11 h-11 border border-[#F0EEFF] hover:border-[#7C3AED] text-slate-500 hover:text-[#7C3AED] rounded-xl bg-white hover:bg-[#F0EEFF] transition-all cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Panel: Peer count & study details */}
        <div className="rounded-2xl bg-white border border-[#F0EEFF] p-5 flex flex-col justify-between shadow-[0_8px_30px_rgb(240,238,255,0.6)] text-left">
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-[#F0EEFF] pb-3">
              <Users className="w-5 h-5 text-[#F59E8B]" />
              <div>
                <h3 className="text-xs font-black text-[#7C3AED] tracking-widest uppercase">Cozy Co-Study Barn</h3>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase">FRIENDLY NEIGHBOR HARVESTERS</p>
              </div>
            </div>

            {/* Live Study Room Info Widget */}
            {!activeRoom ? (
              <div className="space-y-4">
                {/* Live Count Widget */}
                <div className="bg-[#F8F7FF] border border-[#F0EEFF] rounded-2xl p-4 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[9px] text-[#1E1B2E]/50 font-black tracking-wider uppercase">Public Barn</span>
                    <h4 className="text-xs font-black text-[#7C3AED]">25 pilots focusing now</h4>
                  </div>
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full bg-[#7C3AED] border-2 border-white flex items-center justify-center text-[9px] font-black text-white">S</div>
                    <div className="w-7 h-7 rounded-full bg-[#F59E8B] border-2 border-white flex items-center justify-center text-[9px] font-black text-white">B</div>
                    <div className="w-7 h-7 rounded-full bg-amber-600 border-2 border-white flex items-center justify-center text-[9px] font-black text-white">N</div>
                    <div className="w-7 h-7 rounded-full bg-[#F8F7FF] border border-[#F0EEFF] flex items-center justify-center text-[8px] font-black text-[#1E1B2E]/80">+22</div>
                  </div>
                </div>

                {/* Create / Join Room Deck */}
                <div className="bg-[#F8F7FF] border border-[#F0EEFF] rounded-xl p-4 text-left space-y-3.5">
                  <div className="space-y-0.5">
                    <h5 className="text-[10px] uppercase font-black tracking-widest text-[#7C3AED] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#7C3AED]" /> CO-STUDY ROOMS
                    </h5>
                    <p className="text-[8px] text-slate-400 font-extrabold uppercase">Create or Join a private 6-digit lobby</p>
                  </div>

                  <button
                    onClick={handleCreateRoom}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" /> Create Room
                  </button>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="6-Digit Join Code"
                      value={inputRoomCode}
                      onChange={(e) => setInputRoomCode(e.target.value.replace(/\D/g, ''))}
                      className="flex-1 bg-white border border-[#F0EEFF] px-3 py-2 rounded-xl text-xs font-bold text-[#1E1B2E] placeholder-slate-400 focus:outline-none focus:border-[#7C3AED]"
                    />
                    <button
                      onClick={() => handleJoinRoom(inputRoomCode)}
                      className="px-4 py-2 bg-white border border-[#F0EEFF] text-[#7C3AED] hover:bg-[#F0EEFF] text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1"
                    >
                      <LogIn className="w-3.5 h-3.5" /> Join
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active Room Banner */}
                <div className="bg-[#ECFDF5] border border-emerald-100 rounded-2xl p-4 text-left space-y-1 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-emerald-600 font-black tracking-wider uppercase font-extrabold">Active Study Room</span>
                    <button
                      onClick={handleLeaveRoom}
                      title="Leave Study Room"
                      className="text-emerald-600 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="text-base font-black text-emerald-800">ROOM CODE: #{activeRoom.code}</h4>
                  <p className="text-[9px] text-emerald-700 font-bold uppercase">Shared focus is active! 🌿</p>
                </div>

                {/* Pilots in Room List */}
                <div className="bg-[#F8F7FF] border border-[#F0EEFF] rounded-xl p-4 text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-black text-[#7C3AED] uppercase tracking-wider">Pilots Focusing Now</h5>
                    <span className="text-[8px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-md border border-[#F0EEFF]">{activeRoom.pilots.length} Active</span>
                  </div>
                  <div className="space-y-2">
                    {activeRoom.pilots.map((pilot, idx) => {
                      const isMe = pilot.isMe;
                      const isFocusing = pilot.status.includes('FOCUSING');
                      return (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#F0EEFF] text-xs">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full border border-[#E0DBFA] flex items-center justify-center text-[10px] font-black ${
                              isMe ? 'bg-[#7C3AED] text-white' : 'bg-[#F0EEFF] text-[#7C3AED]'
                            }`}>
                              {pilot.name[0].toUpperCase()}
                            </div>
                            <span className="font-bold text-[#1E1B2E] text-[11px]">{pilot.name}</span>
                          </div>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${
                            isFocusing ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-emerald-50 text-emerald-500 border border-emerald-100'
                          }`}>
                            {pilot.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={handleLeaveRoom}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-4 border border-red-100 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Leave Room Lobby
                  </button>
                </div>
              </div>
            )}

            {/* Interactive Stats and Rewards cards */}
            <div className="bg-[#F8F7FF] border border-[#F0EEFF] rounded-xl p-3 text-left space-y-2">
              <h5 className="text-[10px] uppercase font-black tracking-widest text-[#F59E8B] flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#F59E8B]" /> BARN REWARDS MATRIX
              </h5>
              <div className="text-[10px] text-[#1E1B2E]/70 font-medium space-y-1">
                <div className="flex justify-between">
                  <span>Cozy multiplier:</span>
                  <span className="text-[#1E1B2E] font-bold">x1.2 Seeds</span>
                </div>
                <div className="flex justify-between">
                  <span>Nook mode bonus:</span>
                  <span className="text-[#7C3AED] font-bold">+50 Seeds</span>
                </div>
                <div className="flex justify-between">
                  <span>Sprouts Raised Today:</span>
                  <span className="text-[#F59E8B] font-bold">{completedCycles} sprouts</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[9px] text-slate-300 font-black mt-6 text-right uppercase tracking-wider">Secure Farm Record</p>
        </div>

      </div>

      {/* Cozy Memory Garden game Modal */}
      {showGame && (
        <div className="fixed inset-0 bg-[#F8F7FF]/98 z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="absolute top-6 left-6 text-[#7C3AED] font-black text-xs tracking-widest uppercase flex items-center gap-2">
            🌱 SPROUT CALIBRATIONS 🌱
          </div>
          
          <div className="bg-white border border-[#F0EEFF] rounded-2xl p-6 max-w-md w-full space-y-6 shadow-[0_8px_30px_rgb(240,238,255,0.6)]">
            <div className="flex items-center justify-between border-b border-[#F0EEFF] pb-3">
              <div className="text-left">
                <h3 className="text-xs font-black text-[#7C3AED] tracking-widest uppercase">COZY MEMORY GARDEN</h3>
                <p className="text-[9px] text-slate-400 font-extrabold uppercase">RELAX AND MATCH FLORA</p>
              </div>
              <div className="px-2.5 py-1 bg-[#F8F7FF] border border-[#F0EEFF] text-[#F59E8B] font-black text-[10px] rounded">
                ⏱️ {gameTimeLeft}s LEFT
              </div>
            </div>

            {gameStatus === 'playing' ? (
              <p className="text-[10px] text-[#1E1B2E]/70 font-medium leading-relaxed text-left">
                Match all flora and vegetable pairs to refresh your energy level. Complete the garden before time expires!
              </p>
            ) : gameStatus === 'won' ? (
              <div className="p-4 bg-[#ECFDF5] border border-emerald-200 rounded-xl space-y-1.5 text-center">
                <h4 className="text-xs font-black text-[#10B981] flex items-center justify-center gap-1.5">
                  <Trophy className="w-4 h-4 text-[#10B981] animate-bounce" /> CALIBRATION SUCCESSFUL
                </h4>
                <p className="text-xs text-[#1E1B2E]/70 font-medium leading-relaxed">
                  The soil is perfectly refreshed. +50 Bonus Seeds harvested.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1.5 text-center">
                <h4 className="text-xs font-black text-red-500 uppercase tracking-widest">⏱️ CALIBRATION TIMEOUT</h4>
                <p className="text-xs text-[#1E1B2E]/70 font-medium leading-relaxed">
                  Matched partially. +20 Seeds harvested.
                </p>
              </div>
            )}

            {/* Matching Grid */}
            <div className="grid grid-cols-4 gap-3">
              {gameCards.map((card, index) => {
                const isOpen = card.isFlipped || card.isMatched;
                return (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(index)}
                    disabled={isOpen || gameStatus !== 'playing'}
                    className={`h-16 rounded-xl border flex items-center justify-center text-2xl transition-all duration-300 cursor-pointer ${
                      card.isMatched
                        ? 'bg-[#E0F2FE] border-[#38BDF8] opacity-75 scale-95'
                        : card.isFlipped
                        ? 'bg-white border-[#F59E8B] scale-100 shadow-sm'
                        : 'bg-[#F8F7FF] border-[#F0EEFF] hover:border-[#7C3AED] text-transparent'
                    }`}
                  >
                    <span className={isOpen ? 'block animate-fade-in' : 'invisible'}>
                      {card.emoji}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#F0EEFF] flex justify-between items-center gap-3">
              <span className="text-[9px] text-[#1E1B2E]/50 font-black uppercase tracking-wider">SOIL STATE: NURTURED</span>
              {gameStatus !== 'playing' ? (
                <button
                  onClick={() => setShowGame(false)}
                  className="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-xs font-black uppercase tracking-wider text-white rounded-xl transition-all shadow-md cursor-pointer"
                >
                  RETURN TO TODAY'S GARDEN
                </button>
              ) : (
                <button
                  onClick={() => handleGameEnd(false)}
                  className="px-3 py-1.5 border border-[#F0EEFF] text-[9px] font-extrabold text-[#1E1B2E]/60 rounded-xl hover:text-red-500 hover:border-red-400 transition-colors cursor-pointer"
                >
                  LEAVE GAME
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
