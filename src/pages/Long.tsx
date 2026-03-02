import { useMemo, useState } from "react";
import { addMonths, format } from "date-fns";
import { Link } from "react-router-dom";
import { Baby, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type PlannedChild = {
  id: string;
  name: string;
  color: string;
};

type ChildTimeline = {
  id: string;
  name: string;
  color: string;
  birthMinOffsetMonths: number;
  birthMaxOffsetMonths: number;
  age25MinOffsetMonths: number;
  age25MaxOffsetMonths: number;
  birthMinDate: Date;
  birthMaxDate: Date;
  age25MinDate: Date;
  age25MaxDate: Date;
  yourAgeAtBirthMin: number;
  yourAgeAtBirthMax: number;
  partnerAgeAtBirthMin: number;
  partnerAgeAtBirthMax: number;
  yourAgeAt25Min: number;
  yourAgeAt25Max: number;
  partnerAgeAt25Min: number;
  partnerAgeAt25Max: number;
};

type WeddingCandidate = {
  offsetMonths: number;
  date: Date;
  monthIndex: number;
  avgTempC: number;
  score: number;
};

const CHILD_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GERMANY_MONTHLY_AVG_TEMP_C = [1, 2, 6, 10, 14, 17, 19, 19, 15, 10, 5, 2];

const YEARS_TO_MONTHS = 12;
const CHILD_AGE_TARGET = 25;
const TARGET_MONTHS = CHILD_AGE_TARGET * YEARS_TO_MONTHS;
const LEFT_COLUMN_WIDTH = 250;
const YEAR_WIDTH_PX = 96;

const roundOne = (value: number) => Math.round(value * 10) / 10;

const formatAgeRange = (min: number, max: number) => {
  if (Math.abs(min - max) < 0.01) return `${roundOne(min)} J.`;
  return `${roundOne(min)} - ${roundOne(max)} J.`;
};

const Long = () => {
  const [yourAge, setYourAge] = useState("30");
  const [partnerAge, setPartnerAge] = useState("29");
  const [firstChildInMonths, setFirstChildInMonths] = useState("12");
  const [firstChildAfterWedding, setFirstChildAfterWedding] = useState(false);
  const [spacingMinMonths, setSpacingMinMonths] = useState("12");
  const [spacingMaxMonths, setSpacingMaxMonths] = useState("18");
  const [proposalInMonths, setProposalInMonths] = useState("6");
  const [engagementMonths, setEngagementMonths] = useState("12");
  const [weddingSearchWindowMonths, setWeddingSearchWindowMonths] = useState("18");
  const [minWeddingTempC, setMinWeddingTempC] = useState("16");
  const [preferredWeddingMonths, setPreferredWeddingMonths] = useState<number[]>([5, 6, 7, 8]);
  const [children, setChildren] = useState<PlannedChild[]>([
    { id: "child-1", name: "Kind 1", color: CHILD_COLORS[0] },
    { id: "child-2", name: "Kind 2", color: CHILD_COLORS[1] },
    { id: "child-3", name: "Kind 3", color: CHILD_COLORS[2] },
  ]);

  const now = useMemo(() => new Date(), []);
  const yourAgeNumber = Number(yourAge);
  const partnerAgeNumber = Number(partnerAge);
  const firstChildInMonthsNumber = Math.max(0, Math.trunc(Number(firstChildInMonths) || 0));
  const spacingMinMonthsNumber = Math.max(0, Math.trunc(Number(spacingMinMonths) || 0));
  const spacingMaxMonthsNumber = Math.max(spacingMinMonthsNumber, Math.trunc(Number(spacingMaxMonths) || 0));
  const proposalInMonthsNumber = Math.max(0, Math.trunc(Number(proposalInMonths) || 0));
  const engagementMonthsNumber = Math.max(0, Math.trunc(Number(engagementMonths) || 0));
  const weddingSearchWindowMonthsNumber = Math.max(1, Math.trunc(Number(weddingSearchWindowMonths) || 1));
  const minWeddingTempCNumber = Number(minWeddingTempC);
  const weddingBaselineOffsetMonths = proposalInMonthsNumber + engagementMonthsNumber;
  const firstChildBaseOffsetMonths =
    (firstChildAfterWedding ? weddingBaselineOffsetMonths : 0) + firstChildInMonthsNumber;

  const timeline = useMemo<ChildTimeline[]>(() => {
    if (!Number.isFinite(yourAgeNumber) || !Number.isFinite(partnerAgeNumber)) return [];

    return children.map((child, index) => {
      const birthMinOffsetMonths = firstChildBaseOffsetMonths + index * spacingMinMonthsNumber;
      const birthMaxOffsetMonths = firstChildBaseOffsetMonths + index * spacingMaxMonthsNumber;
      const age25MinOffsetMonths = birthMinOffsetMonths + TARGET_MONTHS;
      const age25MaxOffsetMonths = birthMaxOffsetMonths + TARGET_MONTHS;

      const yearsAtBirthMin = birthMinOffsetMonths / YEARS_TO_MONTHS;
      const yearsAtBirthMax = birthMaxOffsetMonths / YEARS_TO_MONTHS;
      const yearsAt25Min = age25MinOffsetMonths / YEARS_TO_MONTHS;
      const yearsAt25Max = age25MaxOffsetMonths / YEARS_TO_MONTHS;

      const birthMinDate = addMonths(now, birthMinOffsetMonths);
      const birthMaxDate = addMonths(now, birthMaxOffsetMonths);
      const age25MinDate = addMonths(now, age25MinOffsetMonths);
      const age25MaxDate = addMonths(now, age25MaxOffsetMonths);

      return {
        id: child.id,
        name: child.name,
        color: child.color,
        birthMinOffsetMonths,
        birthMaxOffsetMonths,
        age25MinOffsetMonths,
        age25MaxOffsetMonths,
        birthMinDate,
        birthMaxDate,
        age25MinDate,
        age25MaxDate,
        yourAgeAtBirthMin: yourAgeNumber + yearsAtBirthMin,
        yourAgeAtBirthMax: yourAgeNumber + yearsAtBirthMax,
        partnerAgeAtBirthMin: partnerAgeNumber + yearsAtBirthMin,
        partnerAgeAtBirthMax: partnerAgeNumber + yearsAtBirthMax,
        yourAgeAt25Min: yourAgeNumber + yearsAt25Min,
        yourAgeAt25Max: yourAgeNumber + yearsAt25Max,
        partnerAgeAt25Min: partnerAgeNumber + yearsAt25Min,
        partnerAgeAt25Max: partnerAgeNumber + yearsAt25Max,
      };
    });
  }, [
    children,
    firstChildBaseOffsetMonths,
    now,
    partnerAgeNumber,
    spacingMaxMonthsNumber,
    spacingMinMonthsNumber,
    yourAgeNumber,
  ]);

  const togglePreferredWeddingMonth = (monthIndex: number) => {
    setPreferredWeddingMonths((prev) => {
      if (prev.includes(monthIndex)) return prev.filter((m) => m !== monthIndex);
      return [...prev, monthIndex].sort((a, b) => a - b);
    });
  };

  const proposalDate = useMemo(() => addMonths(now, proposalInMonthsNumber), [now, proposalInMonthsNumber]);
  const targetWeddingDate = useMemo(
    () => addMonths(now, proposalInMonthsNumber + engagementMonthsNumber),
    [now, proposalInMonthsNumber, engagementMonthsNumber]
  );

  const weddingCandidates = useMemo<WeddingCandidate[]>(() => {
    const selectedMonths = preferredWeddingMonths.length > 0 ? new Set(preferredWeddingMonths) : null;
    const searchStartOffset = proposalInMonthsNumber + engagementMonthsNumber;
    const searchEndOffset = searchStartOffset + weddingSearchWindowMonthsNumber - 1;
    const safeMinTemp = Number.isFinite(minWeddingTempCNumber) ? minWeddingTempCNumber : 16;
    const range = Math.max(1, searchEndOffset - searchStartOffset + 1);
    const results: WeddingCandidate[] = [];

    for (let offset = searchStartOffset; offset <= searchEndOffset; offset += 1) {
      const date = addMonths(now, offset);
      const monthIndex = date.getMonth();
      const avgTempC = GERMANY_MONTHLY_AVG_TEMP_C[monthIndex];
      const preferredMatch = !selectedMonths || selectedMonths.has(monthIndex);
      const tempMatch = avgTempC >= safeMinTemp;
      if (!preferredMatch) continue;

      const distancePenalty = (offset - searchStartOffset) / range;
      const score = (tempMatch ? 2 : 0.6) + avgTempC / 20 - distancePenalty;

      results.push({
        offsetMonths: offset,
        date,
        monthIndex,
        avgTempC,
        score,
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }, [
    engagementMonthsNumber,
    minWeddingTempCNumber,
    now,
    preferredWeddingMonths,
    proposalInMonthsNumber,
    weddingSearchWindowMonthsNumber,
  ]);
  const topWeddingCandidates = weddingCandidates.slice(0, 5);

  const maxOffsetMonths = useMemo(() => {
    const maxChildOffset = timeline.reduce((max, item) => Math.max(max, item.age25MaxOffsetMonths), 0);
    const maxWeddingOffset = topWeddingCandidates.reduce((max, item) => Math.max(max, item.offsetMonths), 0);
    const maxRelevantOffset = Math.max(maxChildOffset, maxWeddingOffset);
    return Math.max(8 * YEARS_TO_MONTHS, maxRelevantOffset + 24);
  }, [timeline, topWeddingCandidates]);

  const timelineYears = Math.ceil(maxOffsetMonths / YEARS_TO_MONTHS);
  const timelineWidth = timelineYears * YEAR_WIDTH_PX;

  const yearTicks = useMemo(
    () => Array.from({ length: timelineYears + 1 }, (_, idx) => now.getFullYear() + idx),
    [now, timelineYears]
  );

  const toLeft = (offsetMonths: number) => (offsetMonths / maxOffsetMonths) * timelineWidth;
  const toWidth = (minOffsetMonths: number, maxOffsetMonthsValue: number) => {
    const raw = ((maxOffsetMonthsValue - minOffsetMonths) / maxOffsetMonths) * timelineWidth;
    return Math.max(10, raw);
  };

  const addChild = () => {
    setChildren((prev) => {
      const nextNumber = prev.length + 1;
      return [
        ...prev,
        {
          id: `child-${Date.now()}-${nextNumber}`,
          name: `Kind ${nextNumber}`,
          color: CHILD_COLORS[prev.length % CHILD_COLORS.length],
        },
      ];
    });
  };

  const removeChild = (id: string) => {
    setChildren((prev) => prev.filter((child) => child.id !== id));
  };

  const renameChild = (id: string, name: string) => {
    setChildren((prev) => prev.map((child) => (child.id === id ? { ...child, name } : child)));
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/40 p-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">calendar365 Long</h1>
            <p className="text-sm text-muted-foreground">
              Kinderplanung im Grid: Geburtsspannen, Altersabstände und euer Alter bis das jeweilige Kind 25 ist.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/">Zur Hauptansicht</Link>
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Planungsregeln</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label htmlFor="your-age">Dein Alter jetzt</Label>
                <Input id="your-age" type="number" min="0" step="0.1" value={yourAge} onChange={(e) => setYourAge(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-age">Alter Partner:in jetzt</Label>
                <Input
                  id="partner-age"
                  type="number"
                  min="0"
                  step="0.1"
                  value={partnerAge}
                  onChange={(e) => setPartnerAge(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="first-child">
                  {firstChildAfterWedding
                    ? "Erstes Kind in Monaten nach der Hochzeit"
                    : "Erstes Kind in Monaten"}
                </Label>
                <Input
                  id="first-child"
                  type="number"
                  min="0"
                  step="1"
                  value={firstChildInMonths}
                  onChange={(e) => setFirstChildInMonths(e.target.value)}
                />
                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    id="first-child-mode"
                    checked={firstChildAfterWedding}
                    onCheckedChange={setFirstChildAfterWedding}
                  />
                  <Label htmlFor="first-child-mode" className="text-xs text-muted-foreground">
                    Nach Hochzeit rechnen
                  </Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="spacing-min">Abstand Min (Monate)</Label>
                <Input
                  id="spacing-min"
                  type="number"
                  min="0"
                  step="1"
                  value={spacingMinMonths}
                  onChange={(e) => setSpacingMinMonths(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spacing-max">Abstand Max (Monate)</Label>
                <Input
                  id="spacing-max"
                  type="number"
                  min="0"
                  step="1"
                  value={spacingMaxMonths}
                  onChange={(e) => setSpacingMaxMonths(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Marriage Calculator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="proposal-months">Proposal in months</Label>
                <Input
                  id="proposal-months"
                  type="number"
                  min="0"
                  step="1"
                  value={proposalInMonths}
                  onChange={(e) => setProposalInMonths(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="engagement-months">Months from proposal to wedding</Label>
                <Input
                  id="engagement-months"
                  type="number"
                  min="0"
                  step="1"
                  value={engagementMonths}
                  onChange={(e) => setEngagementMonths(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wedding-window">Search window after target (months)</Label>
                <Input
                  id="wedding-window"
                  type="number"
                  min="1"
                  step="1"
                  value={weddingSearchWindowMonths}
                  onChange={(e) => setWeddingSearchWindowMonths(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temp-threshold">Min avg temp in Germany (°C)</Label>
                <Input
                  id="temp-threshold"
                  type="number"
                  step="0.5"
                  value={minWeddingTempC}
                  onChange={(e) => setMinWeddingTempC(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preferred wedding months (click to toggle)</Label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12">
                {MONTH_LABELS.map((label, monthIndex) => {
                  const selected = preferredWeddingMonths.includes(monthIndex);
                  const avgTemp = GERMANY_MONTHLY_AVG_TEMP_C[monthIndex];
                  return (
                    <Button
                      key={label}
                      type="button"
                      variant={selected ? "default" : "outline"}
                      className="h-auto py-2"
                      onClick={() => togglePreferredWeddingMonth(monthIndex)}
                      title={`Avg ${avgTemp}°C in Germany`}
                    >
                      <span className="flex flex-col leading-tight">
                        <span>{label}</span>
                        <span className="text-[10px] opacity-80">{avgTemp}°C</span>
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Expected proposal</p>
                <p className="text-sm font-semibold">{format(proposalDate, "MMMM yyyy")}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Target wedding month</p>
                <p className="text-sm font-semibold">{format(targetWeddingDate, "MMMM yyyy")}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Best month candidate</p>
                <p className="text-sm font-semibold">
                  {weddingCandidates[0]
                    ? `${format(weddingCandidates[0].date, "MMMM yyyy")} (${weddingCandidates[0].avgTempC}°C avg)`
                    : "No month matches current filters"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Warm-season hint</p>
                <p className="text-sm font-semibold">In Germany, May-Sep is usually warmest</p>
              </div>
            </div>

            <div className="rounded-lg border p-3 text-sm text-muted-foreground">
              Top-Hochzeitsmonate erscheinen jetzt als eigener Eintrag im Timeline Grid.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Kinder als Karten</CardTitle>
            <Button onClick={addChild}>
              <Plus className="mr-2 h-4 w-4" /> Kind hinzufügen
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {children.length === 0 && (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Noch keine Kinder. Mit "Kind hinzufügen" startest du das Board.
                </div>
              )}
              {children.map((child, index) => (
                <div key={child.id} className="rounded-lg border bg-card p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium" style={{ backgroundColor: `${child.color}22`, color: child.color }}>
                      <Baby className="h-3.5 w-3.5" /> Kind #{index + 1}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeChild(child.id)} aria-label={`${child.name} löschen`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Label htmlFor={`child-${child.id}`} className="sr-only">
                    Name
                  </Label>
                  <Input
                    id={`child-${child.id}`}
                    value={child.name}
                    onChange={(e) => renameChild(child.id, e.target.value)}
                    placeholder={`Kind ${index + 1}`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline Grid ({format(now, "dd.MM.yyyy")} als Startpunkt)</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 && topWeddingCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Füge mindestens ein Kind hinzu oder passe die Hochzeitsfilter an, um das Grid zu sehen.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <div className="min-w-[1050px]" style={{ width: LEFT_COLUMN_WIDTH + timelineWidth }}>
                  <div
                    className="grid border-b bg-muted/20"
                    style={{ gridTemplateColumns: `${LEFT_COLUMN_WIDTH}px ${timelineWidth}px` }}
                  >
                    <div className="border-r px-4 py-3 text-sm font-semibold">Zeitleiste</div>
                    <div className="relative h-12">
                      {yearTicks.map((year, idx) => {
                        const left = (idx / timelineYears) * timelineWidth;
                        return (
                          <div key={year} className="absolute top-0 h-full" style={{ left }}>
                            <div className="h-full border-l" />
                            <span className="absolute left-1 top-1 text-[11px] text-muted-foreground">{year}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div
                    className="grid border-b"
                    style={{ gridTemplateColumns: `${LEFT_COLUMN_WIDTH}px ${timelineWidth}px` }}
                  >
                    <div className="space-y-1 border-r px-4 py-3 text-sm">
                      <div className="font-semibold">Hochzeit (Top Monate)</div>
                      <div className="text-xs text-muted-foreground">
                        Proposal: {format(proposalDate, "MMM yyyy")} | Ziel: {format(targetWeddingDate, "MMM yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {topWeddingCandidates.length > 0
                          ? topWeddingCandidates
                              .map((candidate) => `${format(candidate.date, "MMM yyyy")} (${candidate.avgTempC}°C)`)
                              .join(" • ")
                          : "Keine passenden Kandidaten"}
                      </div>
                    </div>
                    <div
                      className="relative h-24"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(to right, hsl(var(--border)) 0px, hsl(var(--border)) 1px, transparent 1px, transparent 8px)",
                      }}
                    >
                      {yearTicks.map((year, idx) => {
                        const left = (idx / timelineYears) * timelineWidth;
                        return (
                          <div
                            key={`wedding-${year}`}
                            className="absolute top-0 h-full border-l border-foreground/20"
                            style={{ left }}
                          />
                        );
                      })}

                      {topWeddingCandidates.map((candidate, index) => (
                        <div
                          key={`wedding-candidate-${candidate.offsetMonths}`}
                          className="absolute h-7 rounded-md border border-emerald-700 bg-emerald-500/90 px-2 text-xs font-medium leading-7 text-white shadow-sm"
                          style={{
                            top: index % 2 === 0 ? 10 : 46,
                            left: toLeft(candidate.offsetMonths),
                            width: Math.max(58, timelineWidth * 0.04),
                          }}
                          title={`${format(candidate.date, "MMMM yyyy")} (${candidate.avgTempC}°C Durchschnitt)`}
                        >
                          {format(candidate.date, "MMM yyyy")}
                        </div>
                      ))}
                    </div>
                  </div>

                  {timeline.map((item) => {
                    const birthLeft = toLeft(item.birthMinOffsetMonths);
                    const birthWidth = toWidth(item.birthMinOffsetMonths, item.birthMaxOffsetMonths);
                    const age25Left = toLeft(item.age25MinOffsetMonths);
                    const age25Width = toWidth(item.age25MinOffsetMonths, item.age25MaxOffsetMonths);

                    return (
                      <div
                        key={item.id}
                        className="grid border-b"
                        style={{ gridTemplateColumns: `${LEFT_COLUMN_WIDTH}px ${timelineWidth}px` }}
                      >
                        <div className="space-y-1 border-r px-4 py-3 text-sm">
                          <div className="font-semibold">{item.name || "Ohne Name"}</div>
                          <div className="text-xs text-muted-foreground">
                            Geburt: {format(item.birthMinDate, "MMM yyyy")} - {format(item.birthMaxDate, "MMM yyyy")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Mit 25: {format(item.age25MinDate, "MMM yyyy")} - {format(item.age25MaxDate, "MMM yyyy")}
                          </div>
                          <div className="text-xs">
                            Du: {formatAgeRange(item.yourAgeAtBirthMin, item.yourAgeAtBirthMax)} / {formatAgeRange(item.yourAgeAt25Min, item.yourAgeAt25Max)}
                          </div>
                          <div className="text-xs">
                            Partner:in: {formatAgeRange(item.partnerAgeAtBirthMin, item.partnerAgeAtBirthMax)} / {formatAgeRange(item.partnerAgeAt25Min, item.partnerAgeAt25Max)}
                          </div>
                        </div>
                        <div className="relative h-24" style={{ backgroundImage: "repeating-linear-gradient(to right, hsl(var(--border)) 0px, hsl(var(--border)) 1px, transparent 1px, transparent 8px)" }}>
                          {yearTicks.map((year, idx) => {
                            const left = (idx / timelineYears) * timelineWidth;
                            return <div key={`${item.id}-${year}`} className="absolute top-0 h-full border-l border-foreground/20" style={{ left }} />;
                          })}

                          <div
                            className="absolute top-5 h-7 rounded-md border px-2 text-xs font-medium leading-7 text-white shadow-sm"
                            style={{ left: birthLeft, width: birthWidth, minWidth: 12, backgroundColor: item.color, borderColor: `${item.color}cc` }}
                            title={`${item.name}: Geburt ${format(item.birthMinDate, "MMM yyyy")} - ${format(item.birthMaxDate, "MMM yyyy")}`}
                          >
                            Geburt
                          </div>

                          <div
                            className="absolute top-14 h-7 rounded-md border px-2 text-xs font-medium leading-7 text-white shadow-sm"
                            style={{ left: age25Left, width: age25Width, minWidth: 12, backgroundColor: `${item.color}cc`, borderColor: item.color }}
                            title={`${item.name}: wird 25 ${format(item.age25MinDate, "MMM yyyy")} - ${format(item.age25MaxDate, "MMM yyyy")}`}
                          >
                            25 Jahre
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Long;
