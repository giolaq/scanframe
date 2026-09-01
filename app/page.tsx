'use client';

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  CirclePause,
  Download,
  ImagePlus,
  LoaderCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

const SIZE = 720;
const EXPORT_DURATION = 9;
const ACCENT = '#8c2cff';

type ControlProps = {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  suffix?: string;
  value: number;
};

function Control({ label, max, min, onChange, step = 1, suffix = '', value }: ControlProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        <span>{label}</span>
        <span className="text-foreground">{value}{suffix}</span>
      </div>
      <Slider
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(nextValue) => {
          const resolved = Array.isArray(nextValue) ? nextValue[0] : nextValue;
          onChange(resolved);
        }}
        className="[&_[data-slot=slider-range]]:bg-primary [&_[data-slot=slider-thumb]]:size-3 [&_[data-slot=slider-thumb]]:rounded-none [&_[data-slot=slider-thumb]]:border-primary [&_[data-slot=slider-track]]:h-px [&_[data-slot=slider-track]]:rounded-none [&_[data-slot=slider-track]]:bg-white/15"
      />
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  zoom: number,
  focalY: number,
) {
  const baseScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const scale = baseScale * zoom;
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) * focalY;

  context.drawImage(
    image,
    clamp(sourceX, 0, image.naturalWidth - sourceWidth),
    clamp(sourceY, 0, image.naturalHeight - sourceHeight),
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height,
  );
}

function createProcessedFrames(
  image: HTMLImageElement,
  density: number,
  contrast: number,
  zoom: number,
  focalY: number,
) {
  const photo = document.createElement('canvas');
  const base = document.createElement('canvas');
  const halftone = document.createElement('canvas');
  photo.width = base.width = halftone.width = SIZE;
  photo.height = base.height = halftone.height = SIZE;

  const photoContext = photo.getContext('2d', { willReadFrequently: true });
  const baseContext = base.getContext('2d');
  const halftoneContext = halftone.getContext('2d');
  if (!photoContext || !baseContext || !halftoneContext) return null;

  drawCover(photoContext, image, SIZE, SIZE, zoom, focalY);
  const pixels = photoContext.getImageData(0, 0, SIZE, SIZE);
  const source = pixels.data;

  for (let index = 0; index < source.length; index += 4) {
    const luminance = source[index] * 0.2126 + source[index + 1] * 0.7152 + source[index + 2] * 0.0722;
    const adjusted = clamp(128 + (luminance - 128) * contrast, 0, 255);
    source[index] = adjusted;
    source[index + 1] = adjusted;
    source[index + 2] = adjusted;
    source[index + 3] = 255;
  }
  baseContext.putImageData(pixels, 0, 0);

  halftoneContext.fillStyle = '#020202';
  halftoneContext.fillRect(0, 0, SIZE, SIZE);
  halftoneContext.fillStyle = '#f7f7f7';
  const gap = Math.max(4, Math.round(density));
  for (let y = gap / 2; y < SIZE; y += gap) {
    for (let x = gap / 2; x < SIZE; x += gap) {
      const pixelIndex = (Math.floor(y) * SIZE + Math.floor(x)) * 4;
      const light = source[pixelIndex] / 255;
      const radius = Math.max(0.22, light * gap * 0.46);
      halftoneContext.beginPath();
      halftoneContext.arc(x, y, radius, 0, Math.PI * 2);
      halftoneContext.fill();
    }
  }

  return { base, halftone };
}

function drawTechnicalLabel(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: 'left' | 'right' = 'left',
) {
  context.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  const width = context.measureText(text).width + 22;
  const left = align === 'right' ? x - width : x;
  context.fillStyle = ACCENT;
  context.fillRect(left, y, width, 24);
  context.fillStyle = '#ffffff';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(text, left + 11, y + 12);
}

