import { Check, Monitor, Moon, Palette, Shuffle, Sun } from "lucide-react";
import type {
  EmberColorScheme,
  EmberColorSchemeId,
} from "@/lib/appearance/colorSchemes";
import type { EmberThemeMode } from "@/lib/appearance/themeMode";
import {
  AppearanceGroup,
  AppearanceGroupLabel,
  AppearancePopover,
  AppearancePopoverHeader,
  AppearancePopoverSummary,
  AppearancePopoverTitle,
  ColorSchemeButton,
  ColorSchemeCheck,
  ColorSchemeLabel,
  ColorSchemeList,
  ColorSchemeSwatches,
  ColorSchemeText,
  RandomColorSchemeButton,
  ThemeModeButton,
  ThemeModeGrid,
} from "./AppSidebar.styles";

type AppearanceThemeOption = {
  id: EmberThemeMode;
  label: string;
  description: string;
};

type AppearanceColorSchemeOption = EmberColorScheme & {
  label: string;
  description: string;
};

export interface AppSidebarAppearancePopoverCopy {
  entryLabel: string;
  titleLabel: string;
  summaryLabel: string;
  themeGroupLabel: string;
  colorSchemeGroupLabel: string;
  randomColorSchemeLabel: string;
  randomColorSchemeAriaLabel: string;
  randomColorSchemeTitle: string;
  formatThemeSwitchAria: (theme: string) => string;
  formatColorSchemeSwitchAria: (colorScheme: string) => string;
}

interface AppSidebarAppearancePopoverProps {
  themeMode: EmberThemeMode;
  colorSchemeId: EmberColorSchemeId;
  themeOptions: AppearanceThemeOption[];
  colorSchemes: AppearanceColorSchemeOption[];
  copy: AppSidebarAppearancePopoverCopy;
  onThemeModeChange: (themeMode: EmberThemeMode) => void;
  onColorSchemeChange: (colorSchemeId: EmberColorSchemeId) => void;
  onRandomColorScheme: () => void;
}

function renderThemeModeIcon(themeMode: EmberThemeMode) {
  if (themeMode === "dark") {
    return <Moon />;
  }

  if (themeMode === "system") {
    return <Monitor />;
  }

  return <Sun />;
}

export function AppSidebarAppearancePopover({
  themeMode,
  colorSchemeId,
  themeOptions,
  colorSchemes,
  copy,
  onThemeModeChange,
  onColorSchemeChange,
  onRandomColorScheme,
}: AppSidebarAppearancePopoverProps) {
  return (
    <AppearancePopover
      data-testid="app-sidebar-appearance-popover"
      role="dialog"
      aria-label={copy.entryLabel}
    >
      <AppearancePopoverHeader>
        <AppearancePopoverTitle>
          <Palette />
          {copy.titleLabel}
        </AppearancePopoverTitle>
        <AppearancePopoverSummary>
          {copy.summaryLabel}
        </AppearancePopoverSummary>
      </AppearancePopoverHeader>

      <AppearanceGroup>
        <AppearanceGroupLabel>{copy.themeGroupLabel}</AppearanceGroupLabel>
        <ThemeModeGrid>
          {themeOptions.map((option) => {
            const active = option.id === themeMode;
            return (
              <ThemeModeButton
                key={option.id}
                $active={active}
                type="button"
                aria-pressed={active}
                aria-label={copy.formatThemeSwitchAria(option.label)}
                title={option.description}
                onClick={() => onThemeModeChange(option.id)}
              >
                {renderThemeModeIcon(option.id)}
                <span>{option.label}</span>
              </ThemeModeButton>
            );
          })}
        </ThemeModeGrid>
      </AppearanceGroup>

      <AppearanceGroup>
        <AppearanceGroupLabel>
          {copy.colorSchemeGroupLabel}
        </AppearanceGroupLabel>
        <ColorSchemeList>
          <RandomColorSchemeButton
            type="button"
            aria-label={copy.randomColorSchemeAriaLabel}
            title={copy.randomColorSchemeTitle}
            onClick={onRandomColorScheme}
          >
            <Shuffle />
            <span>{copy.randomColorSchemeLabel}</span>
          </RandomColorSchemeButton>
          {colorSchemes.map((scheme) => {
            const active = scheme.id === colorSchemeId;
            return (
              <ColorSchemeButton
                key={scheme.id}
                $active={active}
                type="button"
                aria-pressed={active}
                aria-label={copy.formatColorSchemeSwitchAria(scheme.label)}
                title={scheme.description}
                onClick={() => onColorSchemeChange(scheme.id)}
              >
                <ColorSchemeSwatches aria-hidden="true">
                  {scheme.swatches.map((swatch) => (
                    <span key={swatch} style={{ backgroundColor: swatch }} />
                  ))}
                </ColorSchemeSwatches>
                <ColorSchemeText>
                  <ColorSchemeLabel>{scheme.label}</ColorSchemeLabel>
                </ColorSchemeText>
                <ColorSchemeCheck $active={active}>
                  <Check />
                </ColorSchemeCheck>
              </ColorSchemeButton>
            );
          })}
        </ColorSchemeList>
      </AppearanceGroup>
    </AppearancePopover>
  );
}
