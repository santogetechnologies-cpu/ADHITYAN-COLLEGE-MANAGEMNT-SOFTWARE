import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Scan, Camera, AlertCircle, CheckCircle, X } from 'lucide-react';

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCodeScanned: (code: string, type: 'book' | 'student') => void;
  mode: 'issue' | 'return' | 'general';
}

export const QRScannerDialog = ({ open, onOpenChange, onCodeScanned, mode }: QRScannerDialogProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scanResult, setScanResult] = useState<{code: string, type: 'book' | 'student'} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startScanning = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsScanning(true);
      }
    } catch (err) {
      setError('Camera access denied. Please use manual input.');
    }
  };

  const stopScanning = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsScanning(false);
  };

  const simulateQRScan = () => {
    // Simulate QR code detection
    setTimeout(() => {
      const sampleCodes = {
        book: ['BK001', 'BK002', 'BK003', 'BK004'],
        student: ['ST001', 'ST002', 'ST003', 'ST004']
      };
      
      const type = Math.random() > 0.5 ? 'book' : 'student';
      const codes = sampleCodes[type];
      const code = codes[Math.floor(Math.random() * codes.length)];
      
      setScanResult({ code, type });
      stopScanning();
    }, 2000);
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      const type = manualInput.toUpperCase().startsWith('BK') ? 'book' : 'student';
      setScanResult({ code: manualInput.trim(), type });
    }
  };

  const handleUseResult = () => {
    if (scanResult) {
      onCodeScanned(scanResult.code, scanResult.type);
      onOpenChange(false);
      setScanResult(null);
      setManualInput('');
    }
  };

  useEffect(() => {
    if (!open) {
      stopScanning();
      setScanResult(null);
      setManualInput('');
      setError(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            QR Code Scanner
          </DialogTitle>
          <DialogDescription>
            Scan QR code on book or student ID card, or enter manually
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {scanResult && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Detected {scanResult.type}: <strong>{scanResult.code}</strong>
                </span>
                <Button size="sm" onClick={handleUseResult}>
                  Use This
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Camera Scanner */}
          <div className="space-y-3">
            <div className="border-2 border-dashed border-border rounded-lg p-6">
              {isScanning ? (
                <div className="space-y-3">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-48 bg-black rounded"
                  />
                  <div className="flex gap-2">
                    <Button onClick={simulateQRScan} className="flex-1">
                      <Scan className="h-4 w-4 mr-2" />
                      Simulate Scan
                    </Button>
                    <Button variant="outline" onClick={stopScanning}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Position QR code in camera view</p>
                  <Button onClick={startScanning}>
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Manual Input */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-xs text-muted-foreground">OR</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="manualCode">Enter Code Manually</Label>
              <div className="flex gap-2">
                <Input
                  id="manualCode"
                  placeholder="BK001 or ST001"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                />
                <Button variant="outline" onClick={handleManualSubmit}>
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Mode-specific information */}
          <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
            <p className="font-medium mb-1">
              {mode === 'issue' && '📚 Issue Mode: Scan book QR code then student ID'}
              {mode === 'return' && '📖 Return Mode: Scan book QR code to process return'}
              {mode === 'general' && '🔍 Scan any QR code for information'}
            </p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">Book: BK###</Badge>
              <Badge variant="outline" className="text-xs">Student: ST###</Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};