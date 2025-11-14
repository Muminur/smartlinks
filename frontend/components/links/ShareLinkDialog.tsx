'use client';

import React from 'react';
import {
  Copy,
  Check,
  Mail,
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  QrCode,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button, Input } from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { copyToClipboard } from '@/lib/utils';
import { toast } from 'sonner';

interface ShareLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title?: string;
  onShowQRCode?: () => void;
}

export function ShareLinkDialog({
  open,
  onOpenChange,
  url,
  title = '',
  onShowQRCode,
}: ShareLinkDialogProps) {
  const [copied, setCopied] = React.useState(false);
  const [embedCopied, setEmbedCopied] = React.useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyEmbed = async () => {
    const embedCode = `<a href="${url}" target="_blank" rel="noopener noreferrer">${title || url}</a>`;
    const success = await copyToClipboard(embedCode);
    if (success) {
      setEmbedCopied(true);
      toast.success('Embed code copied!');
      setTimeout(() => setEmbedCopied(false), 2000);
    }
  };

  const handleSocialShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);

    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  const embedCode = `<a href="${url}" target="_blank" rel="noopener noreferrer">${title || url}</a>`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Link</DialogTitle>
          <DialogDescription>
            Share this link across different platforms
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="direct" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="direct">Direct</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="embed">Embed</TabsTrigger>
          </TabsList>

          {/* Direct Share Tab */}
          <TabsContent value="direct" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Short URL</label>
              <div className="flex gap-2">
                <Input value={url} readOnly className="font-mono text-sm" />
                <Button onClick={handleCopy} variant="outline" className="shrink-0">
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {onShowQRCode && (
              <Button
                onClick={onShowQRCode}
                variant="outline"
                className="w-full"
              >
                <QrCode className="mr-2 h-4 w-4" />
                View QR Code
              </Button>
            )}
          </TabsContent>

          {/* Social Share Tab */}
          <TabsContent value="social" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleSocialShare('twitter')}
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
              >
                <Twitter className="h-6 w-6" />
                <span className="text-sm">Twitter</span>
              </Button>
              <Button
                onClick={() => handleSocialShare('facebook')}
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
              >
                <Facebook className="h-6 w-6" />
                <span className="text-sm">Facebook</span>
              </Button>
              <Button
                onClick={() => handleSocialShare('linkedin')}
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
              >
                <Linkedin className="h-6 w-6" />
                <span className="text-sm">LinkedIn</span>
              </Button>
              <Button
                onClick={() => handleSocialShare('email')}
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
              >
                <Mail className="h-6 w-6" />
                <span className="text-sm">Email</span>
              </Button>
            </div>
          </TabsContent>

          {/* Embed Tab */}
          <TabsContent value="embed" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Embed Code</label>
              <div className="relative">
                <pre className="rounded-lg border bg-muted p-4 text-sm">
                  <code className="break-all">{embedCode}</code>
                </pre>
                <Button
                  onClick={handleCopyEmbed}
                  variant="outline"
                  size="sm"
                  className="absolute right-2 top-2"
                >
                  {embedCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Copy and paste this HTML code into your website to embed the link.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
