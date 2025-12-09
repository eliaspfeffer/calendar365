import { YearCalendar } from '@/components/calendar/YearCalendar';

const Index = () => {
  return (
    <main className="w-full h-screen overflow-hidden">
      <YearCalendar years={[2025, 2026]} />
    </main>
  );
};

export default Index;
