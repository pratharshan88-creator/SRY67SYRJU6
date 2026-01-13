
import React from 'react';
import { X } from 'lucide-react';

interface AboutPageProps {
  onClose: () => void;
}

const AboutPage: React.FC<AboutPageProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border-2 border-yellow-400 bg-neutral-900 p-8 shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-yellow-400 hover:text-yellow-300 transition-colors"
        >
          <X size={28} />
        </button>

        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400 text-black">
              <span className="text-3xl font-bold italic">G</span>
            </div>
          </div>
          
          <h1 className="mb-2 text-3xl font-bold text-yellow-400">Gittu AR Lens</h1>
          <p className="text-sm font-semibold uppercase tracking-widest text-neutral-400">Created by Gittu😋</p>
          
          <div className="my-8 space-y-4 text-left text-neutral-200">
            <section>
              <h2 className="text-lg font-bold text-yellow-400">Purpose</h2>
              <p className="text-sm leading-relaxed">
                This app helps students measure real-world objects and understand geometry using a single photo.
              </p>
            </section>
            
            <section>
              <p className="text-sm italic leading-relaxed text-neutral-400">
                Inspired by school mathematics and curiosity-driven learning.
              </p>
            </section>
          </div>

          <button 
            onClick={onClose}
            className="w-full rounded-xl bg-yellow-400 py-3 font-bold text-black transition-transform active:scale-95"
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
