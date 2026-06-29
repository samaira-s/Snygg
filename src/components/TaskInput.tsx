import React, { useState } from 'react';
import { Leaf, Calendar, Clock, Sparkles, Sprout, Check } from 'lucide-react';
import { type Task } from '../types';

interface TaskInputProps {
  onAddTask: (task: Task) => void;
}

export default function TaskInput({ onAddTask }: TaskInputProps) {
  const [name, setName] = useState<string>('');
  const [deadline, setDeadline] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [hoursNeeded, setHoursNeeded] = useState<number>(2);
  const [progress, setProgress] = useState<number>(0);
  const [isHard, setIsHard] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    setSubmitting(true);
    let risk = calculateRisk(deadline, progress);
    let riskLevel: 'red' | 'amber' | 'green' = risk >= 70 ? 'red' : risk >= 40 ? 'amber' : 'green';
    let intel = undefined;

    try {
      const [riskRes, intelRes] = await Promise.all([
        fetch('/api/calculate-risk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, deadline, hoursNeeded, progress }),
        }).catch(() => null),
        fetch('/api/intel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        }).catch(() => null)
      ]);

      if (riskRes && riskRes.ok) {
        const riskData = await riskRes.json();
        if (riskData.riskLevel) {
          risk = riskData.riskScore;
          riskLevel = riskData.riskLevel;
        }
      }

      if (intelRes && intelRes.ok) {
        intel = await intelRes.json();
      }
    } catch (err) {
      console.log('Status: Utilizing local backup heuristic.');
    }

    const newTask: Task = {
      id: Math.random().toString(36).substring(7),
      name,
      deadline,
      hoursNeeded,
      hoursLeft: Math.max(0, Number((hoursNeeded * (1 - progress / 100)).toFixed(1))),
      progress,
      riskScore: risk,
      riskLevel,
      durationMinutes: isHard ? 50 : 25,
      isHard,
      completed: progress === 100,
      intel,
    };

    onAddTask(newTask);

    // Reset fields
    setName('');
    setHoursNeeded(2);
    setProgress(0);
    setIsHard(false);
    setSubmitting(false);
  };

  const calculateRisk = (deadlineStr: string, currentProgress: number): number => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const deadlineDate = new Date(deadlineStr);
    deadlineDate.setHours(0,0,0,0);
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let deadlineRisk = 0;
    if (diffDays <= 0) deadlineRisk = 100;
    else if (diffDays === 1) deadlineRisk = 90;
    else if (diffDays === 2) deadlineRisk = 75;
    else if (diffDays <= 4) deadlineRisk = 50;
    else deadlineRisk = 20;

    const progressDeficit = 100 - currentProgress;
    return Math.min(100, Math.round((deadlineRisk * 0.6) + (progressDeficit * 0.4)));
  };

  return (
    <div className="rounded-2xl bg-white border border-[#F0EEFF] p-6 space-y-4 shadow-[0_8px_30px_rgb(240,238,255,0.6)]">
      
      {/* Form Title banner */}
      <div className="flex items-center gap-2 border-b border-[#F0EEFF] pb-3">
        <Leaf className="w-5 h-5 text-[#7C3AED]" />
        <div className="text-left">
          <h3 className="text-xs font-black text-[#7C3AED] tracking-widest uppercase">Create a Task</h3>
          <p className="text-[10px] text-slate-400 font-extrabold uppercase">ADD A NEW TASK TO YOUR SCHEDULE</p>
        </div>
      </div>

      {/* Main form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Seed Name */}
        <div className="space-y-1 text-left">
          <label className="text-[10px] text-slate-400 font-extrabold tracking-widest uppercase">Task Name / Description:</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Draft design proposal or review documentation..."
            className="w-full bg-white border border-[#F0EEFF] rounded-xl px-4 py-3 text-xs text-[#1E1B2E] placeholder-slate-400 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/10 font-sans transition-all"
          />
        </div>

        {/* Inputs row: Deadline, Hours, Difficulty */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Harvest Deadline */}
          <div className="space-y-1 text-left">
            <label className="text-[10px] text-slate-400 font-extrabold tracking-widest uppercase flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#F59E8B]" /> Due Date:
            </label>
            <input
              type="date"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-white border border-[#F0EEFF] rounded-xl px-3 py-2.5 text-xs text-[#1E1B2E] focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/10 transition-all"
            />
          </div>

          {/* Hours Needed */}
          <div className="space-y-1 text-left">
            <label className="text-[10px] text-slate-400 font-extrabold tracking-widest uppercase flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#7C3AED]" /> Hours:
            </label>
            <input
              type="number"
              min="1"
              max="24"
              required
              value={hoursNeeded}
              onChange={(e) => setHoursNeeded(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-white border border-[#F0EEFF] rounded-xl px-3 py-2.5 text-xs text-[#1E1B2E] focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/10 transition-all"
            />
          </div>

          {/* Hardy Crop toggle */}
          <div className="flex items-center justify-start sm:justify-center pt-3 sm:pt-5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isHard}
                onChange={(e) => setIsHard(e.target.checked)}
                className="rounded border-[#E0DBFA] bg-white text-[#7C3AED] focus:ring-[#7C3AED]/20 w-4 h-4 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 font-black tracking-widest uppercase flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-[#10B981]" /> High Priority 🔥
              </span>
            </label>
          </div>
        </div>

        {/* Start Progress */}
        <div className="space-y-1 text-left">
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-extrabold tracking-widest uppercase">
            <span>Current Progress:</span>
            <span className="text-[#7C3AED] font-black">{progress}%</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="99"
              value={progress}
              onChange={(e) => setProgress(parseInt(e.target.value))}
              className="flex-1 accent-[#7C3AED] bg-[#F0EEFF] h-1.5 rounded-full appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-xs font-black uppercase tracking-wider text-white rounded-xl transition-all shadow-[0_4px_14px_rgba(124,58,237,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Leaf className="w-4 h-4" />
          {submitting ? 'Adding task...' : 'Add Task 🐾'}
        </button>
      </form>
    </div>
  );
}
