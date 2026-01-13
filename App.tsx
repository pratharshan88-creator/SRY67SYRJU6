
import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import Toolbar from './components/Toolbar';
import AboutPage from './components/AboutPage';
import CanvasManager from './components/CanvasManager';
import LiveAIManager from './components/LiveAIManager';
import { MeasurementMode, Unit, Point } from './types';
import { Camera, Image as ImageIcon, Sparkles, Pencil } from 'lucide-react';

const App: React.FC = () => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [liveVideo, setLiveVideo] = useState<HTMLVideoElement | null>(null);
  const [mode, setMode] = useState<MeasurementMode>(MeasurementMode.DISTANCE);
  const [unit, setUnit] = useState<Unit>(Unit.CM);
  const [points, setPoints] = useState<Point[]>([]);
  const [showAbout, setShowAbout] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
    setLiveVideo(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setLiveVideo(null);
          setPoints([]);
          setIsCapturing(false);
          setMode(MeasurementMode.DISTANCE);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async (forLiveBoard = false) => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      streamRef.current = stream;
      
      if (forLiveBoard) {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.onloadedmetadata = () => {
          setLiveVideo(video);
          setImage(null);
          setMode(MeasurementMode.WHITEBOARD);
          setIsCapturing(false);
        };
      } else if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Please allow camera access.");
      setIsCapturing(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imgData = canvas.toDataURL('image/jpeg');
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setLiveVideo(null);
          setPoints([]);
          stopCamera();
          setMode(MeasurementMode.DISTANCE);
        };
        img.src = imgData;
      }
    }
  };

  const handleReset = () => {
    setPoints([]);
  };

  if (isCapturing && mode !== MeasurementMode.WHITEBOARD) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
        <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute bottom-10 flex w-full justify-around px-10">
          <button 
            onClick={stopCamera}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg"
          >
            Cancel
          </button>
          <button 
            onClick={capturePhoto}
            className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-yellow-400 text-black shadow-lg"
          >
            <Camera size={40} />
          </button>
        </div>
      </div>
    );
  }

  if (mode === MeasurementMode.LIVE_AI) {
    return <LiveAIManager onClose={() => setMode(MeasurementMode.DISTANCE)} />;
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-black text-white font-sans">
      <Header 
        unit={unit} 
        onUnitChange={setUnit} 
        onAboutClick={() => setShowAbout(true)} 
        onReset={handleReset}
        onNewPhoto={() => { setImage(null); setLiveVideo(null); stopCamera(); }}
      />

      <main className="relative flex-1">
        {!image && !liveVideo ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-yellow-400 text-black shadow-[0_0_30px_rgba(250,204,21,0.3)]">
              <span className="text-5xl font-black italic">G</span>
            </div>
            <h1 className="mb-2 text-3xl font-bold text-yellow-400">Gittu AR Lens</h1>
            <p className="mb-10 text-neutral-400 max-w-xs">Track, measure, and draw in AR space using your camera.</p>
            
            <div className="grid w-full grid-cols-1 gap-4 sm:max-w-md">
              <button 
                onClick={() => setMode(MeasurementMode.LIVE_AI)}
                className="flex items-center justify-center gap-3 rounded-2xl border-2 border-yellow-400 bg-yellow-400/10 py-5 text-lg font-bold text-yellow-400 transition-all active:scale-95"
              >
                <Sparkles size={24} />
                LIVE AI SCANNER
              </button>

              <button 
                onClick={() => startCamera(true)}
                className="flex items-center justify-center gap-3 rounded-2xl border-2 border-yellow-400 bg-yellow-400/10 py-5 text-lg font-bold text-yellow-400 transition-all active:scale-95"
              >
                <Pencil size={24} />
                LIVE AR WHITEBOARD
              </button>

              <button 
                onClick={() => startCamera(false)}
                className="flex items-center justify-center gap-3 rounded-2xl bg-yellow-400 py-5 text-lg font-bold text-black transition-all active:scale-95"
              >
                <Camera size={24} />
                CAPTURE PHOTO
              </button>
              
              <div className="relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  id="gallery-input"
                />
                <label 
                  htmlFor="gallery-input"
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-yellow-400/50 bg-neutral-900 py-5 text-lg font-bold text-yellow-400 transition-all active:scale-95"
                >
                  <ImageIcon size={24} />
                  FROM GALLERY
                </label>
              </div>
            </div>
          </div>
        ) : (
          <CanvasManager 
            image={image || ({} as HTMLImageElement)} 
            videoSource={liveVideo}
            mode={mode} 
            unit={unit} 
            points={points} 
            setPoints={setPoints} 
          />
        )}
      </main>

      {(image || liveVideo) && <Toolbar activeMode={mode} onModeChange={(m) => { setMode(m); setPoints([]); }} />}
      
      {showAbout && <AboutPage onClose={() => setShowAbout(false)} />}
    </div>
  );
};

export default App;
