import React from 'react';

/**
 * KpiCard - Reusable metric display card for Admin Dashboard
 * Preserves exact styling, classes, and structure from AdminDashboardPage.
 */
export function KpiCard({
  title,
  label,
  value,
  unit,
  icon,
  iconVariant = 'icon-royal-navy',
  highlight = false,
  colorVariant = 'default',
  progress,
  note,
  formatter,
  className = '',
}) {
  const displayTitle = title || label || '';

  // Safe formatting and empty/invalid value handling
  const renderValue = () => {
    if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
      return 0;
    }
    if (formatter && typeof formatter === 'function') {
      return formatter(value);
    }
    if (typeof value === 'number') {
      return value.toLocaleString('vi-VN');
    }
    return value;
  };

  // Determine text color classes
  let numberClass = 'kpi-number';
  if (highlight || colorVariant === 'gold') {
    numberClass += ' gold-number';
  } else if (colorVariant === 'navy') {
    numberClass += ' navy-number';
  } else if (colorVariant === 'purple') {
    numberClass += ' purple-number';
  }

  // Progress clamp (0 - 100)
  const hasProgress = progress !== undefined && progress !== null;
  const clampedProgress = hasProgress ? Math.min(100, Math.max(0, Math.round(Number(progress) || 0))) : 0;

  return (
    <div className={`kpi-glass-card ${highlight ? 'highlight-gold' : ''} ${className}`.trim()}>
      <div className="kpi-top">
        <span className={`kpi-label ${highlight ? 'gold-label' : ''}`}>{displayTitle}</span>
        {icon && (
          <div className={`kpi-icon-wrap ${iconVariant}`}>
            {icon}
          </div>
        )}
      </div>

      <div className={numberClass}>
        {renderValue()}
        {unit && (
          <span className={`kpi-unit ${highlight ? 'gold-unit' : ''}`}>
            {unit}
          </span>
        )}
      </div>

      {hasProgress && (
        <div className="kpi-progress-track">
          <div
            className="kpi-progress-fill"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      )}

      {note && <div className="kpi-note">{note}</div>}
    </div>
  );
}
