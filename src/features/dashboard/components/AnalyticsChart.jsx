import React, { useState } from 'react';
import { Card, Space, Tag, Empty, Typography } from 'antd';
import { InfoCircleOutlined, LineChartOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from '../../../theme/tokens.js';

const { Text } = Typography;

export function AnalyticsChart({
  title,
  data = [],
  connected = true,
  pendingMessage = null,
  dateField = 'createdAt',
  groupBy = 'day',
  color = brandTokens.teal,
  height = 220,
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
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

  const pathD =
    data.length === 1
      ? ''
      : points.reduce(
          (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
          ''
        );

  const areaD =
    data.length === 1
      ? ''
      : `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

  const gridLineColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';
  const axisTextColor = isDarkMode ? '#8fa9b5' : '#64748b';

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 8 }}>
          <Space size={8}>
            <LineChartOutlined style={{ color: brandTokens.teal, fontSize: 16 }} />
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
              {totalCount} Total Events
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
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          role="img"
          aria-label={`${title} chart`}
        >
          <defs>
            <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={isDarkMode ? 0.45 : 0.28} />
              <stop offset="100%" stopColor={color} stopOpacity="0.01" />
            </linearGradient>
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
          {areaD && <path d={areaD} fill={`url(#gradient-${title})`} />}

          {/* Line stroke */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points / Columns */}
          {points.map((p, i) => {
            const isHovered = hoveredPoint === i;
            const dateLabel = new Date(p.bucket).toLocaleDateString(undefined, {
              month: 'short',
              day: groupBy === 'month' ? undefined : 'numeric',
              year: groupBy === 'year' ? 'numeric' : undefined,
            });

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

                {/* Point circle */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 4}
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

          {/* Hover Tooltip Overlay */}
          {hoveredPoint !== null && points[hoveredPoint] && (
            <g>
              <rect
                x={points[hoveredPoint].x - 55}
                y={points[hoveredPoint].y - 36}
                width="110"
                height="26"
                rx="6"
                fill={isDarkMode ? '#1e3341' : brandTokens.navy}
                stroke={isDarkMode ? 'rgba(79, 168, 192, 0.4)' : 'transparent'}
                strokeWidth="1"
                opacity="0.95"
              />
              <text
                x={points[hoveredPoint].x}
                y={points[hoveredPoint].y - 19}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="11"
                fontWeight="600"
                fontFamily="sans-serif"
              >
                {points[hoveredPoint].count} event{points[hoveredPoint].count === 1 ? '' : 's'}
              </text>
            </g>
          )}
        </svg>
      </div>
    </Card>
  );
}

export default AnalyticsChart;
