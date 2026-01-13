
import React from 'react';
import { Info, RotateCcw, Ruler, Camera } from 'lucide-react';
import { Unit } from '../types';

interface HeaderProps {
  unit: Unit;
  onUnitChange: (unit: Unit) => void;
  onAboutClick: () => void;
  onReset: () => void;
  onNewPhoto: () => void;
}

const Header: React.FC<HeaderProps> = ({ unit, onUnitChange, onAboutClick, onReset, onNewPhoto }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-black/70 px-4 py-3 backdrop-blur-md border-b border-yellow-400/30">
      <div className="flex items-center gap-2">
        <button 
          onClick={onNewPhoto}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400 text-black"
        >
          <Camera size={20} />
        </button>
        <span className="text-lg font-bold text-yellow-400">Gittu <span className="text-white">AR</span></span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex rounded-lg bg-neutral-800 p-1 border border-neutral-700">
          {(Object.values(Unit) as Unit[]).map((u) => (
            <button
              key={u}
              onClick={() => onUnitChange(u)}
              className={`px-2 py-1 text-xs font-bold rounded ${
                unit === u ? 'bg-yellow-400 text-black' : 'text-neutral-400'
              }`}
            >
              {u.toUpperCase()}
            </button>
          ))}
        </div>

        <button 
          onClick={onReset}
          className="p-2 text-yellow-400 hover:bg-neutral-800 rounded-full transition-colors"
          title="Reset"
        >
          <RotateCcw size={20} />
        </button>
        
        <button 
          onClick={onAboutClick}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-yellow-400 text-yellow-400 font-bold text-xs"
        >
          <Info size={14} />
          ABOUT
        </button>
      </div>
    </header>
  );
};

export default Header;
