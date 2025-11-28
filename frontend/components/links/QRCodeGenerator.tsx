'use client';

import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button, Input, Label } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

interface QRCodeGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title?: string;
}

export function QRCodeGenerator({
  open,
  onOpenChange,
  url,
  title,
}: QRCodeGeneratorProps) {
  const [size, setSize] = React.useState(256);
  const [fgColor, setFgColor] = React.useState('#000000');
  const [bgColor, setBgColor] = React.useState('#ffffff');
  const [copied, setCopied] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const handleDownload = (format: 'png' | 'svg') => {
    if (!canvasRef.current) return;

    if (format === 'png') {
      const canvas = canvasRef.current;
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-code-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleCopyImage = async () => {
    if (!canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy image:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code Generator</DialogTitle>
          <DialogDescription>
            {title || 'Customize and download your QR code'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Code Preview */}
          <div className="flex justify-center rounded-lg border bg-white p-8">
            <QRCodeCanvas
              value={url}
              size={size}
              fgColor={fgColor}
              bgColor={bgColor}
              level="H"
              includeMargin
              ref={canvasRef}
            />
          </div>

          {/* Customization Options */}
          <div className="space-y-4">
            {/* Size */}
            <div className="space-y-2">
              <Label htmlFor="size">Size (px)</Label>
              <Select
                value={size.toString()}
                onValueChange={(value) => setSize(Number(value))}
              >
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="128">128px</SelectItem>
                  <SelectItem value="256">256px</SelectItem>
                  <SelectItem value="512">512px</SelectItem>
                  <SelectItem value="1024">1024px</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fgColor">Foreground Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="fgColor"
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="h-10 w-full"
                  />
                  <Input
                    type="text"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="h-10 w-24 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bgColor">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="bgColor"
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-10 w-full"
                  />
                  <Input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-10 w-24 font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => handleDownload('png')}
              className="flex-1"
              variant="default"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PNG
            </Button>
            <Button
              onClick={handleCopyImage}
              className="flex-1"
              variant="outline"
              disabled={copied}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Image
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
