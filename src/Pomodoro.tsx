import React, { useState, useEffect } from 'react';

const isExtensionEnvironment = !!chrome?.storage;

const Pomodoro: React.FC = () => {
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
      <div className="flex flex-col items-center p-8 rounded-lg shadow-lg bg-opacity-50 backdrop-filter backdrop-blur-lg">
        <button
          onClick={toggleDarkMode}
          className={`absolute top-4 right-2 px-2 py-1 rounded-full transition-colors duration-300 cursor-pointer ${
            isDarkMode
              ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-300'
              : 'bg-gray-700 text-yellow-400 hover:bg-gray-600'
          }`}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        <div className="relative w-64 h-64 mb-8">
          <svg
            className="w-full h-full transform -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              className={`${isDarkMode ? 'text-gray-700' : 'text-blue-200'}`}
              strokeWidth="4"
              stroke="currentColor"
              fill="transparent"
              r="48"
              cx="50"
              cy="50"
            />
            <circle
              className={`${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`}
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
            <span className="text-lg">{isSession ? 'Session' : 'Break'}</span>
          </div>
        </div>
        <div className="flex space-x-4 mb-8">
          <button
            onClick={handleStartPause}
            className={`font-bold py-2 px-4 rounded-full transition duration-200 ${
              isDarkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button
            onClick={handleReset}
            className={`font-bold py-2 px-4 rounded-full transition duration-200 ${
              isDarkMode
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-red-400 hover:bg-red-500 text-white'
            }`}
          >
            Reset
          </button>
        </div>
        <div className="flex space-x-8">
          <div className="flex flex-col items-center">
            <label htmlFor="sessionDuration" className="mb-2">
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
                  ? 'bg-gray-700 border-gray-600'
                  : 'bg-blue-100 border-blue-300'
              }`}
            />
          </div>
          <div className="flex flex-col items-center">
            <label htmlFor="breakDuration" className="mb-2">
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
                  ? 'bg-gray-700 border-gray-600'
                  : 'bg-blue-100 border-blue-300'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pomodoro;
