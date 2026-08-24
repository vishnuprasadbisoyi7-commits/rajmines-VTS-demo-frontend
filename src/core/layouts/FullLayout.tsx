import Header from './components/Header';
import { Outlet } from 'react-router';
import { SimulatorHUD } from '@/features/SimulatorControl/components/SimulatorHUD';

export default function FullLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Header />
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
      <SimulatorHUD />
    </div>
  );
}