function renderPortrait(
  context: CanvasRenderingContext2D,
  base: HTMLCanvasElement,
  halftone: HTMLCanvasElement,
  phase: number,
  frameSize: number,
  subjectName: string,
  subjectLabel: string,
) {
  const windowSize = SIZE * (frameSize / 100);
  const pathX = (Math.sin(phase * 0.83) * 0.5 + 0.5) * (SIZE - windowSize);
  const pathY = (Math.sin(phase * 1.13 + 1.4) * 0.5 + 0.5) * (SIZE - windowSize);
  const x = clamp(pathX, 22, SIZE - windowSize - 22);
  const y = clamp(pathY, 48, SIZE - windowSize - 52);

  context.clearRect(0, 0, SIZE, SIZE);
  context.drawImage(base, 0, 0);
  context.fillStyle = 'rgba(0,0,0,.2)';
  context.fillRect(0, 0, SIZE, SIZE);

  const vignette = context.createRadialGradient(SIZE / 2, SIZE * 0.43, SIZE * 0.12, SIZE / 2, SIZE / 2, SIZE * 0.76);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,.66)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, SIZE, SIZE);

  context.save();
  context.beginPath();
  context.rect(x, y, windowSize, windowSize);
  context.clip();
  context.globalAlpha = 0.96;
  context.drawImage(halftone, 0, 0);
  const scanGlow = context.createLinearGradient(0, y, 0, y + windowSize);
  scanGlow.addColorStop(0, 'rgba(140,44,255,.2)');
  scanGlow.addColorStop(0.14, 'rgba(140,44,255,0)');
  scanGlow.addColorStop(0.85, 'rgba(140,44,255,0)');
  scanGlow.addColorStop(1, 'rgba(140,44,255,.12)');
  context.fillStyle = scanGlow;
  context.fillRect(x, y, windowSize, windowSize);
  context.restore();

  context.strokeStyle = ACCENT;
  context.lineWidth = 1.5;
  context.strokeRect(x + 0.5, y + 0.5, windowSize - 1, windowSize - 1);
  context.strokeStyle = 'rgba(140,44,255,.24)';
  context.strokeRect(x - 7.5, y - 7.5, windowSize + 15, windowSize + 15);

  const sweepY = y + ((phase * 0.42) % 1) * windowSize;
  context.fillStyle = 'rgba(255,255,255,.62)';
  context.fillRect(x, sweepY, windowSize, 1);
  drawTechnicalLabel(context, 'SUBJECT / ACTIVE', x, y - 24);
  drawTechnicalLabel(context, '09 SEC / LOOP', x + windowSize, y + windowSize - 24, 'right');

  const glitchPulse = Math.max(0, Math.sin(phase * 5.2) - 0.76) / 0.24;
  if (glitchPulse > 0) {
    context.fillStyle = ACCENT;
    for (let index = 0; index < 7; index += 1) {
      const seed = Math.sin(phase * 31 + index * 74.3) * 10000;
      const random = seed - Math.floor(seed);
      const width = 10 + random * 54;
      const gx = x - 20 + ((index * 89 + phase * 140) % (windowSize + 40));
      const gy = y + ((index * 57 + phase * 95) % windowSize);
      context.globalAlpha = 0.42 + glitchPulse * 0.5;
      context.fillRect(gx, gy, width, 5 + (index % 3) * 3);
    }
    context.globalAlpha = 1;
  }

  context.fillStyle = 'rgba(0,0,0,.25)';
  for (let row = 0; row < SIZE; row += 4) context.fillRect(0, row, SIZE, 1);

  context.fillStyle = '#ffffff';
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.font = '500 12px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.fillText(subjectLabel.toUpperCase() || 'PORTRAIT STUDY', 26, SIZE - 72);
  context.font = '600 43px Georgia, Times New Roman, serif';
  context.fillText(subjectName || 'Your name', 24, SIZE - 28);

  context.strokeStyle = 'rgba(255,255,255,.75)';
  context.strokeRect(18.5, 18.5, 96, 38);
  context.fillStyle = '#ffffff';
  context.font = '700 12px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.fillText('SCANFRAME', 29, 43);
  context.font = '500 9px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.fillStyle = 'rgba(255,255,255,.64)';
  context.fillText('SIGNAL / 001', SIZE - 92, 31);
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);
  const phaseRef = useRef(0);
  const processedRef = useRef<{ base: HTMLCanvasElement; halftone: HTMLCanvasElement } | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [speed, setSpeed] = useState(10);
  const [density, setDensity] = useState(7);
  const [contrast, setContrast] = useState(15);
  const [frameSize, setFrameSize] = useState(43);
  const [zoom, setZoom] = useState(100);
  const [focalY, setFocalY] = useState(50);
  const [subjectName, setSubjectName] = useState('Your name');
  const [subjectLabel, setSubjectLabel] = useState('Portrait study');
  const [renderVersion, setRenderVersion] = useState(0);
  const [status, setStatus] = useState('Ready for a portrait');
  const [exportProgress, setExportProgress] = useState(0);

  useEffect(() => {
    if (!image) return;
    const processed = createProcessedFrames(image, density, contrast / 10, zoom / 100, focalY / 100);
    if (!processed) {
      setStatus('This browser could not process the image.');
      return;
    }
    processedRef.current = processed;
    setRenderVersion((version) => version + 1);
  }, [contrast, density, focalY, image, zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const processed = processedRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    if (!processed || !image) {
      context.clearRect(0, 0, SIZE, SIZE);
      context.fillStyle = '#050505';
      context.fillRect(0, 0, SIZE, SIZE);
      context.strokeStyle = 'rgba(255,255,255,.045)';
      context.lineWidth = 1;
      for (let line = 0; line <= SIZE; line += 36) {
        context.beginPath();
        context.moveTo(line, 0);
        context.lineTo(line, SIZE);
        context.stroke();
        context.beginPath();
        context.moveTo(0, line);
        context.lineTo(SIZE, line);
        context.stroke();
      }
      return;
    }

    let animationFrame = 0;
    let lastTime = performance.now();
    const draw = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      if (isPlaying) phaseRef.current += delta * (speed / 10);
      renderPortrait(context, processed.base, processed.halftone, phaseRef.current, frameSize, subjectName, subjectLabel);
      if (isPlaying) animationFrame = requestAnimationFrame(draw);
    };
    draw(lastTime);

    return () => cancelAnimationFrame(animationFrame);
  }, [frameSize, image, isPlaying, renderVersion, speed, subjectLabel, subjectName]);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  function loadFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatus('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setStatus('That image is over the 20 MB limit.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const nextImage = new Image();
    nextImage.onload = () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = objectUrl;
      phaseRef.current = 0;
      setImage(nextImage);
      setFileName(file.name);
      setIsPlaying(true);
      setStatus('Live preview running');
    };
    nextImage.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setStatus('That image could not be opened.');
    };
    nextImage.src = objectUrl;
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    loadFile(event.target.files?.[0]);
    event.target.value = '';
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
    loadFile(event.dataTransfer.files?.[0]);
  }

  function resetControls() {
    setSpeed(10);
    setDensity(7);
    setContrast(15);
    setFrameSize(43);
    setZoom(100);
    setFocalY(50);
    phaseRef.current = 0;
  }

  function saveStill() {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'scanframe-still.png';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('Still saved');
    }, 'image/png');
  }

  function exportVideo() {
    const canvas = canvasRef.current;
    if (!canvas || !image || exportProgress > 0) return;
    if (!('MediaRecorder' in window) || !canvas.captureStream) {
      setStatus('Video export is not supported in this browser. You can still save a frame.');
      return;
    }

    setIsPlaying(true);
    setExportProgress(1);
    setStatus('Recording your 9 second loop…');
    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 7_000_000 });
    const chunks: BlobPart[] = [];
    const startedAt = performance.now();

    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => {
      setExportProgress(0);
      setStatus('The recording was interrupted. Try exporting again.');
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'scanframe-loop.webm';
      link.click();
      stream.getTracks().forEach((track) => track.stop());
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      setExportProgress(0);
      setStatus('Video exported');
    };

    recorder.start(250);
    const progressTimer = window.setInterval(() => {
      const progress = Math.min((performance.now() - startedAt) / (EXPORT_DURATION * 1000), 1);
      setExportProgress(Math.max(1, Math.round(progress * 100)));
      if (progress >= 1) {
        window.clearInterval(progressTimer);
        recorder.stop();
      }
    }, 100);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="flex h-16 items-center justify-between border-b border-white/10 px-5 sm:px-8">
        <a className="flex items-center gap-3" href="#" aria-label="Scanframe home">
          <span className="grid size-8 place-items-center border border-primary bg-primary text-sm font-black text-primary-foreground">S</span>
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em]">Scanframe</span>
        </a>
        <span className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:flex">
          <ShieldCheck className="size-3.5 text-primary" /> Your photo stays on this device
        </span>
      </header>

      <div className="mx-auto grid max-w-[1500px] lg:min-h-[calc(100vh-64px)] lg:grid-cols-[minmax(0,1fr)_390px]">
        <section
          className="relative flex min-h-[64vh] items-center justify-center overflow-hidden border-white/10 p-4 sm:p-8 lg:border-r lg:p-10"
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
        >
          <div className="stage-grid absolute inset-0 opacity-40" />
          <div className="relative aspect-square w-full max-w-[720px] overflow-hidden border border-white/12 bg-[#050505] shadow-[0_30px_120px_rgba(0,0,0,.6)]">
            <canvas ref={canvasRef} width={SIZE} height={SIZE} className="h-full w-full" aria-label={image ? 'Animated processed portrait preview' : 'Empty portrait preview'} />

            {!image && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="group absolute inset-4 grid place-items-center border border-dashed border-white/18 bg-black/20 text-center transition hover:border-primary/70 hover:bg-primary/[0.035] sm:inset-8"
              >
                <span className="max-w-xs px-6">
                  <span className="mx-auto mb-5 grid size-14 place-items-center border border-primary/60 bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                    <Upload className="size-5" />
                  </span>
                  <span className="block font-heading text-2xl font-medium tracking-tight">Drop a portrait here</span>
                  <span className="mt-2 block text-sm leading-6 text-muted-foreground">JPG, PNG, or WebP · best with one face</span>
                </span>
              </button>
            )}

            {isDragging && (
              <div className="pointer-events-none absolute inset-3 grid place-items-center border border-primary bg-black/85 font-mono text-xs uppercase tracking-[0.18em] text-primary">
                Release to load portrait
              </div>
            )}

            <span className="absolute left-4 top-4 border border-white/20 bg-black/70 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-white/70">
              01 / Output · 720 × 720
            </span>
            {image && (
              <div className="absolute bottom-4 right-4 flex gap-2">
                <Button
                  variant="outline"
                  size="icon-lg"
                  className="rounded-none border-white/20 bg-black/70 backdrop-blur"
                  onClick={() => setIsPlaying((playing) => !playing)}
                  aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
                >
                  {isPlaying ? <CirclePause /> : <Play className="fill-current" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon-lg"
                  className="rounded-none border-white/20 bg-black/70 backdrop-blur"
                  onClick={saveStill}
                  aria-label="Save current frame as PNG"
                >
                  <ImagePlus />
                </Button>
              </div>
            )}
          </div>
        </section>

        <aside className="relative z-10 flex flex-col bg-card lg:max-h-[calc(100vh-64px)]">
          <div className="shrink-0 border-b border-white/10 p-5 sm:p-7">
            <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
              <SlidersHorizontal className="size-3.5" /> Portrait signal generator
            </p>
            <h1 className="font-heading text-4xl font-medium leading-[0.95] tracking-[-0.045em] sm:text-5xl">Make stills move.</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Build a monochrome scan loop with moving halftone detail and electric-violet glitches.
            </p>
          </div>

          <div className="studio-scroll flex-1 space-y-7 overflow-y-auto p-5 sm:p-7">
            <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} />
            <div>
              <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">01 / Source</p>
              <Button
                variant="outline"
                size="lg"
                className="h-11 w-full justify-between rounded-none border-white/15 bg-transparent px-4 font-mono text-[11px] uppercase tracking-[0.12em]"
                onClick={() => inputRef.current?.click()}
              >
                <span className="max-w-[245px] truncate">{fileName || 'Choose a photo'}</span>
                <Upload />
              </Button>
            </div>

            <div className="space-y-5 border-t border-white/10 pt-6">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">02 / Treatment</p>
                <button onClick={resetControls} className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground transition hover:text-foreground">
                  <RotateCcw className="size-3" /> Reset
                </button>
              </div>
              <Control label="Scanner speed" min={4} max={20} value={speed} onChange={setSpeed} />
              <Control label="Dot spacing" min={4} max={12} value={density} onChange={setDensity} suffix=" px" />
              <Control label="Contrast" min={8} max={24} value={contrast} onChange={setContrast} />
              <Control label="Window size" min={28} max={58} value={frameSize} onChange={setFrameSize} suffix="%" />
              <Control label="Portrait zoom" min={100} max={180} value={zoom} onChange={setZoom} suffix="%" />
              <Control label="Vertical focus" min={0} max={100} value={focalY} onChange={setFocalY} suffix="%" />
            </div>

            <div className="space-y-4 border-t border-white/10 pt-6">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">03 / Caption</p>
              <div className="space-y-2">
                <Label htmlFor="subject-name" className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Subject name</Label>
                <Input id="subject-name" maxLength={26} value={subjectName} onChange={(event) => setSubjectName(event.target.value)} className="h-10 rounded-none border-white/15 bg-black/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject-label" className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Small label</Label>
                <Input id="subject-label" maxLength={32} value={subjectLabel} onChange={(event) => setSubjectLabel(event.target.value)} className="h-10 rounded-none border-white/15 bg-black/20" />
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-white/10 bg-[#0b0b0d] p-5 sm:p-7">
            <Button
              disabled={!image || exportProgress > 0}
              size="lg"
              className="relative h-12 w-full overflow-hidden rounded-none text-xs font-semibold uppercase tracking-[0.13em]"
              onClick={exportVideo}
            >
              {exportProgress > 0 ? <><LoaderCircle className="animate-spin" /> Recording {exportProgress}%</> : <><Download /> Export 9 sec video</>}
              {exportProgress > 0 && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/25"><span className="block h-full bg-white" style={{ width: `${exportProgress}%` }} /></span>}
            </Button>
            <div className="mt-3 flex items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground" aria-live="polite">
              <span className="flex min-w-0 items-center gap-1.5 truncate"><Sparkles className="size-3 shrink-0 text-primary" /> {status}</span>
              <span className="shrink-0">WebM · 30 FPS</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
