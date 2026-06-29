import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Info, HelpCircle, Sparkles, Check, Play, Leaf } from 'lucide-react';
import { type Task } from '../types';

interface VoiceInputProps {
  tasks: Task[];
  onAddTask: (name: string, isHard: boolean, hours: number) => void;
  onUpdateTask: (task: Task) => void;
  onRefreshBriefing: () => void;
  onTriggerMoodReschedule: () => void;
}

export default function VoiceInput({
  tasks,
  onAddTask,
  onUpdateTask,
  onRefreshBriefing,
  onTriggerMoodReschedule,
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');
  const [supported, setSupported] = useState<boolean>(true);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      setFeedbackMsg('The wind chimes are listening... Speak your farm command.');
    };

    rec.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript || '';
      setTranscript(resultText);
      parseVoiceCommand(resultText);
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error', event);
      setFeedbackMsg('The breeze carried your words away. Please speak again.');
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
  }, [tasks]);

  const toggleListening = () => {
    if (!supported) return;
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      setFeedbackMsg('');
      recognitionRef.current?.start();
    }
  };

  // Parser for hands-free farm directives
  const parseVoiceCommand = (rawText: string) => {
    const text = rawText.toLowerCase().trim();
    setFeedbackMsg(`Heard: "${rawText}"`);

    // Command 1: Add Task
    if (text.includes('add task') || text.includes('add mission') || text.includes('plant seed') || text.includes('plant a task')) {
      const match = text.match(/(?:add task|add mission|plant seed|plant a task)\s+(.+)/i);
      if (match && match[1]) {
        const taskName = match[1];
        // Determine difficulty dynamically from the task name!
        const isHard = taskName.includes('hard') || taskName.includes('difficult') || taskName.includes('exam') || taskName.includes('study') || taskName.length > 15;
        const hoursNeeded = isHard ? 4 : 2;
        
        onAddTask(taskName, isHard, hoursNeeded);
        setFeedbackMsg(`SUCCESS: Added a new task "${taskName}"! 🐾`);
        return;
      }
    }

    // Command 2: Complete task
    if (text.includes('complete') || text.includes('finish') || text.includes('harvest') || text.includes('resolve')) {
      const match = text.match(/(?:complete|finish|harvest|resolve)\s+(.+)/i);
      if (match && match[1]) {
        const targetName = match[1].toLowerCase().trim();
        const found = tasks.find(t => t.name.toLowerCase().includes(targetName) && !t.completed);
        
        if (found) {
          onUpdateTask({
            ...found,
            progress: 100,
            completed: true,
            hoursLeft: 0,
            riskScore: 0,
            riskLevel: 'green'
          });
          setFeedbackMsg(`SUCCESS: Completed the task "${found.name}"! 🎉`);
        } else {
          setFeedbackMsg(`Could not find an active task matching "${targetName}".`);
        }
        return;
      }
    }

    // Command 3: Briefing / Sync
    if (text.includes('briefing') || text.includes('sync') || text.includes('update') || text.includes('weather')) {
      onRefreshBriefing();
      setFeedbackMsg('SUCCESS: Consulting the system briefing and updates...');
      return;
    }

    // Command 4: Reschedule / Optimize
    if (text.includes('reschedule') || text.includes('optimize') || text.includes('organize') || text.includes('rearrange')) {
      onTriggerMoodReschedule();
      setFeedbackMsg('WIND SUCCESS: Tilling and rearranging the garden soil...');
      return;
    }

    setFeedbackMsg("The wind chimes didn't recognize that command. Check the Wind Secrets guide below.");
  };

  return (
    <div className="rounded-2xl bg-white border border-[#F0EEFF] p-5 space-y-6 shadow-[0_8px_30px_rgb(240,238,255,0.6)] text-left">
      
      {/* Header Info */}
      <div className="flex items-start justify-between gap-2 border-b border-[#F0EEFF] pb-3">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-[#7C3AED]" />
          <div className="text-left">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#7C3AED]">Voice Deck</h3>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">WHISPER TO THE WINDS 🌱</p>
          </div>
        </div>
        <span className={`text-[9px] font-extrabold tracking-wider px-2.5 py-0.5 rounded-full border ${
          supported ? 'border-[#7C3AED]/30 bg-[#7C3AED]/10 text-[#7C3AED]' : 'border-red-200 bg-red-50 text-red-500'
        }`}>
          {supported ? 'ONLINE' : 'SLEEPING'}
        </span>
      </div>

      {!supported ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700 space-y-2">
          <Info className="w-5 h-5 text-red-500" />
          <p className="font-medium">
            Chrome or Safari voice components are absent on this device. Web Speech API is not supported in this browser.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-4 py-3">
          
          {/* Main glowing Mic Button */}
          <button
            onClick={toggleListening}
            className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 border-2 ${
              isListening
                ? 'bg-red-100 border-red-400 text-red-600 shadow-[0_0_20px_rgba(248,113,113,0.3)] animate-pulse'
                : 'bg-[#F8F7FF] border-[#F0EEFF] hover:border-[#7C3AED] text-[#1E1B2E] shadow-sm hover:shadow-[0_4px_12px_rgba(124,58,237,0.25)]'
            }`}
          >
            {isListening ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
            
            {/* Animated orbital rings while speaking */}
            {isListening && (
              <span className="absolute inset-[-10px] rounded-full border border-red-400/30 animate-ping" />
            )}
          </button>

          {/* Feedback & Transcript Panel */}
          <div className="w-full text-center space-y-2">
            {transcript && (
              <div className="bg-[#F8F7FF] border border-[#F0EEFF] rounded-xl p-3 max-w-sm mx-auto text-left">
                <p className="text-[9px] text-[#7C3AED] font-black tracking-widest uppercase mb-1">WHAT Snyx HEARD:</p>
                <p className="text-xs text-[#1E1B2E] font-sans font-extrabold italic">"{transcript}"</p>
              </div>
            )}
            
            {feedbackMsg && (
              <p className="text-xs font-black text-[#7C3AED] animate-pulse mt-2">{feedbackMsg}</p>
            )}
          </div>
        </div>
      )}

      {/* Guide Card of commands */}
      <div className="bg-[#F8F7FF] border border-[#F0EEFF] rounded-xl p-4 text-left">
        <h4 className="text-[10px] uppercase font-black tracking-widest text-[#7C3AED] mb-2 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" /> VOICE CONTROL COMMANDS
        </h4>
        <ul className="text-[10px] font-extrabold text-[#1E1B2E] opacity-70 space-y-2 list-inside list-disc uppercase tracking-wide">
          <li><span className="text-[#F59E8B] font-black">"Add task [Name]"</span> — Add a new task instantly</li>
          <li><span className="text-[#F59E8B] font-black">"Complete [Keyword]"</span> — Complete a task containing that keyword</li>
          <li><span className="text-[#F59E8B] font-black">"Briefing"</span> — Refresh your morning schedule and briefing</li>
          <li><span className="text-[#F59E8B] font-black">"Reschedule"</span> — Rearrange task schedule based on mood</li>
        </ul>
      </div>

    </div>
  );
}
