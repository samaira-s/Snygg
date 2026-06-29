import React, { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';
import { Sparkles, X, Send, Heart, Flame, Clock, Award, Sprout, ArrowRight } from 'lucide-react';

type Expression = 'idle' | 'happy' | 'worried' | 'sleeping' | 'party';

interface Message {
  id: string;
  sender: 'user' | 'snyx';
  text: string;
  expression?: Expression;
}

interface SnyxMascotProps {
  tasks: any[];
  userStats?: any;
  currentMood?: string;
}

export default function SnyxMascot({ tasks, userStats, currentMood }: SnyxMascotProps) {
  const [expression, setExpression] = useState<Expression>('idle');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'snyx',
      text: "Meow! Hello there, Samaira! *wiggles ears* I am Snyx, your cozy orange tabby copilot! Let's water our garden and smash our focus sessions today. How are you feeling? 🐾🌸",
      expression: 'idle'
    }
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showNotification, setShowNotification] = useState<boolean>(true);
  const [notificationText, setNotificationText] = useState<string>("Snyx is purring in the corner... 🐾");
  const [purringHearts, setPurringHearts] = useState<Array<{ id: number; left: number; top: number }>>([]);
  const [idleMinutes, setIdleMinutes] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested conversational topics
  const suggestions = [
    { text: "🐾 What should I do next?", label: "Next Steps" },
    { text: "💡 Give me some motivation!", label: "Motivation" },
    { text: "📊 Analyze my crop risk", label: "Crop Risk Analysis" },
    { text: "🍵 Let's take a cozy break", label: "Break Suggestion" }
  ];

  // Scroll to bottom on messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle Idle State (Sleepy expression after 10+ minutes)
  useEffect(() => {
    let idleTimer: NodeJS.Timeout;
    const incrementIdle = () => {
      setIdleMinutes(prev => {
        const next = prev + 1;
        if (next >= 10 && expression !== 'sleeping') {
          setExpression('sleeping');
          setNotificationText("Zzz... Snyx is asleep under a warm sunbeam... 😴🐾");
          setShowNotification(true);
        }
        return next;
      });
    };

    const resetIdle = () => {
      setIdleMinutes(0);
      if (expression === 'sleeping') {
        setExpression('idle');
        setNotificationText("Yawn! Snyx is awake and ready to help, Samaira! 😺");
        setShowNotification(true);
      }
    };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    window.addEventListener('click', resetIdle);

    idleTimer = setInterval(incrementIdle, 60000); // Check every minute

    return () => {
      clearInterval(idleTimer);
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('click', resetIdle);
    };
  }, [expression]);

  // Handle Event Triggers from around the app
  useEffect(() => {
    const handleXPEarned = (e: Event) => {
      const customEvent = e as CustomEvent;
      const amount = customEvent.detail?.amount || 50;
      setExpression('happy');
      setNotificationText(`How wonderful! We harvested +${amount} seeds! 😸🌻`);
      setShowNotification(true);
      spawnHearts();

      setTimeout(() => {
        setExpression('idle');
      }, 5000);
    };

    const handleFocusComplete = () => {
      setExpression('party');
      setNotificationText("A spectacular focus harvest! Snyx is purring with pure joy! 🎉🐾");
      setShowNotification(true);
      spawnHearts();

      setTimeout(() => {
        setExpression('idle');
      }, 6000);
    };

    const handleFocusStart = () => {
      setExpression('party');
      setNotificationText("Focus Arena activated! I'm cheering you on in the grass! 🧺🧶");
      setShowNotification(true);
    };

    const handleFocusStop = () => {
      setExpression('idle');
      setNotificationText("Taking a little tea break in the shade. Excellent effort! 🍵");
      setShowNotification(true);
    };

    window.addEventListener('snyx-xp-earned' as any, handleXPEarned);
    window.addEventListener('snyx-focus-complete', handleFocusComplete);
    window.addEventListener('snyx-focus-start', handleFocusStart);
    window.addEventListener('snyx-focus-stop', handleFocusStop);

    return () => {
      window.removeEventListener('snyx-xp-earned' as any, handleXPEarned);
      window.removeEventListener('snyx-focus-complete', handleFocusComplete);
      window.removeEventListener('snyx-focus-start', handleFocusStart);
      window.removeEventListener('snyx-focus-stop', handleFocusStop);
    };
  }, []);

  // Monitor high risk tasks and set Worried state if urgent
  useEffect(() => {
    if (expression === 'happy' || expression === 'party' || expression === 'sleeping') return;
    
    const hasUrgent = tasks.some(t => !t.completed && (t.riskLevel === 'red' || (t.riskScore && t.riskScore > 75)));
    if (hasUrgent) {
      setExpression('worried');
      setNotificationText("Oh dear! Some crops are dry and need attention! 😿🚨");
      setShowNotification(true);
    } else if (expression === 'worried') {
      setExpression('idle');
      setNotificationText("The garden is looking clean and refreshed! 😺🌸");
      setShowNotification(true);
    }
  }, [tasks]);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(false);
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragOffset.current = { ...position };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - dragStart.current.x;
      const dy = moveEvent.clientY - dragStart.current.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        setIsDragging(true);
      }
      setPosition({
        x: dragOffset.current.x + dx,
        y: dragOffset.current.y + dy
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(false);
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX, y: touch.clientY };
    dragOffset.current = { ...position };

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const touchMove = moveEvent.touches[0];
      const dx = touchMove.clientX - dragStart.current.x;
      const dy = touchMove.clientY - dragStart.current.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        setIsDragging(true);
      }
      setPosition({
        x: dragOffset.current.x + dx,
        y: dragOffset.current.y + dy
      });
    };

    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleButtonClick = () => {
    if (isDragging) return;
    setIsChatOpen(prev => !prev);
    setShowNotification(false);
    playMeowSound();
  };

  // GSAP breathing and idle bouncing animation on floating button
  useEffect(() => {
    if (!innerRef.current) return;
    
    gsap.killTweensOf(innerRef.current);
    
    // Subtle breathing animation (scale 1 to 1.03 every 2 seconds)
    gsap.to(innerRef.current, {
      scale: 1.03,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut"
    });

    // Gentle floating animation (moves up 5px and back)
    gsap.to(innerRef.current, {
      y: -5,
      duration: 1.8,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
  }, []);

  const spawnHearts = () => {
    const newHearts = Array.from({ length: 4 }).map((_, i) => ({
      id: Date.now() + i,
      left: 10 + Math.random() * 80,
      top: -20 - Math.random() * 30
    }));
    setPurringHearts(prev => [...prev, ...newHearts]);
    setTimeout(() => {
      setPurringHearts(prev => prev.filter(h => !newHearts.some(nh => nh.id === h.id)));
    }, 2000);
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);
    setExpression('idle');

    try {
      const response = await fetch('/api/snyx-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-8), // Send last 8 messages for context
          tasks: tasks.map(t => ({
            name: t.name,
            deadline: t.deadline,
            riskLevel: t.riskLevel || 'green',
            progress: t.progress,
            hoursLeft: t.hoursLeft
          })),
          currentMood: currentMood || 'normal',
          userName: 'Samaira',
          currentTimeOfDay: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          userStats
        })
      });

      const data = await response.json();
      
      const snyxMsg: Message = {
        id: Math.random().toString(),
        sender: 'snyx',
        text: data.replyText || "Purr... I'm listening! Let's stay focused! 🐾",
        expression: data.expression || 'idle'
      };

      setMessages(prev => [...prev, snyxMsg]);
      if (data.expression) {
        setExpression(data.expression);
      }
      
      // Play a tiny sweet sound
      playMeowSound();
    } catch (error) {
      console.error("Error communicating with Snyx chat API:", error);
      // Fallback
      setTimeout(() => {
        const fallbackMsg: Message = {
          id: Math.random().toString(),
          sender: 'snyx',
          text: "Purrr... My connection is a little sleepy, but Snyx is still right here! Let's get back to tending our beautiful garden! 🐾🌾",
          expression: 'idle'
        };
        setMessages(prev => [...prev, fallbackMsg]);
      }, 1000);
    } finally {
      setIsTyping(false);
    }
  };

  const playMeowSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.quadraticCurveToValueAtTime(500, now + 0.15, 600, now + 0.25);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  };

  const renderFaceEmoji = (expr: Expression) => {
    switch (expr) {
      case 'happy': return '😸';
      case 'worried': return '😿';
      case 'sleeping': return '😴';
      case 'party': return '🎉';
      default: return '😺';
    }
  };

  // Face emoji helper

  return (
    <>
      {/* 1. Floating Action Snyx Button */}
      <div 
        className="fixed bottom-12 right-12 z-50 flex flex-col items-end pointer-events-none select-none"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.15s ease-out'
        }}
      >
        
        {/* Soft hovering notification speech bubble */}
        {showNotification && !isChatOpen && (
          <div className="bg-white border border-[#F0EEFF] text-[#1E1B2E] px-4 py-2 rounded-2xl shadow-[0_8px_24px_rgba(124,58,237,0.08)] mb-3 text-xs leading-relaxed max-w-[190px] pointer-events-auto relative text-left flex items-start gap-1.5 animate-fade-in animate-bounce" style={{ animationDuration: '4s' }}>
            <span className="text-[#7C3AED] font-extrabold flex-1">
              {notificationText}
            </span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowNotification(false);
              }}
              className="text-slate-400 hover:text-[#1E1B2E] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="absolute bottom-[-6px] right-6 w-3 h-3 bg-white border-r border-b border-[#F0EEFF] rotate-45"></div>
          </div>
        )}

        {/* Upgraded Kawaii Floating Button */}
        <button
          ref={buttonRef}
          onClick={handleButtonClick}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="pointer-events-auto cursor-grab active:cursor-grabbing focus:outline-none transition-transform hover:scale-105 active:scale-95 relative"
          title="Drag Snyx anywhere, tap to chat! 🐾"
        >
          {/* Spawning hearts */}
          {purringHearts.map(heart => (
            <div 
              key={heart.id} 
              className="absolute text-rose-400 animate-bounce pointer-events-none z-10"
              style={{ 
                left: `${heart.left}px`, 
                top: `${heart.top}px`, 
                transform: 'scale(0.8)',
                animationDuration: '1.2s'
              }}
            >
              <Heart className="w-5 h-5 fill-current" />
            </div>
          ))}

          {/* Pure HTML+CSS Cat Container 72px with Soft Orange Gradient Border */}
          <div 
            ref={innerRef}
            className="w-[72px] h-[72px] rounded-full p-[3px] bg-gradient-to-br from-amber-400 via-orange-400 to-pink-500 flex items-center justify-center relative overflow-visible shadow-lg"
          >
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
              <img
                src="https://robohash.org/snygg-cute-cat?set=set4&size=72x72"
                alt="Snyx Cat Companion"
                className="w-full h-full object-cover select-none"
                referrerPolicy="no-referrer"
              />
            </div>
            
            {/* Small cute pink ribbon under chin */}
            <div className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-5.5 h-2.5 bg-pink-500 rounded-xs flex items-center justify-center shadow-xs z-10 scale-95">
              <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3 bg-pink-500 rounded-xs rotate-12" />
              <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3 bg-pink-500 rounded-xs -rotate-12" />
              <div className="w-1.5 h-1.5 bg-pink-600 rounded-full z-10" />
            </div>
            
            {/* Expression Overlays */}
            {expression === 'happy' && (
              <span className="absolute -top-1 -right-1 text-xl select-none animate-pulse">✨</span>
            )}
            {expression === 'worried' && (
              <span className="absolute -top-1 -right-1 text-xl select-none animate-bounce" style={{ animationDuration: '1.5s' }}>😰</span>
            )}
            {expression === 'sleeping' && (
              <span className="absolute -top-1 -right-1 text-xl select-none animate-pulse">💤</span>
            )}
            {expression === 'party' && (
              <span className="absolute -top-1 -right-1 text-xl select-none animate-bounce">🎉</span>
            )}
          </div>
        </button>
      </div>

      {/* 2. Slide-out beautiful Chat Companion Drawer */}
      <div 
        ref={chatPanelRef}
        className={`fixed top-0 right-0 h-screen w-full sm:w-96 bg-[#F8F7FF] border-l border-[#F0EEFF] shadow-[0_0_50px_rgba(124,58,237,0.15)] z-50 flex flex-col transition-all duration-300 transform ${
          isChatOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="bg-white p-4 border-b border-[#F0EEFF] flex items-center justify-between shadow-[0_2px_15px_rgba(240,238,255,0.4)]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full p-[2.5px] bg-gradient-to-br from-amber-400 via-orange-400 to-pink-500 flex items-center justify-center relative overflow-visible shadow-xs">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                <img
                  src="https://robohash.org/snygg-cute-cat?set=set4&size=44x44"
                  alt="Snyx Cat Avatar"
                  className="w-full h-full object-cover select-none"
                  referrerPolicy="no-referrer"
                />
              </div>
              {/* Cute pink bow tie under chin for avatar */}
              <div className="absolute bottom-[1px] left-1/2 -translate-x-1/2 w-4 h-2 bg-pink-500 rounded-xs flex items-center justify-center shadow-xs z-10 scale-75">
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2.5 bg-pink-500 rounded-xs rotate-12" />
                <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2.5 bg-pink-500 rounded-xs -rotate-12" />
                <div className="w-1 h-1 bg-pink-600 rounded-full z-10" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 bg-green-500 border-2 border-white w-3 h-3 rounded-full"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-display font-black text-sm text-[#1E1B2E]">Snyx</h3>
                <span className="text-xs bg-[#F0EEFF] text-[#7C3AED] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                  CO-PILOT
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                Expression: {renderFaceEmoji(expression)} {expression.toUpperCase()}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsChatOpen(false)}
            className="p-1.5 text-slate-400 hover:text-[#1E1B2E] hover:bg-[#F0EEFF] rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-center py-2">
            <span className="text-[9px] uppercase font-black tracking-widest text-[#7C3AED]/50 bg-[#F0EEFF] px-2.5 py-1 rounded-full">
              COZY DIALOGUE MATRIX 🐾
            </span>
          </div>

          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div 
                key={msg.id} 
                className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse text-right' : 'text-left'}`}
              >
                {/* Snyx avatar on left side of his messages */}
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-[#F0EEFF] border border-[#E0DBFA] flex items-center justify-center shrink-0">
                    <span className="text-base">{renderFaceEmoji(msg.expression || 'idle')}</span>
                  </div>
                )}

                <div 
                  className={`max-w-[78%] rounded-2xl p-3.5 text-xs font-medium leading-relaxed shadow-xs transition-all ${
                    isUser 
                      ? 'bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] text-white rounded-tr-none' 
                      : 'bg-white text-[#1E1B2E] border border-[#F0EEFF] rounded-tl-none shadow-[0_4px_15px_rgba(240,238,255,0.8)]'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#F0EEFF] border border-[#E0DBFA] flex items-center justify-center shrink-0">
                <span className="text-base animate-bounce">😺</span>
              </div>
              <div className="bg-white border border-[#F0EEFF] rounded-2xl rounded-tl-none p-3.5 shadow-xs shrink-0 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#7C3AED] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-[#7C3AED] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-[#7C3AED] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Quick Chips */}
        <div className="px-4 pb-1 pt-2 flex flex-wrap gap-1.5 shrink-0 bg-white border-t border-[#F0EEFF]">
          {suggestions.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(sug.text)}
              className="text-[10px] font-extrabold text-[#7C3AED] bg-[#F0EEFF] hover:bg-[#7C3AED] hover:text-white px-2.5 py-1.5 rounded-full transition-all border border-transparent shadow-xs cursor-pointer flex items-center gap-1"
            >
              <span>{sug.label}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="p-3 bg-white border-t border-[#F0EEFF] flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage(inputValue);
            }}
            placeholder="Talk with cute Snyx tabby..."
            className="flex-1 px-4 py-2.5 bg-[#F8F7FF] border border-[#F0EEFF] rounded-xl text-xs font-medium text-[#1E1B2E] placeholder-slate-400 focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all"
          />
          <button
            onClick={() => handleSendMessage(inputValue)}
            className="p-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
            title="Send carriers to Snyx"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
