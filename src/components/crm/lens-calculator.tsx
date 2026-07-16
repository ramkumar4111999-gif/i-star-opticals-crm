'use client';

import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Eye,
  RotateCcw,
  Info,
  Sparkles,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Minus,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { useCrmStore } from '@/components/crm/store';

// ───────────────────────────────────────────────
// Price Data (i Star Opticals pricing)
// ───────────────────────────────────────────────

const LENS_PRICES: Record<string, Record<string, number>> = {
  'Spherical CR-39': { '1.50': 350, '1.56': 500, '1.61': 800, '1.67': 1200, '1.74': 1800 },
  'Bifocal CR-39': { '1.50': 700, '1.56': 900, '1.61': 1300, '1.67': 1800 },
  'Progressive': { '1.50': 1500, '1.56': 2000, '1.61': 2800, '1.67': 3800 },
  'Anti-Fatigue': { '1.50': 1000, '1.56': 1300, '1.61': 1800, '1.67': 2500 },
};

const COATING_PRICES: Record<string, number> = {
  'Anti-Reflective (Basic)': 200,
  'Anti-Reflective (Premium)': 500,
  'Blue Cut': 300,
  'UV Protection': 150,
  'Scratch Resistant': 100,
  'Hard Coat': 150,
  'Hydrophobic': 250,
};

const TINT_PRICES: Record<string, number> = {
  'None': 0,
  'Light Tint': 100,
  'Medium Tint': 150,
  'Dark Tint (Sun)': 200,
  'Photochromic (Transition)': 500,
  'Polarized': 800,
};

const FRAME_CATEGORIES: Record<string, number> = {
  'Full Rim Metal': 800,
  'Full Rim Plastic (TR90)': 600,
  'Half Rim': 900,
  'Rimless': 1200,
  'Titanium': 2000,
  'Wooden Frame': 1500,
  'Sport/Wraparound': 500,
  'Kids Frame': 400,
};

const ADDON_PRICES: Record<string, number> = {
  'Thin Edge (1.67+)': 300,
  'Edge Polish': 100,
  'UV420 Block': 200,
  'Blue Light Filter': 250,
  'Anti-Fog Coating': 150,
};

// ───────────────────────────────────────────────
// Helper
// ───────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getSphRange(sph: number): string {
  const absSph = Math.abs(sph);
  if (absSph <= 2.0) return '1.50';
  if (absSph <= 3.5) return '1.56';
  if (absSph <= 5.0) return '1.61';
  if (absSph <= 7.0) return '1.67';
  return '1.74';
}

// ───────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────

