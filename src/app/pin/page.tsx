'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { validatePin } from '@/lib/api';

export default function PinPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [highlightPinButtons, setHighlightPinButtons] = useState(true);
  const [pressedButton, setPressedButton] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if we have a location selected
    const location = localStorage.getItem('selected_location');
    if (!location) {
      router.push('/location');
    }
    
    // Load highlight PIN buttons setting
    const savedHighlightPinButtons = localStorage.getItem('highlight_pin_buttons');
    if (savedHighlightPinButtons !== null) {
      setHighlightPinButtons(savedHighlightPinButtons === 'true');
    }
  }, [router]);

  // Auto-submit when PIN reaches 6 digits
  useEffect(() => {
    if (pin.length === 6) {
      handlePinSubmit();
    }
  }, [pin]);

  const handlePinSubmit = async () => {
    if (pin.length !== 6) return;

    setError('');
    setLoading(true);

    try {
      const response = await validatePin(pin);
      
      if (response.error || !response.data.valid) {
        setError('Invalid PIN');
        setPin('');
        return;
      }

      localStorage.setItem('user_id', response.data.userId);
      localStorage.setItem('user_name', response.data.userName);
      router.push('/dashboard');
    } catch (err) {
      setError('An error occurred while validating the PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (key: string) => {
    if (pin.length < 6 && !loading) {
      setPin(prev => prev + key);
    }
  };

  const handleBackspace = () => {
    if (!loading) {
      setPin(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (!loading) {
      setPin('');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg relative">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-lg font-semibold text-gray-700">Authorizing...</p>
            </div>
          </div>
        )}

        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Enter PIN
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your 6-digit PIN to continue
          </p>
        </div>

        <div className="flex justify-center">
          <div className="w-48 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl tracking-widest">
              {pin.padEnd(6, '•').split('').join(' ')}
            </span>
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm text-center">{error}</div>
        )}

        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              onMouseDown={() => highlightPinButtons && setPressedButton(num.toString())}
              onMouseUp={() => setPressedButton(null)}
              onMouseLeave={() => setPressedButton(null)}
              onTouchStart={() => highlightPinButtons && setPressedButton(num.toString())}
              onTouchEnd={() => setPressedButton(null)}
              disabled={loading}
              className={`p-4 text-2xl font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all ${
                highlightPinButtons && pressedButton === num.toString()
                  ? 'bg-green-500 text-white transform scale-95'
                  : 'bg-gray-100 hover:bg-gray-200'
              } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            onMouseDown={() => highlightPinButtons && setPressedButton('clear')}
            onMouseUp={() => setPressedButton(null)}
            onMouseLeave={() => setPressedButton(null)}
            onTouchStart={() => highlightPinButtons && setPressedButton('clear')}
            onTouchEnd={() => setPressedButton(null)}
            disabled={loading}
            className={`p-4 text-lg font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all ${
              highlightPinButtons && pressedButton === 'clear'
                ? 'bg-green-500 text-white transform scale-95'
                : 'bg-gray-100 hover:bg-gray-200'
            } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            Clear
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            onMouseDown={() => highlightPinButtons && setPressedButton('0')}
            onMouseUp={() => setPressedButton(null)}
            onMouseLeave={() => setPressedButton(null)}
            onTouchStart={() => highlightPinButtons && setPressedButton('0')}
            onTouchEnd={() => setPressedButton(null)}
            disabled={loading}
            className={`p-4 text-2xl font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all ${
              highlightPinButtons && pressedButton === '0'
                ? 'bg-green-500 text-white transform scale-95'
                : 'bg-gray-100 hover:bg-gray-200'
            } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            onMouseDown={() => highlightPinButtons && setPressedButton('backspace')}
            onMouseUp={() => setPressedButton(null)}
            onMouseLeave={() => setPressedButton(null)}
            onTouchStart={() => highlightPinButtons && setPressedButton('backspace')}
            onTouchEnd={() => setPressedButton(null)}
            disabled={loading}
            className={`p-4 text-lg font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all ${
              highlightPinButtons && pressedButton === 'backspace'
                ? 'bg-green-500 text-white transform scale-95'
                : 'bg-gray-100 hover:bg-gray-200'
            } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            ←
          </button>
        </div>
      </div>
    </main>
  );
} 