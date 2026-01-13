
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MousePointer2, Pencil, Trash2, Palette, Target, Hand } from 'lucide-react';
import { Point, MeasurementMode, Transformation, Unit, Stroke } from '../types';
import { 
  calculateDistance, 
  calculatePolygonArea, 
  getCircleParams, 
  convertValue, 
  formatValue 
} from '../utils/geometry';

interface CanvasManagerProps {
  image: HTMLImageElement;
  videoSource?: HTMLVideoElement | null;
  mode: MeasurementMode;
  unit: Unit;
  points: Point[];
  setPoints: (points: Point[]) => void;
}

const COLORS = ['#FACC15', '#FFFFFF', '#22D3EE', '#F472B6', '#4ADE80'];
const WIDTHS = [2, 5, 8, 12];

declare const Hands: any;
declare const drawConnectors: any;
declare const drawLandmarks: any;
declare const HAND_CONNECTIONS: any;

const CanvasManager: React.FC<CanvasManagerProps> = ({ image, videoSource, mode, unit, points, setPoints }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const handsRef = useRef<any>(null);
  
  const [transform, setTransform] = useState<Transformation>({ x: 0, y: 0, scale: 1 });
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPointerPos, setLastPointerPos] = useState({ x: 0, y: 0 });
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  
  // Whiteboard state
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[] | null>(null);
  const [brushColor, setBrushColor] = useState(COLORS[0]);
  const [brushWidth, setBrushWidth] = useState(WIDTHS[1]);
  const [penPos, setPenPos] = useState({ x: -100, y: -100 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [isHandDetected, setIsHandDetected] = useState(false);

  const getTargetDimensions = useCallback(() => {
    if (videoSource) {
      return { width: videoSource.videoWidth, height: videoSource.videoHeight };
    }
    return { width: image.width || 1, height: image.height || 1 };
  }, [image, videoSource]);

  const imageToScreen = useCallback((imgX: number, imgY: number) => {
    const dims = getTargetDimensions();
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    if (videoSource) {
      const aspect = dims.width / dims.height;
      const screenAspect = canvas.width / canvas.height;
      let drawW, drawH;
      if (screenAspect > aspect) {
        drawW = canvas.width;
        drawH = canvas.width / aspect;
      } else {
        drawH = canvas.height;
        drawW = canvas.height * aspect;
      }
      return {
        x: (imgX * drawW * transform.scale) + transform.x,
        y: (imgY * drawH * transform.scale) + transform.y
      };
    }

    return {
      x: (imgX * dims.width * transform.scale) + transform.x,
      y: (imgY * dims.height * transform.scale) + transform.y
    };
  }, [transform, getTargetDimensions, videoSource]);

  const screenToImage = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const dims = getTargetDimensions();
    const x = screenX - rect.left;
    const y = screenY - rect.top;

    if (videoSource) {
      const aspect = dims.width / dims.height;
      const screenAspect = canvas.width / canvas.height;
      let drawW, drawH;
      if (screenAspect > aspect) {
        drawW = canvas.width;
        drawH = canvas.width / aspect;
      } else {
        drawH = canvas.height;
        drawW = canvas.height * aspect;
      }
      return {
        x: (x - transform.x) / (drawW * transform.scale),
        y: (y - transform.y) / (drawH * transform.scale)
      };
    }

    return {
      x: (x - transform.x) / (image.width * transform.scale),
      y: (y - transform.y) / (image.height * transform.scale)
    };
  }, [transform, getTargetDimensions, videoSource, image]);

  const onResults = useCallback((results: any) => {
    if (!canvasRef.current || mode !== MeasurementMode.WHITEBOARD) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      setIsHandDetected(true);
      const landmarks = results.multiHandLandmarks[0];
      const indexTip = landmarks[8];
      const screenPos = imageToScreen(indexTip.x, indexTip.y);
      setPenPos(screenPos);

      const imgCoords: Point = { x: indexTip.x, y: indexTip.y, id: Date.now().toString() };

      if (!isDrawing) {
        setIsDrawing(true);
        setCurrentStroke([imgCoords]);
      } else {
        setCurrentStroke(prev => prev ? [...prev, imgCoords] : [imgCoords]);
      }

      ctx.save();
      ctx.globalAlpha = 0.4;
      if (typeof drawConnectors !== 'undefined') {
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#4ADE80', lineWidth: 2 });
      }
      if (typeof drawLandmarks !== 'undefined') {
        drawLandmarks(ctx, landmarks, { color: '#FACC15', lineWidth: 1, radius: 3 });
      }
      ctx.restore();
    } else {
      setIsHandDetected(false);
      if (isDrawing) {
        setIsDrawing(false);
        if (currentStroke) {
          setStrokes(prev => [...prev, { points: currentStroke, color: brushColor, width: brushWidth }]);
          setCurrentStroke(null);
        }
      }
    }
  }, [mode, imageToScreen, isDrawing, currentStroke, brushColor, brushWidth]);

  useEffect(() => {
    if (typeof Hands !== 'undefined' && !handsRef.current) {
      try {
        const hands = new Hands({
          locateFile: (file: string) => {
            // Using a specific stable version for all internal assets to fix NetworkErrors
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`;
          }
        });
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6
        });
        hands.onResults(onResults);
        handsRef.current = hands;
      } catch (err) {
        console.error("Hands initialization failed:", err);
      }
    }
  }, [onResults]);

  const drawLoop = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const dims = getTargetDimensions();

    if (videoSource) {
      const aspect = dims.width / dims.height;
      const screenAspect = canvas.width / canvas.height;
      let drawW, drawH;
      if (screenAspect > aspect) {
        drawW = canvas.width * transform.scale;
        drawH = (canvas.width / aspect) * transform.scale;
      } else {
        drawH = canvas.height * transform.scale;
        drawW = (canvas.height * aspect) * transform.scale;
      }
      ctx.drawImage(videoSource, transform.x, transform.y, drawW, drawH);
      
      if (handsRef.current && mode === MeasurementMode.WHITEBOARD && videoSource.videoWidth > 0) {
        try {
          await handsRef.current.send({ image: videoSource });
        } catch (e) {
          // Frame processing might fail if video isn't ready or on browser suspends
        }
      }
    } else if (image.src) {
      ctx.drawImage(image, transform.x, transform.y, image.width * transform.scale, image.height * transform.scale);
    }

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const allStrokes = currentStroke ? [...strokes, { points: currentStroke, color: brushColor, width: brushWidth }] : strokes;
    
    allStrokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width * transform.scale;
      ctx.shadowBlur = 10;
      ctx.shadowColor = stroke.color;
      
      const start = imageToScreen(stroke.points[0].x, stroke.points[0].y);
      ctx.moveTo(start.x, start.y);
      for (let i = 1; i < stroke.points.length; i++) {
        const p = imageToScreen(stroke.points[i].x, stroke.points[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    if (mode !== MeasurementMode.WHITEBOARD) {
      ctx.strokeStyle = '#FACC15'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
      if (points.length >= 2) {
        if (mode === MeasurementMode.CIRCLE) {
          const center = imageToScreen(points[0].x, points[0].y);
          const edge = imageToScreen(points[1].x, points[1].y);
          const radius = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2));
          ctx.beginPath(); ctx.arc(center.x, center.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        } else if (mode === MeasurementMode.RECTANGLE) {
          const p1 = imageToScreen(points[0].x, points[0].y);
          const p2 = imageToScreen(points[1].x, points[1].y);
          ctx.beginPath(); ctx.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y); ctx.fill(); ctx.stroke();
        } else {
          ctx.beginPath();
          points.forEach((p, i) => {
            const screen = imageToScreen(p.x, p.y);
            if (i === 0) ctx.moveTo(screen.x, screen.y);
            else ctx.lineTo(screen.x, screen.y);
          });
          if ([MeasurementMode.TRIANGLE, MeasurementMode.POLYGON, MeasurementMode.AREA].includes(mode) && points.length >= 3) {
            ctx.closePath(); ctx.fill();
          }
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
      points.forEach((p, i) => {
        const screen = imageToScreen(p.x, p.y);
        ctx.beginPath(); ctx.arc(screen.x, screen.y, selectedPointId === p.id ? 8 : 6, 0, Math.PI * 2);
        ctx.fillStyle = '#FACC15'; ctx.fill(); ctx.strokeStyle = 'black'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#FACC15'; ctx.font = 'bold 14px Inter';
        ctx.fillText(String.fromCharCode(65 + i), screen.x + 10, screen.y - 10);
      });
    }

    requestRef.current = requestAnimationFrame(drawLoop);
  }, [image, videoSource, mode, strokes, currentStroke, brushColor, brushWidth, points, transform, imageToScreen, selectedPointId, getTargetDimensions]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(drawLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [drawLoop]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (mode === MeasurementMode.WHITEBOARD && videoSource) return;

    const { clientX, clientY } = e;
    const imgCoords = screenToImage(clientX, clientY);

    if (mode === MeasurementMode.WHITEBOARD) {
      setIsDrawing(true);
      const newPoint: Point = { ...imgCoords, id: Date.now().toString() };
      setCurrentStroke([newPoint]);
      return;
    }

    const clickedPoint = points.find(p => {
      const screen = imageToScreen(p.x, p.y);
      const dist = Math.sqrt(Math.pow(screen.x - clientX, 2) + Math.pow(screen.y - clientY, 2));
      return dist < 20;
    });

    if (clickedPoint) {
      setDraggingPointId(clickedPoint.id);
      setSelectedPointId(clickedPoint.id);
      return;
    }

    if (e.buttons === 1) { 
      if (e.shiftKey) { 
        setIsPanning(true);
        setLastPointerPos({ x: clientX, y: clientY });
      } else {
        const newPoint = { x: imgCoords.x, y: imgCoords.y, id: Date.now().toString() };
        if (mode === MeasurementMode.POINT) setPoints([newPoint]);
        else if ([MeasurementMode.DISTANCE, MeasurementMode.LINE, MeasurementMode.CIRCLE, MeasurementMode.RECTANGLE].includes(mode)) {
           if (points.length < 2) setPoints([...points, newPoint]);
        } else if (mode === MeasurementMode.TRIANGLE && points.length < 3) setPoints([...points, newPoint]);
        else if (mode === MeasurementMode.POLYGON && points.length < 6) setPoints([...points, newPoint]);
        else if (mode === MeasurementMode.AREA && points.length < 12) setPoints([...points, newPoint]);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (mode === MeasurementMode.WHITEBOARD && videoSource) return;

    const { clientX, clientY } = e;
    setPenPos({ x: clientX, y: clientY });

    if (mode === MeasurementMode.WHITEBOARD && isDrawing) {
      const imgCoords = screenToImage(clientX, clientY);
      const newPoint: Point = { ...imgCoords, id: Date.now().toString() };
      setCurrentStroke(prev => prev ? [...prev, newPoint] : [newPoint]);
    } else if (draggingPointId) {
      const imgCoords = screenToImage(clientX, clientY);
      setPoints(points.map(p => p.id === draggingPointId ? { ...p, ...imgCoords } : p));
    } else if (isPanning) {
      const dx = clientX - lastPointerPos.x;
      const dy = clientY - lastPointerPos.y;
      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setLastPointerPos({ x: clientX, y: clientY });
    }
  };

  const handlePointerUp = () => {
    if (mode === MeasurementMode.WHITEBOARD && !videoSource && currentStroke) {
      setStrokes(prev => [...prev, { points: currentStroke, color: brushColor, width: brushWidth }]);
      setCurrentStroke(null);
      setIsDrawing(false);
    }
    setDraggingPointId(null);
    setIsPanning(false);
  };

  return (
    <div className={`relative h-full w-full bg-black overflow-hidden ${mode === MeasurementMode.WHITEBOARD ? 'cursor-none' : 'cursor-crosshair'}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="block h-full w-full"
      />
      
      {mode === MeasurementMode.WHITEBOARD && videoSource && (
        <div className="absolute left-4 top-4 z-50 flex items-center gap-3">
          <div className={`flex items-center gap-2 rounded-full px-4 py-1.5 backdrop-blur-md border ${isHandDetected ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-red-500/20 border-red-500 text-red-400'}`}>
            <Hand size={16} className={isHandDetected ? 'animate-pulse' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {isHandDetected ? 'Hand Tracking Active' : 'No Hand Detected'}
            </span>
          </div>
          {isHandDetected && (
            <div className="text-[10px] font-mono text-yellow-400 bg-black/40 px-3 py-1.5 rounded-full border border-yellow-400/30">
              POS: {Math.round(penPos.x)}, {Math.round(penPos.y)}
            </div>
          )}
        </div>
      )}

      {mode === MeasurementMode.WHITEBOARD && (
        <div 
          className="pointer-events-none fixed z-[100] transition-transform duration-75 ease-out"
          style={{ 
            left: penPos.x, 
            top: penPos.y, 
            transform: 'translate(-50%, -50%)' 
          }}
        >
          <div className="relative flex items-center justify-center">
            <div className={`absolute h-16 w-16 rounded-full border border-yellow-400 reticle-pulse ${isDrawing ? 'opacity-100' : 'opacity-40'}`} />
            <div className="relative h-10 w-10">
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-yellow-400/50 animate-[spin_6s_linear_infinite]" />
              <Target size={40} className="text-yellow-400 drop-shadow-[0_0_15px_#FACC15]" />
            </div>
            {isDrawing && (
              <div className="absolute -bottom-8 whitespace-nowrap text-[8px] font-bold text-cyan-400 uppercase tracking-widest bg-black/60 px-2 py-0.5 rounded border border-cyan-400/30">
                Ink Flowing
              </div>
            )}
          </div>
        </div>
      )}

      <div className="absolute top-20 right-4 z-30 flex flex-col gap-3">
        <button 
          onClick={() => setIsPanning(!isPanning)}
          className={`flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-lg transition-colors ${
            isPanning ? 'bg-yellow-400 border-yellow-400 text-black' : 'bg-black/60 border-yellow-400 text-yellow-400'
          }`}
        >
          <MousePointer2 size={24} />
        </button>

        {mode === MeasurementMode.WHITEBOARD && (
          <button 
            onClick={() => { setStrokes([]); setCurrentStroke(null); }}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 bg-red-500/80 border-red-500 text-white shadow-lg active:scale-95"
          >
            <Trash2 size={24} />
          </button>
        )}
      </div>

      {mode === MeasurementMode.WHITEBOARD && (
        <div className="absolute left-1/2 bottom-32 z-30 -translate-x-1/2 flex items-center gap-4 rounded-2xl border border-yellow-400/30 bg-black/60 px-4 py-2 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-2 border-r border-neutral-700 pr-4">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setBrushColor(c)}
                className={`h-6 w-6 rounded-full border-2 transition-transform ${brushColor === c ? 'border-white scale-125' : 'border-transparent opacity-60'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Palette size={16} className="text-yellow-400" />
            <div className="flex gap-2">
              {WIDTHS.map(w => (
                <button
                  key={w}
                  onClick={() => setBrushWidth(w)}
                  className={`flex h-6 w-6 items-center justify-center rounded-md border text-[10px] font-bold ${brushWidth === w ? 'bg-yellow-400 text-black border-yellow-400' : 'text-neutral-400 border-neutral-700'}`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CanvasManager;
