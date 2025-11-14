'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Trash2, Eye, EyeOff, Calendar, Hash, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button, Input, Label, Checkbox } from '@/components/ui';
import { Badge } from '@/components/ui';
import {
  updateLinkSchema,
  type UpdateLinkFormData,
} from '@/lib/validations/link-validations';
import { useUpdateLink, useDeleteLink } from '@/hooks/useLinks';
import type { Link } from '@/types';

interface EditLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: Link;
  onDeleted?: () => void;
}

export function EditLinkModal({
  open,
  onOpenChange,
  link,
  onDeleted,
}: EditLinkModalProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  const updateMutation = useUpdateLink();
  const deleteMutation = useDeleteLink();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateLinkFormData>({
    resolver: zodResolver(updateLinkSchema),
    defaultValues: {
      title: link.title || '',
      description: link.description || '',
      tags: link.tags || [],
      isActive: link.isActive,
      expiresAt: link.expiresAt ? new Date(link.expiresAt).toISOString().slice(0, 16) : '',
      maxClicks: link.maxClicks || undefined,
      password: '',
    },
  });

  const onSubmit = async (data: UpdateLinkFormData) => {
    // Remove empty fields
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== '' && v !== undefined)
    );

    updateMutation.mutate(
      { id: link._id, data: cleanData },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(link._id, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        onOpenChange(false);
        onDeleted?.();
      },
    });
  };

  React.useEffect(() => {
    if (open) {
      reset({
        title: link.title || '',
        description: link.description || '',
        tags: link.tags || [],
        isActive: link.isActive,
        expiresAt: link.expiresAt ? new Date(link.expiresAt).toISOString().slice(0, 16) : '',
        maxClicks: link.maxClicks || undefined,
        password: '',
      });
    }
  }, [open, link, reset]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Link</DialogTitle>
            <DialogDescription>
              Update the details of your shortened link
            </DialogDescription>
          </DialogHeader>

          {/* Original URL Display */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Original URL:
            </div>
            <a
              href={link.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline break-all"
            >
              {link.originalUrl}
            </a>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
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

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
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

            {/* Status Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox id="isActive" {...register('isActive')} />
              <label
                htmlFor="isActive"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Link is active
              </label>
            </div>

            {/* Expiration Date */}
            <div className="space-y-2">
              <Label htmlFor="expiresAt" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Expiration Date
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
                Maximum Clicks
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
              {link.maxClicks && (
                <p className="text-sm text-muted-foreground">
                  Current: {link.clicks} / {link.maxClicks} clicks
                </p>
              )}
            </div>

            {/* Password Protection */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Update Password {link.isPasswordProtected && <Badge variant="outline">Protected</Badge>}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={link.isPasswordProtected ? 'Enter new password' : 'Set password'}
                  {...register('password')}
                />
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
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-between gap-3">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Link
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the link{' '}
              <code className="rounded bg-muted px-1 py-0.5">{link.slug}</code> and all
              associated analytics data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
