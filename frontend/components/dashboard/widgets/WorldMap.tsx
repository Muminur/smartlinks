'use client';

import { useRef, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CountryData {
  code: string;
  name: string;
  clicks: number;
  percentage: number;
}

interface WorldMapProps {
  data: CountryData[];
  isLoading?: boolean;
  className?: string;
}

// Country coordinates for plotting (simplified centroid positions)
const countryCoordinates: Record<string, { x: number; y: number }> = {
  US: { x: 120, y: 180 },
  CA: { x: 130, y: 120 },
  MX: { x: 110, y: 220 },
  BR: { x: 200, y: 320 },
  AR: { x: 180, y: 400 },
  GB: { x: 350, y: 140 },
  DE: { x: 380, y: 150 },
  FR: { x: 360, y: 165 },
  ES: { x: 340, y: 190 },
  IT: { x: 385, y: 180 },
  NL: { x: 370, y: 140 },
  BE: { x: 368, y: 150 },
  PL: { x: 400, y: 145 },
  UA: { x: 430, y: 150 },
  RU: { x: 500, y: 120 },
  CN: { x: 600, y: 200 },
  JP: { x: 680, y: 200 },
  KR: { x: 660, y: 195 },
  IN: { x: 540, y: 240 },
  AU: { x: 680, y: 380 },
  NZ: { x: 750, y: 420 },
  ZA: { x: 420, y: 380 },
  NG: { x: 380, y: 280 },
  EG: { x: 420, y: 230 },
  AE: { x: 480, y: 235 },
  SA: { x: 460, y: 240 },
  ID: { x: 620, y: 310 },
  PH: { x: 650, y: 275 },
  TH: { x: 590, y: 270 },
  VN: { x: 600, y: 265 },
  SG: { x: 600, y: 300 },
  MY: { x: 595, y: 295 },
  PK: { x: 515, y: 220 },
  BD: { x: 555, y: 235 },
  TR: { x: 430, y: 190 },
  IL: { x: 435, y: 210 },
  SE: { x: 390, y: 110 },
  NO: { x: 375, y: 100 },
  FI: { x: 410, y: 100 },
  DK: { x: 378, y: 128 },
  AT: { x: 390, y: 165 },
  CH: { x: 375, y: 165 },
  PT: { x: 330, y: 190 },
  IE: { x: 335, y: 140 },
  GR: { x: 410, y: 195 },
  CZ: { x: 390, y: 155 },
  RO: { x: 415, y: 170 },
  HU: { x: 400, y: 165 },
};

// Country names mapping
const countryNames: Record<string, string> = {
  US: 'United States',
  CA: 'Canada',
  MX: 'Mexico',
  BR: 'Brazil',
  AR: 'Argentina',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  NL: 'Netherlands',
  BE: 'Belgium',
  PL: 'Poland',
  UA: 'Ukraine',
  RU: 'Russia',
  CN: 'China',
  JP: 'Japan',
  KR: 'South Korea',
  IN: 'India',
  AU: 'Australia',
  NZ: 'New Zealand',
  ZA: 'South Africa',
  NG: 'Nigeria',
  EG: 'Egypt',
  AE: 'UAE',
  SA: 'Saudi Arabia',
  ID: 'Indonesia',
  PH: 'Philippines',
  TH: 'Thailand',
  VN: 'Vietnam',
  SG: 'Singapore',
  MY: 'Malaysia',
  PK: 'Pakistan',
  BD: 'Bangladesh',
  TR: 'Turkey',
  IL: 'Israel',
  SE: 'Sweden',
  NO: 'Norway',
  FI: 'Finland',
  DK: 'Denmark',
  AT: 'Austria',
  CH: 'Switzerland',
  PT: 'Portugal',
  IE: 'Ireland',
  GR: 'Greece',
  CZ: 'Czech Republic',
  RO: 'Romania',
  HU: 'Hungary',
};

export function WorldMap({ data, isLoading = false, className }: WorldMapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<CountryData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const maxClicks = useMemo(() => {
    if (!data.length) return 1;
    return Math.max(...data.map(d => d.clicks));
  }, [data]);

  const getCircleSize = (clicks: number) => {
    const minSize = 6;
    const maxSize = 24;
    const ratio = clicks / maxClicks;
    return minSize + (maxSize - minSize) * Math.sqrt(ratio);
  };

  const getCircleColor = (clicks: number) => {
    const ratio = clicks / maxClicks;
    if (ratio > 0.7) return '#ef4444'; // red
    if (ratio > 0.4) return '#f97316'; // orange
    if (ratio > 0.2) return '#eab308'; // yellow
    return '#22c55e'; // green
  };

  const handleMouseMove = (e: React.MouseEvent, _country: CountryData) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  if (isLoading) {
    return (
      <Card className={cn('h-[400px]', className)}>
        <CardHeader>
          <CardTitle>Geographic Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <div className="animate-pulse text-muted-foreground">Loading map data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle>Geographic Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="relative w-full h-[350px] bg-muted/30 rounded-lg overflow-hidden"
        >
          {/* SVG World Map Outline (simplified) */}
          <svg
            viewBox="0 0 800 500"
            className="absolute inset-0 w-full h-full"
            style={{ opacity: 0.3 }}
          >
            {/* Simplified continent outlines */}
            <path
              d="M50,100 Q150,80 250,150 L200,300 Q100,250 50,200 Z"
              fill="currentColor"
              className="text-muted-foreground/20"
            />
            <path
              d="M150,280 Q180,250 220,280 L250,450 Q180,480 140,400 Z"
              fill="currentColor"
              className="text-muted-foreground/20"
            />
            <path
              d="M300,100 Q450,80 500,150 L480,220 Q380,240 320,180 Z"
              fill="currentColor"
              className="text-muted-foreground/20"
            />
            <path
              d="M350,220 Q450,200 480,280 L450,400 Q380,420 350,350 Z"
              fill="currentColor"
              className="text-muted-foreground/20"
            />
            <path
              d="M480,100 Q650,50 750,150 L700,300 Q550,350 480,250 Z"
              fill="currentColor"
              className="text-muted-foreground/20"
            />
            <path
              d="M620,320 Q700,300 750,350 L730,450 Q650,480 620,400 Z"
              fill="currentColor"
              className="text-muted-foreground/20"
            />
          </svg>

          {/* Country markers */}
          <svg viewBox="0 0 800 500" className="absolute inset-0 w-full h-full">
            {data.map((country) => {
              const coords = countryCoordinates[country.code];
              if (!coords) return null;

              const size = getCircleSize(country.clicks);
              const color = getCircleColor(country.clicks);

              return (
                <g
                  key={country.code}
                  onMouseEnter={() => setHoveredCountry(country)}
                  onMouseLeave={() => setHoveredCountry(null)}
                  onMouseMove={(e) => handleMouseMove(e, country)}
                  className="cursor-pointer transition-transform hover:scale-110"
                  style={{ transformOrigin: `${coords.x}px ${coords.y}px` }}
                >
                  {/* Outer glow */}
                  <circle
                    cx={coords.x}
                    cy={coords.y}
                    r={size + 4}
                    fill={color}
                    opacity={0.2}
                  />
                  {/* Main circle */}
                  <circle
                    cx={coords.x}
                    cy={coords.y}
                    r={size}
                    fill={color}
                    opacity={0.8}
                  />
                  {/* Inner highlight */}
                  <circle
                    cx={coords.x - size * 0.2}
                    cy={coords.y - size * 0.2}
                    r={size * 0.3}
                    fill="white"
                    opacity={0.3}
                  />
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {hoveredCountry && (
            <div
              className="absolute z-50 bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-lg text-sm pointer-events-none"
              style={{
                left: tooltipPosition.x + 10,
                top: tooltipPosition.y - 40,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="font-semibold">
                {countryNames[hoveredCountry.code] || hoveredCountry.name}
              </div>
              <div className="text-muted-foreground">
                {hoveredCountry.clicks.toLocaleString()} clicks ({hoveredCountry.percentage.toFixed(1)}%)
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-muted-foreground">High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Very High</span>
          </div>
        </div>

        {/* Top Countries List */}
        {data.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Top Countries</h4>
            <div className="grid grid-cols-2 gap-2">
              {data.slice(0, 6).map((country, index) => (
                <div
                  key={country.code}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">{index + 1}.</span>
                    <span className="text-sm font-medium">
                      {countryNames[country.code] || country.name}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {country.clicks.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.length === 0 && (
          <div className="mt-4 text-center text-muted-foreground">
            No geographic data available yet. Clicks will appear here as they are tracked.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WorldMap;
