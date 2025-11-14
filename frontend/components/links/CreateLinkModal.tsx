'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Link as LinkIcon,
  Loader2,
  Check,
  X,
  Eye,
  EyeOff,
  Info,
  Calendar,
  Hash,
  Lock,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button, Input, Label, Checkbox } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Alert } from '@/components/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  createLinkSchema,
  type CreateLinkFormData,
} from '@/lib/validations/link-validations';
import {
  useCreateLink,
  useCheckSlugAvailability,
  useGetLinkPreview,
} from '@/hooks/useLinks';
import { debounce } from '@/lib/utils';
import { toast } from 'sonner';

interface CreateLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (linkId: string) => void;
}

export function CreateLinkModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateLinkModalProps) {
  const [step, setStep] = React.useState<'basic' | 'advanced'>('basic');
  const [showPassword, setShowPassword] = React.useState(false);
  const [customSlugStatus, setCustomSlugStatus] = React.useState<
    'idle' | 'checking' | 'available' | 'unavailable'
  >('idle');
  const [urlMetadata, setUrlMetadata] = React.useState<{
    title?: string;
    description?: string;
    image?: string;
    favicon?: string;
  } | null>(null);

  const createMutation = useCreateLink();
  const checkSlugMutation = useCheckSlugAvailability();
  const getPreviewMutation = useGetLinkPreview();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<CreateLinkFormData>({
    resolver: zodResolver(createLinkSchema) as any,
    defaultValues: {
      generateQR: false,
      tags: [],
    },
  });

  const originalUrl = watch('originalUrl');
  const customSlug = watch('customSlug');
  const hasPassword = watch('password');

  // Debounced slug availability check
  const checkSlugDebounced = React.useMemo(
    () =>
      (debounce as any)(async (slug: string) => {
        if (!slug || slug.length < 3) {
          setCustomSlugStatus('idle');
          return;
        }

        setCustomSlugStatus('checking');
        try {
          const result = await checkSlugMutation.mutateAsync(slug);
          setCustomSlugStatus(result.available ? 'available' : 'unavailable');
        } catch {
          setCustomSlugStatus('idle');
        }
      }, 500),
    [checkSlugMutation]
  );

  // Watch custom slug and check availability
  React.useEffect(() => {
    if (customSlug) {
      checkSlugDebounced(customSlug);
    } else {
      setCustomSlugStatus('idle');
    }
  }, [customSlug, checkSlugDebounced]);

  // Fetch URL metadata when URL changes
  React.useEffect(() => {
    if (originalUrl && originalUrl.length > 10) {
      const timeoutId = setTimeout(async () => {
        try {
          const metadata = await getPreviewMutation.mutateAsync(originalUrl);
          setUrlMetadata(metadata);

          // Auto-fill title if empty
          if (metadata.title && !watch('title')) {
            setValue('title', metadata.title);
          }
        } catch {
          // Silently fail
        }
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [originalUrl, getPreviewMutation, setValue, watch]);

  const onSubmit = async (data: CreateLinkFormData) => {
    createMutation.mutate(data, {
      onSuccess: (link) => {
        toast.success('Link created successfully!');
        reset();
        setStep('basic');
        setUrlMetadata(null);
        onOpenChange(false);
        onSuccess?.(link._id);
      },
    });
  };

  const handleClose = () => {
    reset();
    setStep('basic');
    setUrlMetadata(null);
    setCustomSlugStatus('idle');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Short Link</DialogTitle>
          <DialogDescription>
            {step === 'basic'
              ? 'Enter the URL you want to shorten'
              : 'Customize your short link with advanced options'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
          {step === 'basic' ? (
            <>
              {/* Original URL */}
              <div className="space-y-2">
                <Label htmlFor="originalUrl">
                  Destination URL <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="originalUrl"
                    type="url"
                    placeholder="https://example.com/very-long-url"
                    {...register('originalUrl')}
                    className="pl-10"
                    autoFocus
                  />
                </div>
                {errors.originalUrl && (
                  <p className="text-sm text-destructive">
                    {errors.originalUrl.message}
                  </p>
                )}
              </div>

              {/* URL Metadata Preview */}
              {urlMetadata && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex gap-3">
                    {urlMetadata.favicon && (
                      <img
                        src={urlMetadata.favicon}
                        alt=""
                        className="h-10 w-10 rounded"
                      />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="font-medium">
                        {urlMetadata.title || 'No title found'}
                      </div>
                      {urlMetadata.description && (
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {urlMetadata.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Slug */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="customSlug">
                    Custom Slug (Optional)
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-sm">
                          Create a custom short URL. Leave empty for auto-generated slug.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="relative">
                  <Input
                    id="customSlug"
                    type="text"
                    placeholder="my-custom-slug"
                    {...register('customSlug')}
                  />
                  {customSlugStatus !== 'idle' && (
                    <div className="absolute right-3 top-3">
                      {customSlugStatus === 'checking' && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {customSlugStatus === 'available' && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                      {customSlugStatus === 'unavailable' && (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  )}
                </div>
                {errors.customSlug && (
                  <p className="text-sm text-destructive">
                    {errors.customSlug.message}
                  </p>
                )}
                {customSlugStatus === 'unavailable' && (
                  <p className="text-sm text-destructive">
                    This slug is already taken
                  </p>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title (Optional)</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="My awesome link"
                  {...register('title')}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Add a description for this link"
                  {...register('description')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                {errors.description && (
                  <p className="text-sm text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* Expiration Date */}
              <div className="space-y-2">
                <Label htmlFor="expiresAt" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Expiration Date (Optional)
                </Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  {...register('expiresAt')}
                />
                {errors.expiresAt && (
                  <p className="text-sm text-destructive">
                    {errors.expiresAt.message}
                  </p>
                )}
              </div>

              {/* Max Clicks */}
              <div className="space-y-2">
                <Label htmlFor="maxClicks" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Maximum Clicks (Optional)
                </Label>
                <Input
                  id="maxClicks"
                  type="number"
                  placeholder="1000"
                  {...register('maxClicks', { valueAsNumber: true })}
                />
                {errors.maxClicks && (
                  <p className="text-sm text-destructive">
                    {errors.maxClicks.message}
                  </p>
                )}
              </div>

              {/* Password Protection */}
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Password Protection (Optional)
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    {...register('password')}
                  />
                  {hasPassword && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  )}
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Generate QR Code */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generateQR"
                  {...register('generateQR')}
                />
                <label
                  htmlFor="generateQR"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Generate QR code for this link
                </label>
              </div>
            </>
          )}

          {/* Form Actions */}
          <div className="flex justify-between gap-3">
            {step === 'basic' ? (
              <>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={
                      createMutation.isPending ||
                      customSlugStatus === 'unavailable' ||
                      customSlugStatus === 'checking'
                    }
                  >
                    {createMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Link
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('advanced')}
                  >
                    Advanced Options
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('basic')}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending ||
                    customSlugStatus === 'unavailable' ||
                    customSlugStatus === 'checking'
                  }
                >
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Link
                </Button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
