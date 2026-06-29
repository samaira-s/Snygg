import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Sparkles, MessageSquare, Sliders, CheckCircle, Clock, Mic, MicOff, Hourglass, HelpCircle, Heart } from 'lucide-react';
import { type Task, type MoodEntry } from '../types';
import { audioSynth } from '../lib/audio';

interface MoodJournalProps {
  tasks: Task[];
  onRescheduleTasks: (updatedTasks: Task[]) => void;
  onAddMoodEntry: (entry: MoodEntry) => void;
  moodHistory: MoodEntry[];
}

export default function MoodJournal({
  tasks,
  onRescheduleTasks,
  onAddMoodEntry,
  moodHistory,
}: MoodJournalProps) {
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [detectedMood, setDetectedMood] = useState<'stressed' | 'tired' | 'motivated' | 'anxious' | null>(null);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [suggestChange, setSuggestChange] = useState<boolean>(false);
  const [reorganizedText, setReorganizedText] = useState<string>('');
  const [reorganizing, setReorganizing] = useState<boolean>(false);

  // TODAY'S BATTLE PLAN (Today's Garden Plan)
  const [battlePlan, setBattlePlan] = useState<{
    schedule: Array<{ timeRange: string; title: string; details?: string; type: string }>;
    microTasks: { targetTaskName: string; riskLevel: string; tasks: string[] };
    countdown: { taskName: string; timeLeftString: string; neededRateString: string };
  } | null>(null);
  const [completedMicroTasks, setCompletedMicroTasks] = useState<{ [index: number]: boolean }>({});

  // Voice State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript || '';
      setInputText(resultText);
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error in Mood Diary:', event);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
  }, []);

  // Pure Client-side local garden plan generator
  const generateLocalBattlePlan = (currentTasks: Task[], mood: string) => {
    const active = currentTasks.filter(t => !t.completed);
    const sorted = [...active].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
    
    // Default fallback task if none are active
    const highestRisk = sorted[0] || {
      name: "Organize meeting notes",
      riskLevel: "green",
      hoursLeft: 4,
      hoursNeeded: 4,
      deadline: "2026-06-27"
    };

    // 1. Generate 3 cozy micro-tasks
    const taskNameLower = highestRisk.name.toLowerCase();
    let microSteps = [
      `Gather details and prepare work for: ${highestRisk.name}`,
      `Deconstruct the task into simple microtasks`,
      `Sit down and start a 15-minute focused work interval`
    ];

    if (taskNameLower.includes('ml') || taskNameLower.includes('machine learning') || taskNameLower.includes('model') || taskNameLower.includes('data')) {
      microSteps = [
        "Open your workspace or editor",
        "Outline the core requirements",
        "Execute one initial test run"
      ];
    } else if (taskNameLower.includes('assignment') || taskNameLower.includes('homework') || taskNameLower.includes('exam') || taskNameLower.includes('study')) {
      microSteps = [
        "Spread out your reference notebooks on the desk",
        "Read the main assignment guidelines carefully",
        "Draft the first paragraph with a warm cup of tea"
      ];
    } else if (taskNameLower.includes('code') || taskNameLower.includes('develop') || taskNameLower.includes('app') || taskNameLower.includes('build') || taskNameLower.includes('bug') || taskNameLower.includes('program')) {
      microSteps = [
        "Turn on your desk lamp and open the code editor",
        "Pinpoint the exact file or code block that needs fixing",
        "Write a simple, clean test line and run the compiler"
      ];
    } else if (taskNameLower.includes('report') || taskNameLower.includes('write') || taskNameLower.includes('paper') || taskNameLower.includes('essay') || taskNameLower.includes('doc')) {
      microSteps = [
        "Get a beautiful, clean sheet of paper or fresh document ready",
        "Draft the main sections and visual layout",
        "Find reference materials and documentation to cite"
      ];
    }

    // 2. Build time schedule based on mood
    const schedule = [];
    const isStressedOrTired = mood === 'stressed' || mood === 'tired' || mood === 'anxious';

    if (isStressedOrTired) {
      // Gentle scheduling
      const easyTasks = active.filter(t => !t.isHard && (t.hoursLeft || t.hoursNeeded || 0) <= 3);
      const hardTasks = active.filter(t => t.isHard || (t.hoursLeft || t.hoursNeeded || 0) > 3);

      const task1 = easyTasks[0] || active[1] || { name: "Respond to urgent messages" };
      const task2 = easyTasks[1] || active[2] || { name: "Tidy up files and folders" };
      const task3 = hardTasks[0] || sorted[0] || { name: "Review outstanding pull requests" };

      schedule.push({
        timeRange: "09:00 AM - 09:30 AM",
        title: `Quick win — ${task1.name}`,
        details: "(Very easy task to warm up your focus)",
        type: "quick-win"
      });
      schedule.push({
        timeRange: "09:40 AM - 10:10 AM",
        title: `Action step — ${task2.name}`,
        details: "(Maintain focus rhythm without feeling overwhelmed)",
        type: "quick-win"
      });
      schedule.push({
        timeRange: "10:20 AM - 11:50 AM",
        title: `Deep Work block — ${task3.name}`,
        details: "(Deeply focused work session)",
        type: "work"
      });
      schedule.push({
        timeRange: "11:50 AM - 12:15 PM",
        title: "🍵 Relaxing Break",
        details: "(Take a deep breath and rest)",
        type: "break"
      });
    } else {
      // MOTIVATED: focus on peak energy immediately
      const hardestTask = sorted[0] || { name: "Main project milestone" };
      const secondaryTask = sorted[1] || active[1] || { name: "Drafting secondary task list" };

      schedule.push({
        timeRange: "09:00 AM - 10:30 AM",
        title: `Deep Work block — ${hardestTask.name}`,
        details: "(Tackle the heaviest milestone block first)",
        type: "work"
      });
      schedule.push({
        timeRange: "10:45 AM - 11:30 AM",
        title: `Sub-task focus — ${secondaryTask.name}`,
        details: "(Steady work progress)",
        type: "quick-win"
      });
      schedule.push({
        timeRange: "11:30 AM - 11:45 AM",
        title: "🍎 Healthy Snack Break",
        details: "(Replenish your energy levels)",
        type: "break"
      });
    }

    // 3. Countdown calculation
    const today = new Date('2026-06-25');
    const dlDate = new Date(highestRisk.deadline || '2026-06-27');
    const diffTime = dlDate.getTime() - today.getTime();
    const daysLeft = Math.max(1, Math.ceil(diffTime / (1000 * 3600 * 24)));
    const hoursLeft = highestRisk.hoursLeft || highestRisk.hoursNeeded || 1;
    const hrsPerDay = (hoursLeft / daysLeft).toFixed(1);

    const countdown = {
      taskName: highestRisk.name,
      timeLeftString: `${daysLeft} days until harvest`,
      neededRateString: `cultivate ${hrsPerDay} hr/day to bloom beautifully`
    };

    return {
      schedule,
      microTasks: {
        targetTaskName: highestRisk.name,
        riskLevel: highestRisk.riskLevel ? highestRisk.riskLevel.toUpperCase() : "HIGH",
        tasks: microSteps
      },
      countdown
    };
  };

  useEffect(() => {
    if (moodHistory.length > 0) {
      const lastEntry = moodHistory[0]; // array is pre-sorted unshifted, so index 0 is newest
      setDetectedMood(lastEntry.detectedMood);
      const generated = generateLocalBattlePlan(tasks, lastEntry.detectedMood);
      setBattlePlan(generated);
    }
  }, [moodHistory, tasks]);

  const toggleListening = () => {
    if (!speechSupported) return;
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setInputText('');
      recognitionRef.current?.start();
    }
  };

  const handleLogFeelings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    setDetectedMood(null);
    setAiResponse('');
    setSuggestChange(false);
    setReorganizedText('');

    try {
      const response = await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await response.json();

      if (data.mood) {
        setDetectedMood(data.mood);
        setAiResponse(data.response);
        setSuggestChange(data.suggestScheduleChange);

        const newEntry: MoodEntry = {
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toISOString(),
          text: inputText,
          detectedMood: data.mood,
          response: data.response,
          recommendation: data.recommendation,
        };
        onAddMoodEntry(newEntry);
        setInputText('');
      }
    } catch (err) {
      console.error(err);
      setAiResponse("The diary pen is resting. Snyx is trying to fetch cozy thoughts for us! Let's try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoReschedule = async () => {
    if (!detectedMood) return;
    setReorganizing(true);
    try {
      const response = await fetch('/api/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, mood: detectedMood }),
      });
      const data = await response.json();

      if (data.rescheduledTasks) {
        onRescheduleTasks(data.rescheduledTasks);
        setReorganizedText(data.explanation || 'Garden rows replanted to keep you calm and rested.');
        setSuggestChange(false);
        
        if (data.battlePlan) {
          setBattlePlan(data.battlePlan);
          setCompletedMicroTasks({});
        }
      }
    } catch (err) {
      console.error(err);
      setReorganizedText('Failed to organize rows. Snyx is checking the soil.');
    } finally {
      setReorganizing(false);
    }
  };

  const moodCounts = moodHistory.reduce(
    (acc, cur) => {
      acc[cur.detectedMood] = (acc[cur.detectedMood] || 0) + 1;
      return acc;
    },
    { stressed: 0, tired: 0, motivated: 0, anxious: 0 } as Record<string, number>
  );

  const moodColors = {
    motivated: { text: 'text-[#7C3AED]', label: 'Thriving ✨', bg: 'bg-[#7C3AED]', glow: 'border-[#7C3AED]/30 bg-[#7C3AED]/5' },
    anxious: { text: 'text-[#F59E8B]', label: 'Needs Care 🌸', bg: 'bg-[#F59E8B]', glow: 'border-[#F59E8B]/30 bg-[#F59E8B]/5' },
    stressed: { text: 'text-[#EC4899]', label: 'Overwhelmed 🍂', bg: 'bg-[#EC4899]', glow: 'border-[#EC4899]/30 bg-[#EC4899]/5' },
    tired: { text: 'text-[#64748B]', label: 'Resting 😴', bg: 'bg-[#64748B]', glow: 'border-[#64748B]/30 bg-[#64748B]/5' },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Column 1 & 2: Chat & Logs Console */}
      <div className="lg:col-span-2 rounded-2xl bg-white border border-[#F0EEFF] p-5 flex flex-col justify-between min-h-[480px] shadow-[0_8px_30px_rgb(240,238,255,0.6)]">
        <div>
          <div className="flex items-center gap-2 border-b border-[#F0EEFF] pb-3 mb-4">
            <BookOpen className="w-5 h-5 text-[#7C3AED]" />
            <div className="text-left">
              <h3 className="text-xs font-black text-[#7C3AED] tracking-widest uppercase">Neural Journal</h3>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase">WRITE COZY REFLECTIONS & TEND YOUR WELL-BEING</p>
            </div>
          </div>

          {/* Interactive Chat Dialog Box */}
          <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
            {moodHistory.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-medium italic">
                🌸 No diary entries recorded yet. Share your feelings in the ledger below!
              </div>
            ) : (
              [...moodHistory].reverse().slice(-4).map((entry) => (
                <div key={entry.id} className="space-y-2">
                  {/* Gardener message */}
                  <div className="flex items-start justify-end gap-2 text-right">
                    <div className="bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] rounded-2xl px-4 py-2.5 max-w-[80%] shadow-sm text-white">
                      <p className="text-xs font-medium">{entry.text}</p>
                      <span className="text-[9px] text-white/75 font-bold block mt-1">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  {/* Snyx/Diary Response */}
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#F0EEFF] border border-[#E0DBFA] flex items-center justify-center font-bold text-[10px] text-[#7C3AED] shrink-0">
                      😸
                    </div>
                    <div className="bg-white border border-[#F0EEFF] rounded-2xl px-4 py-2.5 max-w-[80%] text-left shadow-xs">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full ${moodColors[entry.detectedMood]?.glow} ${moodColors[entry.detectedMood]?.text}`}>
                          {moodColors[entry.detectedMood]?.label || entry.detectedMood}
                        </span>
                      </div>
                      <p className="text-xs text-[#1E1B2E]/90 leading-relaxed font-sans font-medium">{entry.response}</p>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Live Loading Telemetry */}
            {loading && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#7C3AED] flex items-center justify-center font-bold text-[10px] text-white animate-bounce shrink-0">
                  😺
                </div>
                <div className="bg-[#F8F7FF] border border-[#F0EEFF] rounded-2xl px-4 py-2.5 text-xs text-[#7C3AED] font-extrabold animate-pulse text-left">
                  Snyx is reviewing the journal ledger... listening to nature wind...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lower Controls: Reschedule Triggers and Text Field */}
        <div className="space-y-4">
          
          {/* Schedule optimization suggestions */}
          {suggestChange && detectedMood && (
            <div className="bg-[#F8F7FF] border border-[#E0DBFA] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <Sliders className="w-6 h-6 text-[#7C3AED]" />
                <div className="text-left">
                  <h4 className="text-xs font-black text-[#7C3AED] tracking-wide">CROP HARVEST OVERLOAD DETECTED</h4>
                  <p className="text-[10px] text-[#1E1B2E]/70 font-medium">Would you like to reorganize hard crops for a {detectedMood} garden flow?</p>
                </div>
              </div>
              <button
                onClick={handleAutoReschedule}
                disabled={reorganizing}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-xs font-bold uppercase tracking-wider text-white rounded-xl transition-all shadow-md whitespace-nowrap cursor-pointer"
              >
                {reorganizing ? 'ALIGNING CROP BEDS...' : 'RESTORE GARDEN BALANCE'}
              </button>
            </div>
          )}

          {/* Rescheduling explanation */}
          {reorganizedText && (
            <div className="bg-[#ECFDF5] border border-emerald-200 rounded-xl p-4 text-left space-y-1.5">
              <h4 className="text-xs font-black text-[#10B981] flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#10B981]" /> CROP LAYOUT RESET SUCCESSFULLY
              </h4>
              <p className="text-xs text-[#1E1B2E]/80 font-medium leading-relaxed">{reorganizedText}</p>
            </div>
          )}

          {/* TODAY'S BATTLE PLAN (Today's Garden Plan) */}
          {battlePlan && (
            <div className="rounded-2xl border border-[#F0EEFF] bg-white p-5 space-y-5 text-left shadow-xs">
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-[#F0EEFF] pb-3">
                <Sparkles className="w-5 h-5 text-[#7C3AED] animate-pulse" />
                <div>
                  <h4 className="text-xs font-black text-[#7C3AED] tracking-widest">🌿 TODAY'S GARDEN PLAN</h4>
                  <p className="text-[9px] text-slate-400 font-extrabold uppercase">SERENE CUSTOM TIMETABLE</p>
                </div>
              </div>

              {/* Three column dynamic grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* 1. Time-blocked schedule */}
                <div className="bg-[#F8F7FF] border border-[#F0EEFF] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-1.5 border-b border-[#F0EEFF] pb-2">
                    <Clock className="w-4 h-4 text-[#7C3AED]" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#7C3AED]">TIMED GARDEN CHORES</span>
                  </div>
                  <div className="space-y-3 pt-1">
                    {battlePlan.schedule.map((slot, idx) => (
                      <div key={idx} className="flex gap-2.5 relative items-start">
                        {idx !== battlePlan.schedule.length - 1 && (
                          <div className="absolute left-[5px] top-4 bottom-[-16px] w-[1px] bg-[#F0EEFF]" />
                        )}
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                          slot.type === 'break' 
                            ? 'bg-[#7C3AED]' 
                            : slot.type === 'quick-win'
                            ? 'bg-[#F59E8B]'
                            : 'bg-amber-600'
                        }`} />
                        <div>
                          <p className="text-[9px] font-black text-slate-400">{slot.timeRange}</p>
                          <p className="text-xs font-black text-[#1E1B2E] leading-tight">{slot.title}</p>
                          {slot.details && <p className="text-[9px] text-slate-400 mt-0.5 italic">{slot.details}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Micro-tasks checklist */}
                <div className="bg-[#F8F7FF] border border-[#F0EEFF] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-1.5 border-b border-[#F0EEFF] pb-2">
                    <CheckCircle className="w-4 h-4 text-[#F59E8B]" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#F59E8B]">LITTLE CHORES LIST</span>
                  </div>
                  <div className="space-y-1 text-left">
                    <p className="text-[10px] text-[#1E1B2E]/60 leading-normal font-medium">
                      Chore target: <span className="text-[#1E1B2E] font-bold">{battlePlan.microTasks.targetTaskName}</span> 
                      <span className="ml-1 text-[8px] bg-[#F59E8B]/10 text-[#F59E8B] border border-[#F59E8B]/20 px-1 py-0.5 rounded uppercase font-bold">
                        {battlePlan.microTasks.riskLevel}
                      </span>
                    </p>
                  </div>
                  <div className="space-y-2 pt-1">
                    {battlePlan.microTasks.tasks.map((taskStr, idx) => (
                      <label 
                        key={idx} 
                        className={`flex items-start gap-2.5 p-2 rounded-lg bg-white border transition-all cursor-pointer ${
                          completedMicroTasks[idx] 
                            ? 'border-[#F0EEFF] text-[#1E1B2E]/40 bg-gray-50' 
                            : 'border-[#F0EEFF] hover:border-[#7C3AED]/40 text-[#1E1B2E]/80'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!completedMicroTasks[idx]}
                          onChange={(e) => {
                            setCompletedMicroTasks(prev => {
                              const updated = { ...prev, [idx]: e.target.checked };
                              if (e.target.checked) {
                                audioSynth.playTaskComplete();
                              }
                              return updated;
                            });
                          }}
                          className="mt-0.5 accent-[#7C3AED] rounded border-[#F0EEFF] cursor-pointer"
                        />
                        <span className={`text-[10px] font-medium select-none text-left leading-tight ${completedMicroTasks[idx] ? 'line-through' : ''}`}>
                          {taskStr}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 3. Countdown telemetry */}
                <div className="bg-[#F8F7FF] border border-[#F0EEFF] rounded-xl p-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 border-b border-[#F0EEFF] pb-2">
                      <Hourglass className="w-4 h-4 text-[#F59E8B] animate-spin-slow" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#F59E8B]">GREENHOUSE CHRONOMETER</span>
                    </div>
                    <div className="space-y-2 text-left">
                      <p className="text-[9px] text-[#1E1B2E]/50 font-bold uppercase">TARGET CROP</p>
                      <p className="text-xs font-bold text-[#1E1B2E] leading-tight">{battlePlan.countdown.taskName}</p>
                      
                      <div className="p-2.5 bg-white border border-[#F0EEFF] rounded-lg space-y-1 mt-2">
                        <span className="text-[9px] text-[#F59E8B] uppercase font-bold tracking-wider block">⏱️ GARDEN TIME REMAINING</span>
                        <span className="text-xs font-extrabold text-[#F59E8B]">{battlePlan.countdown.timeLeftString}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-[#F0EEFF] text-left mt-3">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">GARDENER COMPASS ADVISORY</span>
                    <span className="text-[10px] text-[#7C3AED] font-bold">{battlePlan.countdown.neededRateString}</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Form Text input with Voice Web Speech trigger */}
          <form onSubmit={handleLogFeelings} className="flex gap-2">
            <div className="relative flex-1 flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={loading}
                placeholder={isListening ? "Listening with cozy ears... speak now! 🌿" : "Write in your garden diary... (e.g. 'Feeling tired after weeding')" }
                className={`w-full bg-white border ${isListening ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/20' : 'border-[#F0EEFF]'} rounded-xl pl-4 pr-12 py-3 text-xs text-[#1E1B2E] placeholder-slate-400 focus:outline-none focus:border-[#7C3AED] transition-all`}
              />
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={loading}
                  className={`absolute right-3 p-1.5 rounded-lg transition-all ${
                    isListening
                      ? 'bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/30 animate-pulse'
                      : 'text-[#7C3AED] hover:text-[#6D28D9]'
                  } cursor-pointer`}
                  title={isListening ? 'Close voice channel' : 'Dictate to diary'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !inputText.trim() || isListening}
              className="px-5 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-xs font-black uppercase tracking-wider rounded-xl text-white transition-all disabled:opacity-40 whitespace-nowrap cursor-pointer shadow-md"
            >
              SAVE DIARY ENTRY
            </button>
          </form>
        </div>
      </div>

      {/* Column 3: Mood History and Analytics */}
      <div className="rounded-2xl bg-white border border-[#F0EEFF] p-5 flex flex-col justify-between shadow-[0_8px_30px_rgb(240,238,255,0.6)] text-left">
        <div>
          <div className="flex items-center gap-2 border-b border-[#F0EEFF] pb-3 mb-4">
            <Sparkles className="w-5 h-5 text-[#F59E8B]" />
            <div className="text-left">
              <h3 className="text-xs font-black text-[#7C3AED] tracking-widest uppercase">Mood Spectrum</h3>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase">7-DAY EMOTIONAL GROWTH</p>
            </div>
          </div>

          {/* Custom Mood Distribution bar Chart */}
          <div className="space-y-4">
            {Object.entries(moodColors).map(([moodKey, colors]) => {
              const count = moodCounts[moodKey] || 0;
              const total = moodHistory.length || 1;
              const pct = Math.round((count / total) * 100);

              // Use our custom modern violet-tinted accent color bars
              const barBgColor = 
                moodKey === 'motivated' 
                  ? 'bg-[#10B981]' 
                  : moodKey === 'anxious' 
                    ? 'bg-[#F59E8B]' 
                    : moodKey === 'stressed' 
                      ? 'bg-red-400' 
                      : 'bg-[#7C3AED]';

              return (
                <div key={moodKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1E1B2E]">
                    <span className="capitalize">{colors.label}</span>
                    <span className={`${colors.text}`}>{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#F0EEFF] border border-[#E0DBFA] overflow-hidden">
                    <div
                      className={`h-full ${barBgColor} transition-all duration-500 rounded-full`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Coach Tip card */}
        <div className="bg-[#F8F7FF] border border-[#E0DBFA] rounded-xl p-4 text-left mt-6">
          <h4 className="text-[10px] uppercase font-black tracking-widest text-[#7C3AED] mb-2 flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-[#F59E8B]" /> DIARY RECOMMENDATION
          </h4>
          <p className="text-xs text-[#1E1B2E]/70 leading-relaxed font-sans font-medium">
            {moodHistory.length === 0 
              ? "Awaiting your first cozy entry to align customized Ghibli cottage guidelines." 
              : (() => {
                  const latestWithRec = [...moodHistory].find(e => e.recommendation);
                  return latestWithRec?.recommendation || (
                    moodCounts.stressed > moodCounts.motivated 
                      ? "Your stress levels are climbing high. Try to water lighter crops today and avoid Alpha Seeds. Relax with Snyx the tabby cat in our cozy Focus Nook."
                      : "The greenhouse atmosphere is exceptionally clear! Your spirit is highly motivated today. Spend time planting difficult seeds or tackling major chores!"
                  );
                })()}
          </p>
        </div>
      </div>

    </div>
  );
}
