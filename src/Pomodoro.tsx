import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const isExtensionEnvironment = !!chrome?.storage;

export default function Pomodoro() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [isSession, setIsSession] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isExtensionEnvironment) {
      chrome.storage.local.get(
        [
          'timeLeft',
          'isRunning',
          'sessionDuration',
          'breakDuration',
          'isSession',
          'isDarkMode',
        ],
        (result) => {
          setTimeLeft(result.timeLeft ?? sessionDuration * 60);
          setIsRunning(result.isRunning ?? false);
          setSessionDuration(result.sessionDuration ?? 25);
          setBreakDuration(result.breakDuration ?? 5);
          setIsSession(result.isSession ?? true);
          setIsDarkMode(result.isDarkMode ?? false);
        }
      );

      const intervalId = setInterval(() => {
        chrome.storage.local.get(
          ['timeLeft', 'isRunning', 'isSession'],
          (result) => {
            setTimeLeft(result.timeLeft);
            setIsRunning(result.isRunning);
            setIsSession(result.isSession);
          }
        );
      }, 1000);

      return () => clearInterval(intervalId);
    } else {
      let interval: NodeJS.Timeout | null = null;
      if (isRunning && timeLeft > 0) {
        interval = setInterval(() => {
          setTimeLeft((prevTime) => prevTime - 1);
        }, 1000);
      } else if (timeLeft === 0) {
        setIsRunning(false);
        setIsSession(!isSession);
        setTimeLeft(isSession ? breakDuration * 60 : sessionDuration * 60);
        playSound(isSession ? 'break' : 'session');
      }
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [isRunning, timeLeft, sessionDuration, breakDuration, isSession]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  };

  const handleStartPause = () => {
    if (isExtensionEnvironment) {
      chrome.runtime.sendMessage({
        action: isRunning ? 'pauseTimer' : 'startTimer',
      });
    } else {
      setIsRunning(!isRunning);
    }
  };

  const handleReset = () => {
    if (isExtensionEnvironment) {
      chrome.runtime.sendMessage({ action: 'resetTimer' });
    } else {
      setTimeLeft(sessionDuration * 60);
      setIsRunning(false);
      setIsSession(true);
    }
  };

  const handleSessionDurationChange = (value: number) => {
    setSessionDuration(value);
    if (isSession && !isRunning) {
      setTimeLeft(value * 60);
    }
    if (isExtensionEnvironment) {
      chrome.storage.local.set({ sessionDuration: value });
    }
  };

  const handleBreakDurationChange = (value: number) => {
    setBreakDuration(value);
    if (!isSession && !isRunning) {
      setTimeLeft(value * 60);
    }
    if (isExtensionEnvironment) {
      chrome.storage.local.set({ breakDuration: value });
    }
  };

  const calculateProgress = () => {
    const totalTime = isSession ? sessionDuration * 60 : breakDuration * 60;
    return ((totalTime - timeLeft) / totalTime) * 100;
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (isExtensionEnvironment) {
      chrome.storage.local.set({ isDarkMode: !isDarkMode });
    }
  };

  const playSound = (type: 'session' | 'break') => {
    const audio = new Audio(
      type === 'session' ? 'session-end.mp3' : 'break-end.mp3'
    );
    audio.play();
  };

  return (
    <div
      className={`flex items-center justify-center min-h-screen transition-colors duration-300 w-screen ${
        isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-blue-50 text-blue-900'
      }`}
    >
      <div
        className={`relative flex flex-col items-center p-8 rounded-2xl shadow-lg ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <button
          onClick={toggleDarkMode}
          className={`absolute top-2 right-2 w-12 h-6 rounded-full p-1 transition-colors duration-500 ${
            isDarkMode ? 'bg-blue-500' : 'bg-yellow-300'
          }`}
          aria-label={
            isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'
          }
        >
          <motion.div
            className="w-4 h-4 rounded-full bg-white shadow-md flex items-center justify-center"
            animate={{ x: isDarkMode ? 24 : 0 }}
            transition={{ type: 'spring', stiffness: 700, damping: 30 }}
          >
            <span className="text-xs" aria-hidden="true">
              {isDarkMode ? '🌙' : '☀️'}
            </span>
          </motion.div>
        </button>
        <div className="relative w-64 h-64 mb-8">
          <svg
            className="w-full h-full transform -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              className={isDarkMode ? 'text-gray-700' : 'text-blue-100'}
              strokeWidth="4"
              stroke="currentColor"
              fill="transparent"
              r="48"
              cx="50"
              cy="50"
            />
            <circle
              className={isDarkMode ? 'text-blue-500' : 'text-blue-500'}
              strokeWidth="4"
              strokeDasharray="301.59"
              strokeDashoffset={301.59 - (calculateProgress() / 100) * 301.59}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="48"
              cx="50"
              cy="50"
            />
          </svg>
          <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
            <span className="text-4xl font-bold">{formatTime(timeLeft)}</span>
            <span className="text-lg font-medium mt-2">
              {isSession ? 'Session' : 'Break'}
            </span>
          </div>
        </div>
        <div className="flex space-x-4 mb-8">
          <button
            onClick={handleStartPause}
            className={`font-bold py-2 px-6 rounded-full transition duration-200 ${
              isDarkMode
                ? isRunning
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-gray-900'
                  : 'bg-green-600 hover:bg-green-700 text-white'
                : isRunning
                ? 'bg-yellow-400 hover:bg-yellow-500 text-gray-900'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button
            onClick={handleReset}
            className={`font-bold py-2 px-6 rounded-full transition duration-200 ${
              isDarkMode
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            Reset
          </button>
        </div>
        <div className="flex space-x-8">
          <div className="flex flex-col items-center">
            <label htmlFor="sessionDuration" className="mb-2 font-medium">
              Session Duration
            </label>
            <input
              id="sessionDuration"
              type="number"
              min="1"
              max="60"
              value={sessionDuration}
              onChange={(e) =>
                handleSessionDurationChange(parseInt(e.target.value))
              }
              className={`w-16 text-center rounded-md p-1 ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            />
          </div>
          <div className="flex flex-col items-center">
            <label htmlFor="breakDuration" className="mb-2 font-medium">
              Break Duration
            </label>
            <input
              id="breakDuration"
              type="number"
              min="1"
              max="60"
              value={breakDuration}
              onChange={(e) =>
                handleBreakDurationChange(parseInt(e.target.value))
              }
              className={`w-16 text-center rounded-md p-1 ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
