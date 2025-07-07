import React, { useEffect } from 'react';

interface PinEntryProps {
  pin: string;
  isProcessing: boolean;
  error: string;
  useDesign2: boolean;
  highlightPinButtons: boolean;
  pressedButton: string | null;
  onPinKeyPress: (digit: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  onPressedButtonChange: (button: string | null) => void;
}

export function PinEntry({
  pin,
  isProcessing,
  error,
  useDesign2,
  highlightPinButtons,
  pressedButton,
  onPinKeyPress,
  onClear,
  onBackspace,
  onPressedButtonChange,
}: PinEntryProps) {
  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isProcessing) return;

      const key = event.key;
      
      // Handle number keys (0-9)
      if (/^[0-9]$/.test(key)) {
        if (highlightPinButtons) {
          onPressedButtonChange(key);
        }
        onPinKeyPress(key);
      }
      // Handle backspace
      else if (key === 'Backspace') {
        if (highlightPinButtons) {
          onPressedButtonChange('backspace');
        }
        onBackspace();
      }
      // Handle Enter key for clear (alternative to Clear button)
      else if (key === 'Enter' && pin.length === 0) {
        if (highlightPinButtons) {
          onPressedButtonChange('clear');
        }
        onClear();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (highlightPinButtons) {
        const key = event.key;
        if (/^[0-9]$/.test(key) || key === 'Backspace' || (key === 'Enter' && pin.length === 0)) {
          onPressedButtonChange(null);
        }
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isProcessing, highlightPinButtons, onPinKeyPress, onBackspace, onClear, onPressedButtonChange, pin.length]);

  const handleButtonPress = (value: string) => {
    if (highlightPinButtons) {
      onPressedButtonChange(value);
    }
  };

  const handleButtonRelease = () => {
    if (highlightPinButtons) {
      onPressedButtonChange(null);
    }
  };

  const handleButtonClick = (action: () => void, value?: string) => {
    if (value && highlightPinButtons) {
      onPressedButtonChange(value);
      // Clear the highlight after a short delay
      setTimeout(() => onPressedButtonChange(null), 150);
    }
    action();
  };

