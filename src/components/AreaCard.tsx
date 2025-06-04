'use client';

import { useState } from 'react';
import { Area, updateAreaState } from '@/lib/api';

interface AreaCardProps {
  area: Area;
  onStateChange: () => void;
}

export default function AreaCard({ area, onStateChange }: AreaCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStateChange = async (newState: Area['armedState']) => {
    setLoading(true);
    setError('');

    try {
      const response = await updateAreaState(area.id, newState);
      if (response.error) {
        setError('Failed to update area state');
        return;
      }
      onStateChange();
    } catch (err) {
      setError('An error occurred while updating area state');
    } finally {
      setLoading(false);
    }
  };

  const getStateColor = (state: Area['armedState']) => {
    switch (state) {
      case 'ARMED_AWAY':
        return 'bg-red-500';
      case 'ARMED_STAY':
        return 'bg-yellow-500';
      default:
        return 'bg-green-500';
    }
  };

  const getStateText = (state: Area['armedState']) => {
    switch (state) {
      case 'ARMED_AWAY':
        return 'Armed Away';
      case 'ARMED_STAY':
        return 'Armed Stay';
      default:
        return 'Disarmed';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{area.name}</h3>
        <div className={`px-3 py-1 rounded-full text-white text-sm ${getStateColor(area.armedState)}`}>
          {getStateText(area.armedState)}
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-sm mb-4">{error}</div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => handleStateChange('DISARMED')}
          disabled={loading || area.armedState === 'DISARMED'}
          className="py-2 px-4 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          Disarm
        </button>
        <button
          onClick={() => handleStateChange('ARMED_STAY')}
          disabled={loading || area.armedState === 'ARMED_STAY'}
          className="py-2 px-4 bg-yellow-500 text-white rounded hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
        >
          Stay
        </button>
        <button
          onClick={() => handleStateChange('ARMED_AWAY')}
          disabled={loading || area.armedState === 'ARMED_AWAY'}
          className="py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
        >
          Away
        </button>
      </div>
    </div>
  );
} 