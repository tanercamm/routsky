import { useTheme } from '../context/ThemeContext';
import { VisaWorldMap } from '../components/VisaWorldMap';

export function VisaIntelPage() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  return (
    <div
      className={`flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden p-3 sm:p-4 transition-colors duration-700 ${
        isLight ? 'bg-[#F5F5F7]' : 'bg-[#020308]'
      }`}
    >
      <VisaWorldMap />
    </div>
  );
}
