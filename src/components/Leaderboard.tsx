import React, { useState } from 'react';
import { Trophy, Award, Target, Sun, CheckCircle, ChevronRight, Sparkles, Sprout, ShieldAlert } from 'lucide-react';
import { type Badge, type Challenge, type FriendRank } from '../types';

interface LeaderboardProps {
  friends: FriendRank[];
  badges: Badge[];
  challenges: Challenge[];
  onClaimChallenge: (id: string, xp: number) => void;
  myJoinCode?: string;
  onAddFriend?: (code: string) => boolean;
}

export default function Leaderboard({
  friends,
  badges,
  challenges,
  onClaimChallenge,
  myJoinCode = '345892',
  onAddFriend,
}: LeaderboardProps) {
  const [friendCodeInput, setFriendCodeInput] = useState('');

  const handleInviteFriends = () => {
    const shareUrl = `${window.location.origin}/?join=${myJoinCode}`;
    navigator.clipboard.writeText(shareUrl);
    alert(`Invite link copied to clipboard! ✓\nShare this join URL with friends:\n${shareUrl}`);
  };

  const handleJoinSubmit = () => {
    if (friendCodeInput.length !== 6 || isNaN(Number(friendCodeInput))) {
      alert('Please enter a valid 6-digit room or pilot join code.');
      return;
    }
    if (onAddFriend) {
      const success = onAddFriend(friendCodeInput);
      if (success) {
        setFriendCodeInput('');
      }
    } else {
      alert('Pilot added successfully! (Offline mode simulation)');
      setFriendCodeInput('');
    }
  };
  
  // Sort friends by XP descending (Seeds)
  const sortedFriends = [...friends].sort((a, b) => b.xp - a.xp);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Column 1 & 2: Leaderboard & Weekly Quests */}
      <div className="lg:col-span-2 space-y-6">

        {/* Invite & Connect card */}
        <div className="rounded-2xl bg-white border border-[#F0EEFF] p-5 shadow-[0_8px_30px_rgb(240,238,255,0.6)] space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-[#F0EEFF] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#7C3AED]" />
              <div>
                <h3 className="text-xs font-black text-[#7C3AED] tracking-widest uppercase font-sans">Pilot Network</h3>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase">COOPERATIVE MULTIPLAYER DECK</p>
              </div>
            </div>
            <span className="text-[10px] font-black text-[#7C3AED] bg-[#F0EEFF] px-2 py-0.5 rounded uppercase">
              {friends.filter(f => !f.isMe).length} friends focusing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Invite Button Section */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Invite Friends</label>
              <div className="flex gap-2">
                <div className="bg-[#F8F7FF] border border-[#F0EEFF] px-3 py-2 rounded-xl font-mono text-xs font-bold text-[#7C3AED] flex-1 flex items-center justify-between shadow-xs">
                  <span>{myJoinCode}</span>
                  <span className="text-[9px] uppercase font-black text-slate-300">My Code</span>
                </div>
                <button
                  onClick={handleInviteFriends}
                  className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Invite
                </button>
              </div>
            </div>

            {/* Enter Code Section */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Enter Friend's Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="6-Digit Join Code"
                  value={friendCodeInput}
                  onChange={(e) => setFriendCodeInput(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 bg-white border border-[#F0EEFF] px-3 py-2 rounded-xl text-xs font-bold text-[#1E1B2E] placeholder-slate-400 focus:outline-none focus:border-[#7C3AED] shadow-xs"
                />
                <button
                  onClick={handleJoinSubmit}
                  className="px-4 py-2 bg-white border border-[#F0EEFF] text-[#7C3AED] hover:bg-[#F0EEFF] text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs border-dashed"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
          <div className="text-[9px] text-[#1E1B2E]/50 font-black uppercase tracking-wider">
            🌱 {friends.filter(f => !f.isMe).length} friends using Snygg. Invite others to grow your leaderboard!
          </div>
        </div>
        
        {/* Friends XP Rank Leaderboard (Leaderboard) */}
        <div className="rounded-2xl bg-white border border-[#F0EEFF] p-5 shadow-[0_8px_30px_rgb(240,238,255,0.6)]">
          <div className="flex items-center justify-between border-b border-[#F0EEFF] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#F59E8B]" />
              <div className="text-left">
                <h3 className="text-xs font-black text-[#7C3AED] tracking-widest uppercase">Leaderboard</h3>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase">COOPERATIVE PERFORMANCE RANKS</p>
              </div>
            </div>
            <span className="text-[10px] font-black text-[#7C3AED] uppercase">Seeds Barn</span>
          </div>

          <div className="space-y-2.5">
            {sortedFriends.map((friend, idx) => {
              const rank = idx + 1;
              const isMe = friend.isMe;
              
              // Custom colors for top ranks
              const rankLabel = 
                rank === 1 ? '🥇 1st' : rank === 2 ? '🥈 2nd' : rank === 3 ? '🥉 3rd' : `#${rank}`;
              
              const rankColor = 
                rank === 1 
                  ? 'text-[#1E1B2E] font-black' 
                  : rank === 2 
                    ? 'text-slate-400 font-black' 
                    : rank === 3 
                      ? 'text-[#1E1B2E] font-black' 
                      : 'text-slate-400 font-bold';

              const cardBorder = 
                isMe 
                  ? 'bg-[#F0EEFF] border-[#7C3AED] shadow-sm' 
                  : 'bg-white border-[#F0EEFF] hover:border-[#7C3AED]/40';

              return (
                <div
                  key={friend.id}
                  className={`rounded-xl border p-3 flex items-center justify-between transition-all duration-300 ${cardBorder}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank indicator */}
                    <div className={`w-12 text-left text-xs font-semibold ${rankColor}`}>
                      {rankLabel}
                    </div>
                    {/* Avatar */}
                    {friend.avatar ? (
                      <img
                        src={friend.avatar}
                        alt={friend.name}
                        className="w-8 h-8 rounded-full border border-[#F0EEFF] object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#F0EEFF] border border-[#E0DBFA] flex items-center justify-center text-xs font-extrabold text-[#7C3AED]">
                        {friend.name[0].toUpperCase()}
                      </div>
                    )}
                    {/* User info */}
                    <div className="text-left">
                      <div className="text-xs font-bold text-[#1E1B2E] flex items-center gap-1.5">
                        {isMe ? 'You (Gardener)' : friend.name}
                        {isMe && <span className="text-[9px] bg-[#7C3AED] text-white px-1.5 py-0.2 rounded font-black uppercase tracking-wider">Me</span>}
                      </div>
                      <div className="text-[9px] text-[#1E1B2E]/50 font-extrabold uppercase">Harvest Level {friend.level}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Streak indicator (Sunny Days) */}
                    <div className="flex items-center gap-1 text-[10px] text-[#F59E8B] font-black" title="Sunny Days Streak">
                      <Sun className="w-3.5 h-3.5 text-[#F59E8B] animate-pulse" />
                      {friend.streak}D
                    </div>
                    {/* Seeds display */}
                    <div className="text-right">
                      <div className="text-xs font-black text-[#1E1B2E]">{friend.xp.toLocaleString()}</div>
                      <div className="text-[8px] text-[#7C3AED] font-black uppercase tracking-wider">Seeds</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly Quests (Weekly Harvest Quests) */}
        <div className="rounded-2xl bg-white border border-[#F0EEFF] p-5 shadow-[0_8px_30px_rgb(240,238,255,0.6)]">
          <div className="flex items-center gap-2 border-b border-[#F0EEFF] pb-3 mb-4">
            <Target className="w-5 h-5 text-[#7C3AED]" />
            <div className="text-left">
              <h3 className="text-xs font-black text-[#7C3AED] tracking-widest uppercase">Weekly Harvest Quests</h3>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase">COMMUNITY AND INDIVIDUAL EFFORTS</p>
            </div>
          </div>

          <div className="space-y-3.5">
            {challenges.map((quest) => {
              const questProgress = Math.min(100, Math.floor((quest.progress / quest.goal) * 100));
              const isFinished = quest.progress >= quest.goal;

              // Map default titles to cozy ones
              let cozyTitle = quest.title;
              if (quest.id === 'clear_sector') cozyTitle = '🌿 Weed the Cabbage Beds';
              if (quest.id === 'focus_pods') cozyTitle = '🌾 Focus Arena Flow Sessions';
              if (quest.id === 'neural_cal') cozyTitle = '🌸 Tender daily Journal Entries';

              return (
                <div key={quest.id} className="rounded-xl bg-[#F8F7FF] border border-[#F0EEFF] p-3.5 text-left space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-[#1E1B2E] flex items-center gap-1.5">{cozyTitle}</h4>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase">{quest.description}</p>
                    </div>
                    {quest.completed ? (
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-[#ECFDF5] border border-emerald-200 text-[#10B981] rounded-md">
                        CLAIMED
                      </span>
                    ) : isFinished ? (
                      <button
                        onClick={() => onClaimChallenge(quest.id, quest.xpReward)}
                        className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 bg-[#10B981] hover:bg-[#059669] text-white rounded-md cursor-pointer transition-all shadow-sm"
                      >
                        CLAIM +{quest.xpReward} SEEDS
                      </button>
                    ) : (
                      <span className="text-[9px] font-black text-[#7C3AED] bg-[#F0EEFF] px-2 py-0.5 rounded-lg">
                        {quest.progress} / {quest.goal}
                      </span>
                    )}
                  </div>

                  {/* Quest Progress bar */}
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-[#F0EEFF]">
                      <div
                        className="h-full bg-[#7C3AED] transition-all duration-300"
                        style={{ width: `${questProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Column 3: Badge Accomplishments */}
      <div className="rounded-2xl bg-white border border-[#F0EEFF] p-5 flex flex-col justify-between shadow-[0_8px_30px_rgb(240,238,255,0.6)]">
        <div>
          <div className="flex items-center gap-2 border-b border-[#F0EEFF] pb-3 mb-4">
            <Award className="w-5 h-5 text-[#F59E8B]" />
            <div className="text-left">
              <h3 className="text-xs font-black text-[#7C3AED] tracking-widest uppercase">Garden Badges</h3>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase">ACCLAIMED GREENHOUSE MILESTONES</p>
            </div>
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-2 gap-3">
            {badges.map((badge) => {
              // Custom map default badge names
              let cozyBadgeName = badge.name;
              let cozyEmoji = "🌸";
              if (badge.id === 'ignition') { cozyBadgeName = 'First Sprout'; cozyEmoji = '🌱'; }
              if (badge.id === 'streak_3') { cozyBadgeName = 'Sunbeam Streak'; cozyEmoji = '☀️'; }
              if (badge.id === 'apex_focus') { cozyBadgeName = 'Quiet Solitude'; cozyEmoji = '🏡'; }
              if (badge.id === 'gmail_autonomous') { cozyBadgeName = 'Carrier Pigeon'; cozyEmoji = '🕊️'; }

              return (
                <div
                  key={badge.id}
                  className={`rounded-xl border p-3 flex flex-col items-center justify-center text-center space-y-1.5 transition-all duration-300 ${
                    badge.unlocked 
                      ? 'bg-white border-[#7C3AED] shadow-sm' 
                      : 'bg-slate-50 border-slate-100 opacity-40 filter grayscale'
                  }`}
                  title={badge.description}
                >
                  <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[#F0EEFF] border border-[#E0DBFA]">
                    <span className="text-lg">{cozyEmoji}</span>
                  </div>
                  <div className="text-center space-y-0.5">
                    <h4 className="text-[10px] font-black text-[#1E1B2E] line-clamp-1">{cozyBadgeName}</h4>
                    <p className="text-[8px] text-[#F59E8B] font-black tracking-wider">
                      {badge.unlocked ? 'BLOOMED' : 'BUD'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[9px] text-slate-300 font-black mt-6 text-right uppercase tracking-wider">Secure Farm Records</p>
      </div>

    </div>
  );
}
