import React, { useState } from 'react';
import { Card, Space, Tag, Empty, Typography } from 'antd';
import { InfoCircleOutlined, LineChartOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from '../../../theme/tokens.js';

const { Text } = Typography;

/**
 * Creates a smooth cubic Bezier curve path string from an array of 2D coordinates.
 */
function createSmoothPath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

export function AnalyticsChart({
  title,
  data = [],
  connected = true,
  pendingMessage = null,
  dateField = 'createdAt',
  groupBy = 'day',
  color = brandTokens.teal,
  height = 220,
  metricsSummary = [],
  unitLabel = 'event',
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const isDarkMode = useSelector((state) => state?.theme?.isDarkMode ?? false);
  const semantic = isDarkMode ? darkSemanticTokens : lightSemanticTokens;

  // Unconnected State (Minimalist, restrained)
  if (!connected) {
    return (
      <Card
        style={{
          borderRadius: 12,
          border: `1px solid ${semantic.borderDefault}`,
          background: semantic.bgCard,
          minHeight: 280,
        }}
        styles={{
          body: {
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 240,
          },
        }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div style={{ textAlign: 'center', maxWidth: 380 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: semantic.textPrimary, marginBottom: 4 }}>
                {title}
              </div>
              <div style={{ fontSize: 13, color: semantic.textSecondary }}>
                {pendingMessage || 'Analytics data source is not connected yet.'}
              </div>
            </div>
          }
        >
          <Tag
            color="default"
            icon={<InfoCircleOutlined />}
            style={{
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 12,
              background: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
              borderColor: semantic.borderDefault,
              color: semantic.textSecondary,
            }}
          >
            Not connected
          </Tag>
        </Empty>
      </Card>
    );
  }

  // Calculate totals and bounds
  const totalCount = data.reduce((acc, curr) => acc + (Number(curr.count) || 0), 0);
  const maxVal = Math.max(...data.map((d) => Number(d.count) || 0), 5);

  // Empty Data State
  if (data.length === 0 || totalCount === 0) {
    return (
      <Card
        title={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: semantic.textPrimary }}>{title}</span>
            <Tag color="default" style={{ borderRadius: 6, fontSize: 11 }}>0 total</Tag>
          </Space>
        }
        style={{
          borderRadius: 12,
          border: `1px solid ${semantic.borderDefault}`,
          background: semantic.bgCard,
        }}
        styles={{ body: { padding: '40px 20px', textAlign: 'center' } }}
      >
        {metricsSummary && metricsSummary.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, justifyContent: 'center' }}>
            {metricsSummary.map((m, idx) => (
              <Tag
                key={idx}
                color={m.color || 'default'}
                style={{ borderRadius: 6, padding: '4px 10px', fontSize: 12 }}
              >
                <span style={{ opacity: 0.85 }}>{m.label}:</span> <strong>{m.value}</strong>
              </Tag>
            ))}
          </div>
        )}
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: semantic.textSecondary, fontSize: 13 }}>
              No activity recorded in the selected date range.
            </span>
          }
        />
      </Card>
    );
  }

  // SVG Chart Layout
  const svgWidth = 600;
  const svgHeight = height;
  const paddingLeft = 45;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const xStep = chartWidth / (data.length > 1 ? data.length - 1 : 1);

  const points = data.map((d, index) => {
    const x = data.length === 1 ? chartWidth / 2 + paddingLeft : paddingLeft + index * xStep;
    const y = paddingTop + chartHeight - (Number(d.count) / maxVal) * chartHeight;
    return { ...d, x, y };
  });

  const smoothPathD = createSmoothPath(points);
  const smoothAreaD =
    points.length > 1
      ? `${smoothPathD} L ${points[points.length - 1].x.toFixed(1)} ${paddingTop + chartHeight} L ${points[0].x.toFixed(1)} ${paddingTop + chartHeight} Z`
      : '';

  const gridLineColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';
  const axisTextColor = isDarkMode ? '#8fa9b5' : '#64748b';
  const gradId = `gradient-${title.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 8 }}>
          <Space size={8}>
            <LineChartOutlined style={{ color, fontSize: 16 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: semantic.textPrimary }}>{title}</span>
          </Space>
          <Space size={6}>
            <Tag
              color="default"
              style={{
                fontSize: 11,
                borderRadius: 4,
                background: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                borderColor: semantic.borderDefault,
                color: semantic.textSecondary,
              }}
            >
              Grouped by {groupBy}
            </Tag>
            <Tag
              color="cyan"
              style={{
                fontSize: 11,
                borderRadius: 4,
                fontWeight: 600,
              }}
            >
              {totalCount} Total {unitLabel}{totalCount === 1 ? '' : 's'}
            </Tag>
          </Space>
        </div>
      }
      style={{
        borderRadius: 12,
        border: `1px solid ${semantic.borderDefault}`,
        background: semantic.bgCard,
      }}
      styles={{ body: { padding: '16px 20px 20px 20px' } }}
    >
      {/* Optional Metrics Summary Badges Bar */}
      {metricsSummary && metricsSummary.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 16,
            padding: '10px 14px',
            borderRadius: 8,
            background: isDarkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.015)',
            border: `1px solid ${semantic.borderSubtle}`,
          }}
        >
          {metricsSummary.map((m, idx) => (
            <Tag
              key={idx}
              color={m.color || 'default'}
              style={{ borderRadius: 6, padding: '2px 8px', fontSize: 11, margin: 0 }}
            >
              <span style={{ opacity: 0.85 }}>{m.label}:</span> <strong>{m.value}</strong>
            </Tag>
          ))}
        </div>
      )}

      <div style={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          role="img"
          aria-label={`${title} chart`}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={isDarkMode ? 0.42 : 0.25} />
              <stop offset="100%" stopColor={color} stopOpacity="0.01" />
            </linearGradient>
            <style>{`
              @media (prefers-reduced-motion: no-preference) {
                .chart-smooth-path {
                  transition: d 0.3s ease, stroke 0.2s ease;
                }
              }
              @media (prefers-reduced-motion: reduce) {
                .chart-smooth-path {
                  transition: none !important;
                }
              }
            `}</style>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = paddingTop + chartHeight * (1 - pct);
            const val = Math.round(pct * maxVal);
            return (
              <g key={pct}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke={gridLineColor}
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill={axisTextColor}
                  fontSize="11"
                  fontFamily="sans-serif"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          {smoothAreaD && <path d={smoothAreaD} fill={`url(#${gradId})`} />}

          {/* Smooth Line stroke */}
          {smoothPathD && (
            <path
              className="chart-smooth-path"
              d={smoothPathD}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Hover guideline */}
          {hoveredPoint !== null && points[hoveredPoint] && (
            <line
              x1={points[hoveredPoint].x}
              y1={paddingTop}
              x2={points[hoveredPoint].x}
              y2={paddingTop + chartHeight}
              stroke={isDarkMode ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)'}
              strokeDasharray="3 3"
              strokeWidth="1.5"
            />
          )}

          {/* Data Points / Columns */}
          {points.map((p, i) => {
            const isHovered = hoveredPoint === i;
            let dateLabel = '';
            try {
              dateLabel = new Date(p.bucket).toLocaleDateString(undefined, {
                month: 'short',
                day: groupBy === 'month' ? undefined : 'numeric',
                year: groupBy === 'year' ? 'numeric' : undefined,
              });
            } catch {
              dateLabel = String(p.bucket);
            }

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredPoint(i)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Column hit area */}
                <rect
                  x={p.x - 12}
                  y={paddingTop}
                  width="24"
                  height={chartHeight}
                  fill="transparent"
                />

                {/* Outer halo when hovered */}
                {isHovered && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={8}
                    fill={color}
                    opacity="0.25"
                  />
                )}

                {/* Point circle */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5.5 : 3.5}
                  fill={isHovered ? (isDarkMode ? '#ffffff' : brandTokens.navy) : color}
                  stroke={isDarkMode ? '#0d1820' : '#ffffff'}
                  strokeWidth="2"
                />

                {/* X Axis label (staggered if many points) */}
                {(data.length <= 12 || i % Math.ceil(data.length / 8) === 0 || i === data.length - 1) && (
                  <text
                    x={p.x}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    fill={axisTextColor}
                    fontSize="11"
                    fontFamily="sans-serif"
                  >
                    {dateLabel}
                  </text>
                )}
              </g>
            );
          })}

          {/* Modern Floating Hover Tooltip Overlay */}
          {hoveredPoint !== null && points[hoveredPoint] && (() => {
            const pt = points[hoveredPoint];
            let formattedDate = '';
            try {
              formattedDate = new Date(pt.bucket).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });
            } catch {
              formattedDate = String(pt.bucket);
            }

            const tooltipWidth = 140;
            const tooltipHeight = 44;
            let tooltipX = pt.x - tooltipWidth / 2;
            if (tooltipX < paddingLeft) tooltipX = paddingLeft;
            if (tooltipX + tooltipWidth > svgWidth - paddingRight) {
              tooltipX = svgWidth - paddingRight - tooltipWidth;
            }
            let tooltipY = pt.y - tooltipHeight - 10;
            if (tooltipY < 5) tooltipY = pt.y + 12;

            return (
              <g>
                <rect
                  x={tooltipX}
                  y={tooltipY}
                  width={tooltipWidth}
                  height={tooltipHeight}
                  rx="8"
                  fill={isDarkMode ? '#1e3341' : brandTokens.navy}
                  stroke={isDarkMode ? 'rgba(79, 168, 192, 0.4)' : 'rgba(0,0,0,0.1)'}
                  strokeWidth="1"
                  opacity="0.96"
                  filter="drop-shadow(0 4px 6px rgba(0,0,0,0.15))"
                />
                <text
                  x={tooltipX + tooltipWidth / 2}
                  y={tooltipY + 18}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  {pt.count} {unitLabel}{pt.count === 1 ? '' : 's'}
                </text>
                <text
                  x={tooltipX + tooltipWidth / 2}
                  y={tooltipY + 34}
                  textAnchor="middle"
                  fill={isDarkMode ? '#8fa9b5' : 'rgba(255,255,255,0.7)'}
                  fontSize="10"
                  fontFamily="sans-serif"
                >
                  {formattedDate}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </Card>
  );
}

export default AnalyticsChart;
