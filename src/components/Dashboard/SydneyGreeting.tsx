import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

// Sydney Avatar Component
const SydneyAvatar = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`${className} bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center`}>
    <svg viewBox="0 0 24 24" fill="none" className="w-3/4 h-3/4 text-white">
      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2Z" fill="currentColor"/>
      <path d="M21 9V7L15 1H5C3.89 1 3 1.89 3 3V7H1V9H3V15C3 16.1 3.9 17 5 17V19C5 20.1 5.9 21 7 21H9C10.1 21 11 20.1 11 19V17H13V19C13 20.1 13.9 21 15 21H17C18.1 21 19 20.1 19 19V17C20.1 17 21 16.1 21 15V9H21ZM7 3H15L19 7V15H5V3H7Z" fill="currentColor"/>
    </svg>
  </div>
);

interface SydneyGreetingProps {
  userName?: string;
}

const SydneyGreeting: React.FC<SydneyGreetingProps> = ({ userName }) => {
  // Create a stable greeting that doesn't change on re-renders
  const greeting = useMemo(() => {
    // Create a stable seed based on the current day and user to ensure greeting stays same for the day
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const userSeed = userName ? userName.length : 0;
    const seed = dayOfYear + userSeed;
    
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth();
    const day = now.getDate();

    let timeGreeting = '';
    
    // Special creative greetings for very late/early hours (2-4 AM)
    if (hour >= 2 && hour <= 4) {
      const nightOwlGreetings = [
        `Hello night owl${userName ? ` ${userName}` : ''}! 🦉 Still hunting for those perfect trades?`,
        `Hey there, midnight trader${userName ? ` ${userName}` : ''}! 🌙 The markets never sleep, and neither do you!`,
        `Burning the midnight oil${userName ? `, ${userName}` : ''}? ⭐ Let's make these late-night hours count!`,
        `Wide awake${userName ? ` ${userName}` : ''}? 🌃 Perfect time for some deep market analysis!`,
        `Early bird or night owl${userName ? `, ${userName}` : ''}? 🌅 Either way, I'm here to help with your trading!`
      ];
      return nightOwlGreetings[seed % nightOwlGreetings.length];
    }
    
    // Regular time-based greetings
    if (hour >= 5 && hour < 12) {
      timeGreeting = 'Good morning';
    } else if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good afternoon';
    } else if (hour >= 17 && hour < 22) {
      timeGreeting = 'Good evening';
    } else {
      // Late night (22-1 AM)
      const lateNightGreetings = [
        `Good evening${userName ? ` ${userName}` : ''}! 🌙 Trading into the night?`,
        `Hey there${userName ? ` ${userName}` : ''}! 🌃 Late night trading session?`,
        `Evening${userName ? ` ${userName}` : ''}! 🌆 Perfect time to review today's trades!`
      ];
      return lateNightGreetings[seed % lateNightGreetings.length];
    }

    let holidayGreeting = '';
    // Christmas
    if (month === 11 && day === 25) {
      holidayGreeting = '🎄 Merry Christmas! ';
    }
    // New Year
    else if (month === 0 && day === 1) {
      holidayGreeting = '🎉 Happy New Year! ';
    }
    // Halloween
    else if (month === 9 && day === 31) {
      holidayGreeting = '🎃 Happy Halloween! ';
    }

    const name = userName ? ` ${userName}` : '';
    const greetings = [
      `${holidayGreeting}${timeGreeting}${name}! How's your trading going today?`,
      `${holidayGreeting}${timeGreeting}${name}! Ready to analyze some trades?`,
      `${holidayGreeting}${timeGreeting}${name}! What's on your trading radar today?`,
      `${holidayGreeting}${timeGreeting}${name}! Any exciting market moves catching your eye?`,
      `${holidayGreeting}${timeGreeting}${name}! I'm here to help with your trading analysis!`
    ];
    
    // Use seed to pick a stable greeting for the day
    return greetings[seed % greetings.length];
  }, [userName]); // Only recalculate if userName changes

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-xl p-4 mb-6"
    >
      <div className="flex items-center space-x-3">
        <SydneyAvatar />
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-purple-400 font-medium text-sm">Sydney</span>
            <span className="text-slate-500 text-xs">•</span>
            <span className="text-slate-400 text-xs">AI Assistant</span>
          </div>
          <p className="text-slate-200 text-sm mt-1 font-medium">{greeting}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default SydneyGreeting;