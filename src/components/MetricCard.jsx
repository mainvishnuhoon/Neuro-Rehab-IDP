export function MetricCard({
  title,
  value,
  unit = '',
  icon: Icon,
  subtitle,
  variant = 'default', // 'default' | 'primary' | 'accent' | 'success'
  className = '',
}) {
  return (
    <div className={`metric-card metric-card--${variant} ${className}`}>
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        {Icon && (
          <div className="metric-icon-box">
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="metric-body">
        <span className="metric-value">{value}</span>
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      {subtitle && <div className="metric-footer">{subtitle}</div>}
    </div>
  );
}
