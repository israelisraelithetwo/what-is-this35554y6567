import React, { useRef, useEffect, useState } from 'react';
import SignaturePad from 'signature_pad';

interface SignaturePadComponentProps {
  onSave: (dataUrl: string) => void;
  penColor?: string;
  backgroundColor?: string;
}

export const SignaturePadComponent: React.FC<SignaturePadComponentProps> = ({
  onSave,
  penColor = '#000000',
  backgroundColor = '#ffffff',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const signaturePad = new SignaturePad(canvas, {
      penColor,
      backgroundColor,
    });

    signaturePadRef.current = signaturePad;

    // Resize canvas to fit container
    const resizeCanvas = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);
      signaturePad.clear();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Track if pad is empty
    const handleBeginStroke = () => setIsEmpty(false);
    signaturePad.addEventListener('beginStroke', handleBeginStroke);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      signaturePad.removeEventListener('beginStroke', handleBeginStroke);
    };
  }, [penColor, backgroundColor]);

  const handleClear = () => {
    signaturePadRef.current?.clear();
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      alert('Please provide a signature first.');
      return;
    }

    const dataUrl = signaturePadRef.current.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="w-full">
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="w-full touch-none"
          style={{ height: '200px' }}
        />
      </div>
      
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={handleClear}
          className="btn btn-secondary flex-1"
          disabled={isEmpty}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="btn btn-primary flex-1"
          disabled={isEmpty}
        >
          Save Signature
        </button>
      </div>
    </div>
  );
};
