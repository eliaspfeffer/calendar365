import { YearCalendar } from '@/components/calendar/YearCalendar';

const Index = () => {
  const currentYear = new Date().getFullYear();

  return (
    <main className="w-full h-screen overflow-hidden">
      <YearCalendar year={currentYear} />
    </main>
  );
};

export default Index;
