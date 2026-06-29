import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, LogIn, X, Info } from 'lucide-react';

interface OAuthDisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoggingIn: boolean;
}

export default function OAuthDisclaimerModal({
  isOpen,
  onClose,
  onConfirm,
  isLoggingIn,
}: OAuthDisclaimerModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0F0A2E]/60 backdrop-blur-sm"
          />

          {/* Modal box */}
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-white border border-[#F0EEFF] rounded-[28px] p-6 md:p-8 max-w-lg w-full shadow-[0_20px_50px_rgba(124,58,237,0.2)] text-left relative z-10 overflow-hidden"
          >
            {/* Soft decorative background glows */}
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#7C3AED]/5 blur-[40px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#F59E8B]/10 blur-[40px] pointer-events-none" />

            {/* Header section */}
            <div className="flex items-start justify-between gap-4 border-b border-[#F0EEFF] pb-4 mb-5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#F4F2FF] border border-[#E0DBFA] rounded-2xl text-[#7C3AED] flex-shrink-0">
                  <Shield className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#1E1B2E]">
                    Google Integration Notice
                  </h3>
                  <p className="text-[10px] font-black tracking-widest text-[#7C3AED] uppercase">
                    Security & Permissions 🐾
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-[#F8F7FF] rounded-lg text-[#1E1B2E]/40 hover:text-[#1E1B2E] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-4 text-xs text-[#1E1B2E]/80 leading-relaxed relative z-10 font-medium">
              <p>
                Snygg is requesting access to your Google Calendar and Gmail to sync your tasks and send emails on your behalf.
              </p>

              {/* Developer Screen Guide Card */}
              <div className="bg-[#FFF8F6] border border-[#FFE8E2] rounded-2xl p-4 flex gap-3 text-left">
                <div className="p-2 bg-[#F59E8B]/10 rounded-xl text-[#F59E8B] self-start flex-shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-[#F59E8B] uppercase tracking-wider">
                    IMPORTANT: Google Verification Screen
                  </p>
                  <p className="text-[11px] text-[#1E1B2E]/75 leading-relaxed">
                    This app is currently in development mode - when Google's verification screen appears, click{' '}
                    <span className="font-bold text-[#1E1B2E] bg-[#FFE8E2] px-1.5 py-0.5 rounded">
                      'Advanced'
                    </span>{' '}
                    then{' '}
                    <span className="font-bold text-[#1E1B2E] bg-[#FFE8E2] px-1.5 py-0.5 rounded">
                      'Go to Snygg'
                    </span>{' '}
                    to continue.
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-[#1E1B2E]/50">
                Your data is safe and only used within this app.
              </p>
            </div>

            {/* Actions Footer */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-[#F0EEFF] mt-6 relative z-10">
              <button
                onClick={onClose}
                className="w-full sm:w-1/3 py-3.5 border border-[#E0DBFA] hover:bg-[#F8F7FF] text-[#1E1B2E]/60 hover:text-[#1E1B2E] text-xs font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer text-center"
              >
                Go Back
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoggingIn}
                className="w-full sm:w-2/3 py-3.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                {isLoggingIn ? 'CONNECTING...' : 'I UNDERSTAND, CONTINUE'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
