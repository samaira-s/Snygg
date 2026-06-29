import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trophy, Award, Coffee } from 'lucide-react';
import { triggerConfetti } from '../lib/confetti';

interface LevelUpCelebrationProps {
  isOpen: boolean;
  level: number;
  onClose: () => void;
}

export default function LevelUpCelebration({ isOpen, level, onClose }: LevelUpCelebrationProps) {
  React.useEffect(() => {
    if (isOpen) {
      // Trigger multiple rounds of confetti!
      triggerConfetti();
      const t1 = setTimeout(() => triggerConfetti(), 400);
      const t2 = setTimeout(() => triggerConfetti(), 800);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Dark Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0F0A2E]/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 350 } }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="bg-white border border-[#F0EEFF] rounded-[32px] p-8 md:p-10 max-w-md w-full shadow-[0_24px_70px_rgba(124,58,237,0.25)] text-center relative z-10 overflow-hidden"
          >
            {/* Ambient Background Glows */}
            <div className="absolute top-[-30%] left-[-30%] w-[80%] h-[80%] rounded-full bg-[#7C3AED]/10 blur-[60px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-[-30%] right-[-30%] w-[80%] h-[80%] rounded-full bg-[#F59E8B]/15 blur-[60px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

            <div className="space-y-6 relative z-10">
              {/* Award Badge Icon with Floating Animation */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                className="mx-auto w-24 h-24 bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] rounded-3xl flex items-center justify-center shadow-lg relative border-4 border-white"
              >
                <Award className="w-12 h-12 text-white" />
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 360, 360] }}
                  transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                  className="absolute inset-0 border border-dashed border-white/40 rounded-3xl pointer-events-none"
                />
              </motion.div>

              <div className="space-y-2">
                <span className="text-[10px] font-black tracking-[0.2em] text-[#7C3AED] uppercase bg-[#F4F2FF] px-4 py-1.5 rounded-full inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 animate-spin-slow text-[#7C3AED]" /> MILESTONE UNLOCKED
                </span>
                <h2 className="text-3xl font-black text-[#1E1B2E] tracking-tight">
                  GARDEN LEVEL UP!
                </h2>
                <p className="text-xs text-[#1E1B2E]/60 max-w-xs mx-auto leading-relaxed">
                  Your greenhouse garden is thriving and expanding into beautiful new ecosystems!
                </p>
              </div>

              {/* Big Level Badging */}
              <div className="bg-[#F8F7FF] border border-[#F0EEFF] rounded-2xl py-4 px-6 flex items-center justify-between">
                <span className="text-xs font-black text-[#1E1B2E]/50 uppercase tracking-wider">New Greenhouse Status:</span>
                <span className="text-xl font-black text-[#7C3AED] bg-white border border-[#E0DBFA] px-4 py-1.5 rounded-xl shadow-xs">
                  LVL {level}
                </span>
              </div>

              {/* Cute Mascot Greeting message */}
              <div className="bg-[#FFF8F6] border border-[#FFE8E2] rounded-2xl p-4 flex gap-3 text-left">
                <div className="text-2xl flex-shrink-0 self-center">🐾</div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-[#F59E8B] uppercase tracking-wider">SNYX CO-PILOT CHIRPS</p>
                  <p className="text-xs text-[#1E1B2E]/75 leading-relaxed font-medium">
                    "Snyx did a happy dance and brought you some warm chamomile tea! 🍵 Keep growing your beautiful daily crops."
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={onClose}
                className="w-full py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Coffee className="w-4 h-4" />
                SIP TEA & CONTINUE
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