export default function LensCalculator() {
  const { darkMode } = useCrmStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Prescription inputs
  const [leftSph, setLeftSph] = useState('');
  const [leftCyl, setLeftCyl] = useState('');
  const [leftAxis, setLeftAxis] = useState('');
  const [rightSph, setRightSph] = useState('');
  const [rightCyl, setRightCyl] = useState('');
  const [rightAxis, setRightAxis] = useState('');

  // Lens options
  const [lensType, setLensType] = useState('Spherical CR-39');
  const [lensIndex, setLensIndex] = useState('auto');
  const [selectedCoatings, setSelectedCoatings] = useState<string[]>([]);
  const [tintType, setTintType] = useState('None');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  // Frame
  const [frameCategory, setFrameCategory] = useState('Full Rim Plastic (TR90)');
  const [framePrice, setFramePrice] = useState(600);

  // Billing
  const [discount, setDiscount] = useState(0);
  const [marginPercent, setMarginPercent] = useState(30);

  const toggleCoating = (name: string) => {
    setSelectedCoatings((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const toggleAddon = (name: string) => {
    setSelectedAddons((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  };

  const resetCalculator = () => {
    setLeftSph(''); setLeftCyl(''); setLeftAxis('');
    setRightSph(''); setRightCyl(''); setRightAxis('');
    setLensType('Spherical CR-39'); setLensIndex('auto');
    setSelectedCoatings([]); setTintType('None');
    setSelectedAddons([]); setDiscount(0); setMarginPercent(30);
    setFrameCategory('Full Rim Plastic (TR90)'); setFramePrice(600);
  };

  // ─── Calculations ───────────────────────────────

  const calculation = useMemo(() => {
    const lSph = parseFloat(leftSph) || 0;
    const rSph = parseFloat(rightSph) || 0;
    const maxSph = Math.max(Math.abs(lSph), Math.abs(rSph));

    // Auto index recommendation
    const recommendedIndex = getSphRange(maxSph);
    const effectiveIndex = lensIndex === 'auto' ? recommendedIndex : lensIndex;

    // Lens pair price (2 lenses)
    const lensPrices = LENS_PRICES[lensType] || {};
    const lensBasePrice = (lensPrices[effectiveIndex] || 500) * 2;

    // Coating total (applied once per pair)
    const coatingTotal = selectedCoatings.reduce((sum, c) => sum + (COATING_PRICES[c] || 0), 0);

    // Tint
    const tintPrice = TINT_PRICES[tintType] || 0;

    // Addons
    const addonTotal = selectedAddons.reduce((sum, a) => sum + (ADDON_PRICES[a] || 0), 0);

    // Frame
    const frameTotal = framePrice;

    // Subtotal
    const subtotal = lensBasePrice + coatingTotal + tintPrice + addonTotal + frameTotal;

    // Discount
    const discountAmount = (subtotal * discount) / 100;
    const afterDiscount = subtotal - discountAmount;

    // With margin
    const marginAmount = (afterDiscount * marginPercent) / 100;
    const sellingPrice = afterDiscount + marginAmount;

    // Per lens breakdown
    const singleLensCost = lensBasePrice / 2 + coatingTotal / 2 + tintPrice / 2;

    return {
      recommendedIndex,
      effectiveIndex,
      lensBasePrice,
      coatingTotal,
      tintPrice,
      addonTotal,
      frameTotal,
      subtotal,
      discountAmount,
      afterDiscount,
      marginAmount,
      sellingPrice,
      singleLensCost,
      maxSph,
    };
  }, [leftSph, rightSph, lensType, lensIndex, selectedCoatings, tintType, selectedAddons, framePrice, discount, marginPercent]);

  // Index options based on lens type
  const availableIndices = Object.keys(LENS_PRICES[lensType] || {});

  const hasValidInput = leftSph || rightSph;

  return (
    <div className="px-3 sm:px-4 md:px-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold">Lens Price Calculator</h2>
        </div>
        <Button variant="outline" size="sm" onClick={resetCalculator} className="min-h-[44px] touch-manipulation transition-all duration-150 hover:shadow-md">
          <RotateCcw className="mr-1 h-3 w-3" /> Reset
        </Button>
      </div>

      {/* Info Banner */}
      <Alert className={darkMode ? 'border-amber-900/50 bg-amber-950/30' : 'border-amber-200 bg-amber-50'}>
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-sm">
          Enter prescription values to get auto-recommended lens index. Configure coatings, tints, and frame to calculate the complete job cost.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* LEFT COLUMN: Prescription + Lens Options */}
        <div className="space-y-4">
          {/* Prescription Input */}
          <Card className={cn(darkMode ? 'border-gray-700 bg-gray-900' : '', 'hover-lift rounded-xl')}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Prescription</CardTitle>
              <CardDescription>Enter patient prescription values</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Left Eye */}
              <div>
                <Label className="text-sm font-medium text-blue-600 mb-2 block">Left Eye (OS)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">SPH</Label>
                    <div className="flex items-center gap-1">
                      <button type="button" className="flex items-center justify-center min-w-[36px] min-h-[44px] touch-manipulation rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setLeftSph(String((parseFloat(leftSph) || 0) - 0.25))}><Minus className="size-3" /></button>
                      <Input
                        type="number"
                        step="0.25"
                        placeholder="0.00"
                        value={leftSph}
                        onChange={(e) => setLeftSph(e.target.value)}
                        className="min-h-[44px] text-center transition-all duration-150 focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button type="button" className="flex items-center justify-center min-w-[36px] min-h-[44px] touch-manipulation rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setLeftSph(String((parseFloat(leftSph) || 0) + 0.25))}><Plus className="size-3" /></button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">CYL</Label>
                    <div className="flex items-center gap-1">
                      <button type="button" className="flex items-center justify-center min-w-[36px] min-h-[44px] touch-manipulation rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setLeftCyl(String((parseFloat(leftCyl) || 0) - 0.25))}><Minus className="size-3" /></button>
                      <Input
                        type="number"
                        step="0.25"
                        placeholder="0.00"
                        value={leftCyl}
                        onChange={(e) => setLeftCyl(e.target.value)}
                        className="min-h-[44px] text-center transition-all duration-150 focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button type="button" className="flex items-center justify-center min-w-[36px] min-h-[44px] touch-manipulation rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setLeftCyl(String((parseFloat(leftCyl) || 0) + 0.25))}><Plus className="size-3" /></button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">AXIS</Label>
                    <div className="flex items-center gap-1">
                      <button type="button" className="flex items-center justify-center min-w-[36px] min-h-[44px] touch-manipulation rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setLeftAxis(String(Math.max(0, (parseFloat(leftAxis) || 0) - 1)))}><Minus className="size-3" /></button>
                      <Input
                        type="number"
                        step="1"
                        placeholder="0"
                        value={leftAxis}
                        onChange={(e) => setLeftAxis(e.target.value)}
                        className="min-h-[44px] text-center transition-all duration-150 focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button type="button" className="flex items-center justify-center min-w-[36px] min-h-[44px] touch-manipulation rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setLeftAxis(String(Math.min(180, (parseFloat(leftAxis) || 0) + 1)))}><Plus className="size-3" /></button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Eye */}
              <div>
                <Label className="text-sm font-medium text-green-600 mb-2 block">Right Eye (OD)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">SPH</Label>
                    <div className="flex items-center gap-1">
                      <button type="button" className="flex items-center justify-center min-w-[36px] min-h-[44px] touch-manipulation rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setRightSph(String((parseFloat(rightSph) || 0) - 0.25))}><Minus className="size-3" /></button>
                      <Input
                        type="number"
                        step="0.25"
                        placeholder="0.00"
                        value={rightSph}
                        onChange={(e) => setRightSph(e.target.value)}
                        className="min-h-[44px] text-center transition-all duration-150 focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button type="button" className="flex items-center justify-center min-w-[36px] min-h-[44px] touch-manipulation rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setRightSph(String((parseFloat(rightSph) || 0) + 0.25))}><Plus className="size-3" /></button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">CYL</Label>
                    <div className="flex items-center gap-1">
                      <button type="button" className="flex items-center justify-center min-w-[36px] min-h-[44px] touch-manipulation rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setRightCyl(String((parseFloat(rightCyl) || 0) - 0.25))}><Minus className="size-3" /></button>
                      <Input
                        type="number"
                        step="0.25"
                        placeholder="0.00"
                        value={rightCyl}
                        onChange={(e) => setRightCyl(e.target.value)}
                        className="min-h-[44px] text-center transition-all duration-150 focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button type="button" className="flex items-center justify-center min-w-[36px] min-h-[44px] touch-manipulation rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setRightCyl(String((parseFloat(rightCyl) || 0) + 0.25))}><Plus className="size-3" /></button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">AXIS</Label>
                    <div className="flex items-center gap-1">
                      <button type="button" className="flex items-center justify-center min-w-[36px] min-h-[44px] touch-manipulation rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setRightAxis(String(Math.max(0, (parseFloat(rightAxis) || 0) - 1)))}><Minus className="size-3" /></button>
                      <Input
                        type="number"
                        step="1"
                        placeholder="0"
                        value={rightAxis}
                        onChange={(e) => setRightAxis(e.target.value)}
                        className="min-h-[44px] text-center transition-all duration-150 focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button type="button" className="flex items-center justify-center min-w-[36px] min-h-[44px] touch-manipulation rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setRightAxis(String(Math.min(180, (parseFloat(rightAxis) || 0) + 1)))}><Plus className="size-3" /></button>
                    </div>
                  </div>
                </div>
              </div>

              {hasValidInput && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm text-emerald-700 dark:text-emerald-400">
                    Recommended Index: <strong>{calculation.recommendedIndex}</strong>
                    {calculation.maxSph > 5 && ' (High prescription — thinner lens recommended)'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lens Type & Index */}
          <Card className={cn(darkMode ? 'border-gray-700 bg-gray-900' : '', 'hover-lift rounded-xl')}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lens Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm">Lens Type</Label>
                <Select value={lensType} onValueChange={setLensType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(LENS_PRICES).map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Index (Thickness)</Label>
                <Select value={lensIndex} onValueChange={setLensIndex}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (based on prescription)</SelectItem>
                    {availableIndices.map((idx) => (
                      <SelectItem key={idx} value={idx}>Index {idx}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Coatings */}
              <div>
                <Label className="text-sm mb-2 block">Coatings</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(COATING_PRICES).map(([name, price]) => (
                    <Badge
                      key={name}
                      variant={selectedCoatings.includes(name) ? 'default' : 'outline'}
                      className="cursor-pointer select-none"
                      onClick={() => toggleCoating(name)}
                    >
                      {name} (+{formatINR(price)})
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Tint */}
              <div>
                <Label className="text-sm">Tint / Photochromic</Label>
                <Select value={tintType} onValueChange={setTintType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TINT_PRICES).map(([name, price]) => (
                      <SelectItem key={name} value={name}>
                        {name} {price > 0 ? `(+${formatINR(price)})` : '(Free)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Frame, Billing, Result */}
        <div className="space-y-4">
          {/* Frame Selection */}
          <Card className={cn(darkMode ? 'border-gray-700 bg-gray-900' : '', 'hover-lift rounded-xl')}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Frame</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm">Frame Category</Label>
                <Select
                  value={frameCategory}
                  onValueChange={(val) => {
                    setFrameCategory(val);
                    setFramePrice(FRAME_CATEGORIES[val] || 600);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FRAME_CATEGORIES).map(([name, price]) => (
                      <SelectItem key={name} value={name}>
                        {name} — {formatINR(price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Custom Frame Price</Label>
                <Input
                  type="number"
                  value={framePrice}
                  onChange={(e) => setFramePrice(parseFloat(e.target.value) || 0)}
                  className="min-h-[44px] transition-all duration-150 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Addons */}
              <div>
                <Label className="text-sm mb-2 block">Add-ons</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ADDON_PRICES).map(([name, price]) => (
                    <Badge
                      key={name}
                      variant={selectedAddons.includes(name) ? 'default' : 'outline'}
                      className="cursor-pointer select-none"
                      onClick={() => toggleAddon(name)}
                    >
                      {name} (+{formatINR(price)})
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Summary */}
          <Card className={cn(darkMode ? 'border-gray-700 bg-gray-900' : '', 'hover-lift rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30')}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4" /> Cost Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Lenses ({lensType}, Index {calculation.effectiveIndex})</span>
                <span className="font-medium">{formatINR(calculation.lensBasePrice)}</span>
              </div>
              {calculation.coatingTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Coatings ({selectedCoatings.length})</span>
                  <span className="font-medium">{formatINR(calculation.coatingTotal)}</span>
                </div>
              )}
              {calculation.tintPrice > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tint ({tintType})</span>
                  <span className="font-medium">{formatINR(calculation.tintPrice)}</span>
                </div>
              )}
              {calculation.addonTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Add-ons ({selectedAddons.length})</span>
                  <span className="font-medium">{formatINR(calculation.addonTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Frame ({frameCategory})</span>
                <span className="font-medium">{formatINR(calculation.frameTotal)}</span>
              </div>

              <Separator className="my-2" />

              <div className="flex justify-between text-sm font-medium">
                <span>Subtotal (Cost)</span>
                <span>{formatINR(calculation.subtotal)}</span>
              </div>

              {/* Discount & Margin */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <Label className="text-xs text-muted-foreground">Discount %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="min-h-[44px] transition-all duration-150 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {[0, 10, 20, 30, 50].map((rate) => (
                      <button
                        key={`disc-${rate}`}
                        type="button"
                        onClick={() => setDiscount(rate)}
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors min-h-[44px] touch-manipulation',
                          discount === rate
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Margin %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="200"
                    value={marginPercent}
                    onChange={(e) => setMarginPercent(parseFloat(e.target.value) || 0)}
                    className="min-h-[44px] transition-all duration-150 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {[0, 10, 20, 30, 50].map((rate) => (
                      <button
                        key={`margin-${rate}`}
                        type="button"
                        onClick={() => setMarginPercent(rate)}
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors min-h-[44px] touch-manipulation',
                          marginPercent === rate
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {calculation.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Discount</span>
                  <span>-{formatINR(calculation.discountAmount)}</span>
                </div>
              )}

              <Separator className="my-2" />

              <div className="flex justify-between text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                <span>Selling Price</span>
                <span>{formatINR(calculation.sellingPrice)}</span>
              </div>

              <div className="text-xs text-muted-foreground">
                Cost: {formatINR(calculation.afterDiscount)} + {marginPercent}% margin = {formatINR(calculation.sellingPrice)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom: Quick Reference Table */}
      <Card className={cn(darkMode ? 'border-gray-700 bg-gray-900' : '', 'hover-lift rounded-xl')}>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowAdvanced(!showAdvanced)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Quick Price Reference</CardTitle>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {showAdvanced && (
          <CardContent>
            <div className="overflow-x-auto rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-1 px-2">Lens Type</th>
                    {['1.50', '1.56', '1.61', '1.67', '1.74'].map((idx) => (
                      <th key={idx} className="text-right py-1 px-2">{idx}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(LENS_PRICES).map(([type, prices]) => (
                    <tr key={type} className="border-b dark:border-gray-800">
                      <td className="py-1 px-2 font-medium">{type}</td>
                      {['1.50', '1.56', '1.61', '1.67', '1.74'].map((idx) => (
                        <td key={idx} className="text-right py-1 px-2 text-muted-foreground">
                          {prices[idx] ? formatINR(prices[idx]) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}