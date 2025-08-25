import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette } from "lucide-react";
import { changeTheme } from "@/lib/colors";

export default function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState('default');
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fetch available themes from mock data
    import('@/lib/mock-data').then(({ mockStorage }) => {
      mockStorage.getThemes()
        .then(themes => setAvailableThemes(themes))
        .catch(err => console.warn('Failed to fetch themes:', err));
    });
  }, []);

  const handleThemeChange = async (theme: string) => {
    setCurrentTheme(theme);
    await changeTheme(theme);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {!isVisible ? (
        <Button
          onClick={() => setIsVisible(true)}
          size="icon"
          className="configurable-primary text-white shadow-lg configurable-primary-hover"
        >
          <Palette size={20} className="text-white" />
        </Button>
      ) : (
        <div className="configurable-surface p-4 rounded-lg shadow-lg border configurable-border">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium configurable-text-primary">Theme:</h3>
            <Select value={currentTheme} onValueChange={handleThemeChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableThemes.map(theme => (
                  <SelectItem key={theme} value={theme}>
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setIsVisible(false)}
              size="sm"
              variant="ghost"
              className="text-xs"
            >
              ✕
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}