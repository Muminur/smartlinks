import * as React from 'react';
import { Input, InputProps } from './Input';
import { cn } from '@/lib/utils';
import {
  calculatePasswordStrength,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
} from '@/lib/validations/auth';

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  showStrength?: boolean;
  label?: string;
  error?: string;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showStrength = false, label, error, className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [strength, setStrength] = React.useState(0);

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const password = e.target.value;
      if (showStrength) {
        setStrength(calculatePasswordStrength(password));
      }
      // Call the onChange prop if it exists
      if (props.onChange) {
        props.onChange(e);
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <Input
            {...props}
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            onChange={handlePasswordChange}
            className={cn(error && 'border-red-500 focus-visible:ring-red-500', className)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        {showStrength && props.value && (
          <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-600">Password strength:</span>
              <span
                className={cn(
                  'text-xs font-medium',
                  strength === 0 && 'text-red-600',
                  strength === 1 && 'text-orange-600',
                  strength === 2 && 'text-yellow-600',
                  strength === 3 && 'text-lime-600',
                  strength === 4 && 'text-green-600'
                )}
              >
                {getPasswordStrengthLabel(strength)}
              </span>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map(index => (
                <div
                  key={index}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-all duration-300',
                    index <= strength
                      ? getPasswordStrengthColor(strength)
                      : 'bg-gray-200'
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
