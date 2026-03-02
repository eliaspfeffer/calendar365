import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addMonths, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type ChildMilestone = {
  childNumber: number;
  birthMinDate: Date;
  birthMaxDate: Date;
  yourAgeAtBirthMin: number;
  yourAgeAtBirthMax: number;
  partnerAgeAtBirthMin: number;
  partnerAgeAtBirthMax: number;
  child25MinDate: Date;
  child25MaxDate: Date;
  yourAgeWhen25Min: number;
  yourAgeWhen25Max: number;
  partnerAgeWhen25Min: number;
  partnerAgeWhen25Max: number;
};

const roundOne = (value: number) => Math.round(value * 10) / 10;

const formatRange = (min: number, max: number) => {
  if (Math.abs(min - max) < 0.01) return `${roundOne(min)} years`;
  return `${roundOne(min)} - ${roundOne(max)} years`;
};

const Long = () => {
  const [yourAge, setYourAge] = useState("30");
  const [partnerAge, setPartnerAge] = useState("29");
  const [childrenCount, setChildrenCount] = useState("3");
  const [firstChildInMonths, setFirstChildInMonths] = useState("12");
  const [spacingMinMonths, setSpacingMinMonths] = useState("12");
  const [spacingMaxMonths, setSpacingMaxMonths] = useState("18");

  const yourAgeNumber = Number(yourAge);
  const partnerAgeNumber = Number(partnerAge);
  const childrenCountNumber = Math.max(0, Math.trunc(Number(childrenCount) || 0));
  const firstChildInMonthsNumber = Math.max(0, Math.trunc(Number(firstChildInMonths) || 0));
  const spacingMinMonthsNumber = Math.max(0, Math.trunc(Number(spacingMinMonths) || 0));
  const spacingMaxMonthsNumber = Math.max(spacingMinMonthsNumber, Math.trunc(Number(spacingMaxMonths) || 0));

  const now = useMemo(() => new Date(), []);

  const milestones = useMemo<ChildMilestone[]>(() => {
    if (!Number.isFinite(yourAgeNumber) || !Number.isFinite(partnerAgeNumber) || childrenCountNumber <= 0) return [];

    return Array.from({ length: childrenCountNumber }, (_, index) => {
      const minOffsetMonths = firstChildInMonthsNumber + index * spacingMinMonthsNumber;
      const maxOffsetMonths = firstChildInMonthsNumber + index * spacingMaxMonthsNumber;
      const yearsMin = minOffsetMonths / 12;
      const yearsMax = maxOffsetMonths / 12;

      const birthMinDate = addMonths(now, minOffsetMonths);
      const birthMaxDate = addMonths(now, maxOffsetMonths);
      const child25MinDate = addMonths(birthMinDate, 25 * 12);
      const child25MaxDate = addMonths(birthMaxDate, 25 * 12);

      return {
        childNumber: index + 1,
        birthMinDate,
        birthMaxDate,
        yourAgeAtBirthMin: yourAgeNumber + yearsMin,
        yourAgeAtBirthMax: yourAgeNumber + yearsMax,
        partnerAgeAtBirthMin: partnerAgeNumber + yearsMin,
        partnerAgeAtBirthMax: partnerAgeNumber + yearsMax,
        child25MinDate,
        child25MaxDate,
        yourAgeWhen25Min: yourAgeNumber + yearsMin + 25,
        yourAgeWhen25Max: yourAgeNumber + yearsMax + 25,
        partnerAgeWhen25Min: partnerAgeNumber + yearsMin + 25,
        partnerAgeWhen25Max: partnerAgeNumber + yearsMax + 25,
      };
    });
  }, [
    childrenCountNumber,
    firstChildInMonthsNumber,
    now,
    partnerAgeNumber,
    spacingMaxMonthsNumber,
    spacingMinMonthsNumber,
    yourAgeNumber,
  ]);

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Long-Term Family Calendar</h1>
            <p className="text-sm text-muted-foreground">
              Plan child timing windows and see both parent ages at birth and when each child turns 25.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/">Back to Main Calendar</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Planning Inputs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="your-age">Your current age</Label>
                <Input id="your-age" type="number" min="0" step="0.1" value={yourAge} onChange={(e) => setYourAge(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-age">Partner current age</Label>
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
                <Label htmlFor="children-count">Number of children</Label>
                <Input
                  id="children-count"
                  type="number"
                  min="0"
                  step="1"
                  value={childrenCount}
                  onChange={(e) => setChildrenCount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="first-child-months">First child in how many months</Label>
                <Input
                  id="first-child-months"
                  type="number"
                  min="0"
                  step="1"
                  value={firstChildInMonths}
                  onChange={(e) => setFirstChildInMonths(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spacing-min">Min months between children</Label>
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
                <Label htmlFor="spacing-max">Max months between children</Label>
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
            <CardTitle>Timeline ({format(now, "MMMM d, yyyy")} baseline)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Enter valid ages and at least 1 child to generate a timeline.</p>
            ) : (
              milestones.map((milestone) => (
                <div key={milestone.childNumber} className="rounded-md border p-4">
                  <h2 className="text-lg font-semibold">Child {milestone.childNumber}</h2>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                    <p>
                      <span className="font-medium">Birth window:</span>{" "}
                      {format(milestone.birthMinDate, "MMM yyyy")} - {format(milestone.birthMaxDate, "MMM yyyy")}
                    </p>
                    <p>
                      <span className="font-medium">Turns 25 window:</span>{" "}
                      {format(milestone.child25MinDate, "MMM yyyy")} - {format(milestone.child25MaxDate, "MMM yyyy")}
                    </p>
                    <p>
                      <span className="font-medium">Your age at birth:</span>{" "}
                      {formatRange(milestone.yourAgeAtBirthMin, milestone.yourAgeAtBirthMax)}
                    </p>
                    <p>
                      <span className="font-medium">Partner age at birth:</span>{" "}
                      {formatRange(milestone.partnerAgeAtBirthMin, milestone.partnerAgeAtBirthMax)}
                    </p>
                    <p>
                      <span className="font-medium">Your age when child is 25:</span>{" "}
                      {formatRange(milestone.yourAgeWhen25Min, milestone.yourAgeWhen25Max)}
                    </p>
                    <p>
                      <span className="font-medium">Partner age when child is 25:</span>{" "}
                      {formatRange(milestone.partnerAgeWhen25Min, milestone.partnerAgeWhen25Max)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Long;