  return (
    <div className="max-w-xs w-full mx-auto">
      {!useDesign2 && (
        <h2 className="text-xl font-semibold text-center text-gray-900 dark:text-white mb-6">
          Enter PIN to Access
        </h2>
      )}

      {/* PIN Display */}
      <div className="mb-6">
        {useDesign2 ? (
          <div className="flex justify-center gap-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full border-2 transition-all ${
                  pin[i] 
                    ? 'bg-[#22c55f] border-[#22c55f]' 
                    : 'bg-transparent border-gray-400 dark:border-gray-600'
                }`}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`h-10 rounded-lg flex items-center justify-center text-xl font-bold border-2 transition-all ${
                  pin[i] 
                    ? 'bg-[#22c55f] border-[#22c55f] text-white' 
                    : 'bg-gray-100 dark:bg-[#161c25] border-gray-300 dark:border-gray-800'
                }`}
              >
                {pin[i] ? '•' : ''}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-rose-500/90 rounded-lg text-white text-center backdrop-blur-sm shadow-lg">
          <p className="font-medium text-sm">Authentication Failed</p>
          <p className="text-xs opacity-90">Please try again</p>
        </div>
      )}

      {/* PIN Pad */}
      <div className={`grid grid-cols-3 ${useDesign2 ? 'gap-1' : 'gap-2'}`}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleButtonClick(() => { onPinKeyPress(num.toString()); }, num.toString())}
            onMouseDown={() => handleButtonPress(num.toString())}
            onMouseUp={handleButtonRelease}
            onMouseLeave={handleButtonRelease}
            onTouchStart={() => handleButtonPress(num.toString())}
            onTouchEnd={handleButtonRelease}
            disabled={isProcessing}
            className={`${useDesign2 ? 'h-16' : 'h-16'} ${useDesign2 ? 'border border-gray-600 dark:border-gray-700' : 'border'} ${useDesign2 ? 'rounded-xl' : 'rounded-lg'} ${useDesign2 ? 'text-2xl' : 'text-xl'} font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              highlightPinButtons && pressedButton === num.toString()
                ? 'bg-[#22c55f] text-white transform scale-95' + (useDesign2 ? ' border-[#22c55f]' : ' border-[#22c55f]')
                : useDesign2 
                  ? 'bg-[#0f0f0f] active:bg-gray-800 dark:bg-[#0f0f0f] dark:active:bg-gray-900 text-gray-400 dark:text-gray-500'
                  : 'bg-gray-100 active:bg-gray-200 dark:bg-[#161c25] dark:active:bg-[#1f2937] border-gray-300 dark:border-gray-800 text-gray-900 dark:text-gray-200'
            }`}
          >
            {num}
          </button>
        ))}
        <button
          onClick={() => handleButtonClick(() => { onClear(); }, 'clear')}
          onMouseDown={() => handleButtonPress('clear')}
          onMouseUp={handleButtonRelease}
          onMouseLeave={handleButtonRelease}
          onTouchStart={() => handleButtonPress('clear')}
          onTouchEnd={handleButtonRelease}
          disabled={isProcessing}
          className={`${useDesign2 ? 'h-16' : 'h-16'} ${useDesign2 ? 'border border-gray-600 dark:border-gray-700' : 'border'} ${useDesign2 ? 'rounded-xl' : 'rounded-lg'} ${useDesign2 ? 'text-base' : 'text-sm'} transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            highlightPinButtons && pressedButton === 'clear'
              ? 'bg-[#22c55f] text-white transform scale-95' + (useDesign2 ? ' border-[#22c55f]' : ' border-[#22c55f]')
              : useDesign2 
                ? 'bg-[#0f0f0f] active:bg-gray-800 dark:bg-[#0f0f0f] dark:active:bg-gray-900 text-gray-400 dark:text-gray-500'
                : 'bg-gray-100 active:bg-gray-200 dark:bg-[#161c25] dark:active:bg-[#1f2937] border-gray-300 dark:border-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          Clear
        </button>
        <button
          onClick={() => handleButtonClick(() => { onPinKeyPress('0'); }, '0')}
          onMouseDown={() => handleButtonPress('0')}
          onMouseUp={handleButtonRelease}
          onMouseLeave={handleButtonRelease}
          onTouchStart={() => handleButtonPress('0')}
          onTouchEnd={handleButtonRelease}
          disabled={isProcessing}
          className={`${useDesign2 ? 'h-16' : 'h-16'} ${useDesign2 ? 'border border-gray-600 dark:border-gray-700' : 'border'} ${useDesign2 ? 'rounded-xl' : 'rounded-lg'} ${useDesign2 ? 'text-2xl' : 'text-xl'} font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            highlightPinButtons && pressedButton === '0'
              ? 'bg-[#22c55f] text-white transform scale-95' + (useDesign2 ? ' border-[#22c55f]' : ' border-[#22c55f]')
              : useDesign2 
                ? 'bg-[#0f0f0f] active:bg-gray-800 dark:bg-[#0f0f0f] dark:active:bg-gray-900 text-gray-400 dark:text-gray-500'
                : 'bg-gray-100 active:bg-gray-200 dark:bg-[#161c25] dark:active:bg-[#1f2937] border-gray-300 dark:border-gray-800 text-gray-900 dark:text-gray-200'
          }`}
        >
          0
        </button>
        <button
          onClick={() => handleButtonClick(() => { onBackspace(); }, 'backspace')}
          onMouseDown={() => handleButtonPress('backspace')}
          onMouseUp={handleButtonRelease}
          onMouseLeave={handleButtonRelease}
          onTouchStart={() => handleButtonPress('backspace')}
          onTouchEnd={handleButtonRelease}
          disabled={isProcessing}
          className={`${useDesign2 ? 'h-16' : 'h-16'} ${useDesign2 ? 'border border-gray-600 dark:border-gray-700' : 'border'} ${useDesign2 ? 'rounded-xl' : 'rounded-lg'} ${useDesign2 ? 'text-2xl' : 'text-xl'} transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            highlightPinButtons && pressedButton === 'backspace'
              ? 'bg-[#22c55f] text-white transform scale-95' + (useDesign2 ? ' border-[#22c55f]' : ' border-[#22c55f]')
              : useDesign2 
                ? 'bg-[#0f0f0f] active:bg-gray-800 dark:bg-[#0f0f0f] dark:active:bg-gray-900 text-gray-400 dark:text-gray-500'
                : 'bg-gray-100 active:bg-gray-200 dark:bg-[#161c25] dark:active:bg-[#1f2937] border-gray-300 dark:border-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          ←
        </button>
      </div>
    </div>
  );
} 