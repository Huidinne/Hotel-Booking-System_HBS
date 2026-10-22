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
  as = 'input',
  rows = 3,
  children,
  ...props
}) {
  const hasError = Boolean(error);
  const inputId = id || name;

  const renderControl = () => {
    const commonClass = `custom-input ${hasError ? 'input-error' : ''}`;

    if (as === 'textarea') {
      return (
        <textarea
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={commonClass}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
          {...props}
        />
      );
    }

    if (as === 'select') {
      return (
        <select
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={`${commonClass} custom-select`}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
          {...props}
        >
          {children}
        </select>
      );
    }

    return (
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        className={commonClass}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${inputId}-error` : undefined}
        {...props}
      />
    );
  };

  return (
    <div className={`custom-form-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="custom-form-label">
          {label}
          {required && <span className="required-mark" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="custom-input-wrapper">
        {renderControl()}

        {hasError && as === 'input' && (
          <div className="input-trailing-icon" title={error}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-danger, #881337)"
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
        <div id={`${inputId}-error`} className="custom-error-feedback" role="alert">
          <span className="error-icon" aria-hidden="true" style={{ fontSize: '13px', lineHeight: 1 }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default CustomInput;
