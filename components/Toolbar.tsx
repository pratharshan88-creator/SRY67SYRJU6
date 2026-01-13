
import React from 'react';
import { 
  Square, 
  Triangle, 
  Circle, 
  Pentagon, 
  Minus, 
  Dot, 
  Maximize,
  Sparkles,
  Pencil
} from 'lucide-react';
import { MeasurementMode } from '../types';

interface ToolbarProps {
  activeMode: MeasurementMode;
  onModeChange: (mode: MeasurementMode) => void;
}

const MODES = [
  { id: MeasurementMode.LIVE_AI, label: 'Live AI', icon: Sparkles },
  { id: MeasurementMode.WHITEBOARD, label: 'Board', icon: Pencil },
  { id: MeasurementMode.DISTANCE, label: 'Distance', icon: Minus },
  { id: MeasurementMode.POINT, label: 'Point', icon: Dot },
  { id: MeasurementMode.LINE, label: 'Line', icon: Minus },
  { id: MeasurementMode.TRIANGLE, label: 'Triangle', icon: Triangle },
  { id: MeasurementMode.RECTANGLE, label: 'Rectangle', icon: Square },
  { id: MeasurementMode.POLYGON, label: 'Polygon', icon: Pentagon },
  { id: MeasurementMode.CIRCLE, label: 'Circle', icon: Circle },
  { id: MeasurementMode.AREA, label: 'Area', icon: Maximize },
];

const Toolbar: React.FC<ToolbarProps> = ({ activeMode, onModeChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 px-2 pb-6 pt-2 backdrop-blur-lg border-t border-yellow-400/30">
      <div className="flex overflow-x-auto no-scrollbar items-center gap-4 px-4 py-2">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.id;
          const isSpecial = mode.id === MeasurementMode.LIVE_AI || mode.id === MeasurementMode.WHITEBOARD;
          
          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`flex flex-col items-center min-w-[64px] transition-all ${
                isActive ? 'scale-110' : 'opacity-60 grayscale'
              }`}
            >
              <div className={`mb-1 flex h-12 w-12 items-center justify-center rounded-2xl border-2 ${
                isActive 
                  ? 'bg-yellow-400 border-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)]' 
                  : isSpecial 
                    ? 'border-yellow-400/50 text-yellow-400 bg-yellow-400/10' 
                    : 'border-neutral-600 text-white'
              }`}>
                <Icon size={24} strokeWidth={isActive ? 3 : 2} />
              </div>
              <span className={`text-[10px] font-bold uppercase ${isActive ? 'text-yellow-400' : 'text-neutral-400'}`}>
                {mode.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Toolbar;
