export const EMISSION_FACTORS: Record<string, number> = {
  Electricity: 0.85,
  Coal: 2.2,
  'Natural Gas': 0.5,
  Fuel: 2.31,
  Other: 1.0,
};

export function calculateEmissions(energySource: string, dailyConsumption: number, activeUnits: number) {
  const factor = EMISSION_FACTORS[energySource] || 1.0;
  const daily = dailyConsumption * activeUnits * factor;
  const monthly = daily * 30;
  const yearly = daily * 365;
  return { daily, monthly, yearly };
}

export function predictEmissionAfterMaintenance(currentDaily: number): number {
  return currentDaily * 0.82; // ~18% reduction after maintenance
}

export interface AISuggestion {
  title: string;
  description: string;
  impact: string;
  type: 'warning' | 'info' | 'success';
}

export function generateSuggestions(machine: {
  temperature?: number;
  sound_level?: number;
  runtime_hours: number;
  daily_consumption: number;
  energy_source: string;
  daily_emission: number;
}): AISuggestion[] {
  const suggestions: AISuggestion[] = [];

  if (machine.runtime_hours > 16) {
    const reduction = ((machine.runtime_hours - 12) / machine.runtime_hours * 100).toFixed(0);
    suggestions.push({
      title: 'Reduce Runtime',
      description: `Machine runs ${machine.runtime_hours}h/day. Reducing to 12h could cut emissions by ~${reduction}%.`,
      impact: `Save ~${(machine.daily_emission * parseFloat(reduction) / 100).toFixed(1)} kg CO₂/day`,
      type: 'warning',
    });
  }

  if (machine.temperature && machine.temperature > 80) {
    suggestions.push({
      title: 'Improve Insulation',
      description: `High operating temperature (${machine.temperature}°C). Better insulation can reduce heat loss by 15-25%.`,
      impact: `Reduce temperature by ~${(machine.temperature * 0.2).toFixed(0)}°C`,
      type: 'warning',
    });
  }

  if (machine.sound_level && machine.sound_level > 85) {
    suggestions.push({
      title: 'Schedule Preventive Maintenance',
      description: `Sound level at ${machine.sound_level} dB indicates wear. Preventive maintenance recommended.`,
      impact: `Predicted emission after maintenance: ${(machine.daily_emission * 0.82).toFixed(1)} kg CO₂/day`,
      type: 'info',
    });
  }

  if (machine.daily_consumption > 500) {
    suggestions.push({
      title: 'Replace Inefficient Motors',
      description: `High energy consumption (${machine.daily_consumption} kWh/day). IE4 super-premium motors can save 5-10%.`,
      impact: `Save ~${(machine.daily_consumption * 0.08).toFixed(0)} kWh/day`,
      type: 'info',
    });
  }

  if (machine.energy_source === 'Coal' || machine.energy_source === 'Fuel') {
    suggestions.push({
      title: 'Switch to Renewable Energy',
      description: `Currently using ${machine.energy_source}. Switching to electricity from renewables can cut emissions by 60-80%.`,
      impact: `Potential CO₂ reduction: ${(machine.daily_emission * 0.7).toFixed(1)} kg/day`,
      type: 'success',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      title: 'Operations Optimal',
      description: 'Current machine parameters are within acceptable ranges.',
      impact: 'Continue monitoring for changes',
      type: 'success',
    });
  }

  return suggestions;
}
