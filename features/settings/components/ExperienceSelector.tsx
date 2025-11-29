import React from 'react';
import { motion } from 'framer-motion';
import { EXPERIENCE_PRESETS, AUTONOMY_PRESETS, ExperienceLevel, AutonomyMode } from '@/types/experienceSettings';
import { useSettingsStore } from '../store/useSettingsStore';

interface ExperienceSelectorProps {
  compact?: boolean;
  showLabels?: boolean;
}

export const ExperienceSelector: React.FC<ExperienceSelectorProps> = ({ 
  compact = false,
  showLabels = true 
}) => {
  const { experienceLevel, autonomyMode, setExperienceLevel, setAutonomyMode } = useSettingsStore();

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Experience Level Toggle */}
        <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
          {Object.values(EXPERIENCE_PRESETS).map((preset) => (
            <button
              key={preset.id}
              onClick={() => setExperienceLevel(preset.id)}
              className={`
                relative px-2 py-1 rounded text-xs font-medium transition-all
                ${experienceLevel === preset.id 
                  ? 'text-white' 
                  : 'text-slate-400 hover:text-slate-300'
                }
              `}
              title={`${preset.label}: ${preset.description}`}
            >
              {experienceLevel === preset.id && (
                <motion.div
                  layoutId="experience-pill"
                  className="absolute inset-0 rounded"
                  style={{ backgroundColor: preset.color }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{preset.icon}</span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-slate-600" />

        {/* Autonomy Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
          {Object.values(AUTONOMY_PRESETS).map((preset) => (
            <button
              key={preset.id}
              onClick={() => setAutonomyMode(preset.id)}
              className={`
                relative px-2 py-1 rounded text-xs font-medium transition-all
                ${autonomyMode === preset.id 
                  ? 'text-white' 
                  : 'text-slate-400 hover:text-slate-300'
                }
              `}
              title={`${preset.label}: ${preset.description}`}
            >
              {autonomyMode === preset.id && (
                <motion.div
                  layoutId="autonomy-pill"
                  className="absolute inset-0 rounded"
                  style={{ backgroundColor: preset.color }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{preset.icon}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Experience Level Section */}
      <div className="space-y-2">
        {showLabels && (
          <>
            <label className="text-sm font-medium text-slate-300">
              Experience Level
            </label>
            <p className="text-xs text-slate-500 -mt-1">
              Adjusts explanation depth and terminology
            </p>
          </>
        )}
        <div className="grid grid-cols-3 gap-2">
          {Object.values(EXPERIENCE_PRESETS).map((preset) => {
            const isActive = experienceLevel === preset.id;
            return (
              <motion.button
                key={preset.id}
                onClick={() => setExperienceLevel(preset.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  relative p-2 rounded-lg border-2 transition-all text-center
                  ${isActive 
                    ? 'border-opacity-100' 
                    : 'border-slate-700 hover:border-slate-600'
                  }
                `}
                style={{
                  borderColor: isActive ? preset.color : undefined,
                  backgroundColor: isActive ? `${preset.color}15` : undefined,
                }}
              >
                <span className="text-lg">{preset.icon}</span>
                <div className="text-xs font-medium text-slate-300 mt-1">
                  {preset.label}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Autonomy Mode Section */}
      <div className="space-y-2">
        {showLabels && (
          <>
            <label className="text-sm font-medium text-slate-300">
              Autonomy Mode
            </label>
            <p className="text-xs text-slate-500 -mt-1">
              Controls how independently the AI acts
            </p>
          </>
        )}
        <div className="grid grid-cols-3 gap-2">
          {Object.values(AUTONOMY_PRESETS).map((preset) => {
            const isActive = autonomyMode === preset.id;
            return (
              <motion.button
                key={preset.id}
                onClick={() => setAutonomyMode(preset.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  relative p-2 rounded-lg border-2 transition-all text-center
                  ${isActive 
                    ? 'border-opacity-100' 
                    : 'border-slate-700 hover:border-slate-600'
                  }
                `}
                style={{
                  borderColor: isActive ? preset.color : undefined,
                  backgroundColor: isActive ? `${preset.color}15` : undefined,
                }}
              >
                <span className="text-lg">{preset.icon}</span>
                <div className="text-xs font-medium text-slate-300 mt-1">
                  {preset.label}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Compact badges showing current experience & autonomy - for use in headers
 */
export const ExperienceBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { experienceLevel, autonomyMode } = useSettingsStore();
  const expPreset = EXPERIENCE_PRESETS[experienceLevel];
  const autoPreset = AUTONOMY_PRESETS[autonomyMode];

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <span 
        className="px-1.5 py-0.5 rounded text-xs font-medium"
        style={{ backgroundColor: `${expPreset.color}20`, color: expPreset.color }}
        title={`Experience: ${expPreset.label} - ${expPreset.description}`}
      >
        {expPreset.icon}
      </span>
      <span 
        className="px-1.5 py-0.5 rounded text-xs font-medium"
        style={{ backgroundColor: `${autoPreset.color}20`, color: autoPreset.color }}
        title={`Autonomy: ${autoPreset.label} - ${autoPreset.description}`}
      >
        {autoPreset.icon}
      </span>
    </div>
  );
};
