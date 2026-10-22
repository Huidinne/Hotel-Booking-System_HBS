import React from 'react';

/**
 * CustomInput Component with Custom Validation UI
 * - Disables HTML5 native popups
 * - Visual error indication (CSS Variable --color-danger border and soft background)
 * - Animated error message with warning icon
 * - Supports seamless onBlur & onSubmit validation
 */
export function CustomInput({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  error = '',
  disabled = false,
  autoComplete,
  className = '',
  ...props
}) {
  const hasError = Boolean(error);

  return (
    <div className={`custom-form-group ${className}`}>
      {label && (
        <label htmlFor={id || name} className="custom-form-label">
          {label}
          {required && <span className="required-mark" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="custom-input-wrapper">
        <input
          id={id || name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`custom-input ${hasError ? 'input-error' : ''}`}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id || name}-error` : undefined}
          {...props}
        />

        {hasError && (
          <div className="input-trailing-icon" title={error}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-danger, #EF4444)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        )}
      </div>

      {hasError && (
        <div id={`${id || name}-error`} className="custom-error-feedback" role="alert">
          <span className="error-icon" aria-hidden="true" style={{ fontSize: '13px', lineHeight: 1 }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default CustomInput;
