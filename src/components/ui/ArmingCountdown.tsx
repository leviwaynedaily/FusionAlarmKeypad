'use client';

import { useState, useEffect } from 'react';

interface ArmingCountdownProps {
  isVisible: boolean;
  initialSeconds: number;
  zoneName: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function ArmingCountdown({ 
  isVisible, 
  initialSeconds, 
  zoneName, 
  onComplete, 
  onCancel 
}: ArmingCountdownProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (isVisible && initialSeconds > 0) {
      setRemainingSeconds(initialSeconds);
      setIsActive(true);
    } else {
      setIsActive(false);
    }
  }, [isVisible, initialSeconds]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isActive && remainingSeconds > 0) {
      intervalId = setInterval(() => {
        setRemainingSeconds(time => {
          if (time <= 1) {
            setIsActive(false);
            onComplete();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isActive, remainingSeconds, onComplete]);

  const progressPercentage = ((initialSeconds - remainingSeconds) / initialSeconds) * 100;

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
      <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Arming {zoneName}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Please exit the area and close all doors
          </p>
        </div>

        {/* Countdown Circle */}
        <div className="relative w-32 h-32 mx-auto mb-6">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128">
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 56}`}
              strokeDashoffset={`${2 * Math.PI * 56 * (1 - progressPercentage / 100)}`}
              className="text-amber-500 transition-all duration-1000 ease-linear"
              strokeLinecap="round"
            />
          </svg>
          {/* Countdown number */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">
              {remainingSeconds}
            </span>
          </div>
        </div>

        {/* Exit Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Exit Now
            </p>
          </div>
          <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
            <li>• Close all doors and windows</li>
            <li>• Exit through the designated exit</li>
            <li>• System will arm when countdown reaches zero</li>
          </ul>
        </div>

        {/* Cancel Button */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel Arming
          </button>
          
          {/* Optional: Immediate arm button */}
          <button
            onClick={onComplete}
            className="px-4 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors whitespace-nowrap"
          >
            Arm Now
          </button>
        </div>

        {/* Progress indicator */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-amber-500 h-1.5 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}