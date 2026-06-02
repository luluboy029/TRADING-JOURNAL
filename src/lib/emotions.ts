/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmotionType } from '../types';

export interface EmotionMetadata {
  label: EmotionType;
  emoji: string;
  colorClass: string; // Tailwind accent base
  borderClass: string;
  bgClass: string;
  textClass: string;
  hoverBgClass: string;
  description: string;
}

export const EMOTIONS_METADATA: Record<EmotionType, EmotionMetadata> = {
  Disciplined: { 
    label: 'Disciplined', 
    emoji: '🧘', 
    colorClass: 'emerald', 
    borderClass: 'border-emerald-500/20',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    hoverBgClass: 'hover:bg-emerald-500/15',
    description: 'Followed my playbook setup perfectly without deviation.' 
  },
  Patient: { 
    label: 'Patient', 
    emoji: '⏳', 
    colorClass: 'teal', 
    borderClass: 'border-teal-500/20',
    bgClass: 'bg-teal-500/10',
    textClass: 'text-teal-400',
    hoverBgClass: 'hover:bg-teal-500/15',
    description: 'Waited calmly for price action to hit my precise trigger.' 
  },
  FOMO: { 
    label: 'FOMO', 
    emoji: '🏃‍♂️', 
    colorClass: 'amber', 
    borderClass: 'border-amber-500/20',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    hoverBgClass: 'hover:bg-amber-500/15',
    description: 'Chased a candle to avoid missing out on the rally.' 
  },
  Greed: { 
    label: 'Greed', 
    emoji: '🤑', 
    colorClass: 'fuchsia', 
    borderClass: 'border-fuchsia-500/20',
    bgClass: 'bg-fuchsia-500/10',
    textClass: 'text-fuchsia-400',
    hoverBgClass: 'hover:bg-fuchsia-500/15',
    description: 'Over-leveraged size or targets, wanting to hit a home run.' 
  },
  Fear: { 
    label: 'Fear', 
    emoji: '😨', 
    colorClass: 'red', 
    borderClass: 'border-red-500/20',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-400',
    hoverBgClass: 'hover:bg-red-500/15',
    description: 'Hesitated on entry, or exited prematurely due to panic.' 
  },
  Anxious: { 
    label: 'Anxious', 
    emoji: '😰', 
    colorClass: 'blue', 
    borderClass: 'border-blue-500/20',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-400',
    hoverBgClass: 'hover:bg-blue-500/15',
    description: 'Constantly micromanaged or worried during the hold.' 
  },
  Revenge: { 
    label: 'Revenge', 
    emoji: '😡', 
    colorClass: 'rose', 
    borderClass: 'border-rose-500/20',
    bgClass: 'bg-rose-500/10',
    textClass: 'text-rose-455 text-rose-400',
    hoverBgClass: 'hover:bg-rose-500/15',
    description: 'Traded angrily to recover losses from a previous drawdown.' 
  },
  Overconfident: { 
    label: 'Overconfident', 
    emoji: '🏆', 
    colorClass: 'violet', 
    borderClass: 'border-violet-500/20',
    bgClass: 'bg-violet-500/10',
    textClass: 'text-violet-400',
    hoverBgClass: 'hover:bg-violet-500/15',
    description: 'Felt invincible after winning, taking reckless setups.' 
  }
};

export const EMOTIONS_LIST = Object.values(EMOTIONS_METADATA);
