// API Response Types
export interface ApiResponse<T = any> {
  code?: number;
  message?: string;
  data: T;
}

// User Types
export interface UserInfo {
  id: string;
  nickname: string;
  avatarUrl: string;
  phone?: string;
  email?: string;
}

// Baby Types
export interface BabyProfile {
  id: string;
  name: string;
  nickname?: string;
  gender: 'male' | 'female';
  birthDate: string;
  avatarUrl?: string;
  isDefault?: boolean;
}

// Record Types
export interface FeedingRecord {
  id: string;
  babyId: string;
  time: string;
  feedingType: 'breast' | 'bottle' | 'food';
  amount?: number;
  duration?: number;
  detail?: {
    leftBreastMinutes?: number;
    rightBreastMinutes?: number;
    foodName?: string;
    milkType?: 'formula' | 'breastmilk';
    remark?: string;
  };
  createdBy: string;
  createdByName?: string;
  createdByAvatar?: string;
  createdAt: string;
}

export interface SleepRecord {
  id: string;
  babyId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  type?: 'nap' | 'night';
  createdBy: string;
  createdByName?: string;
  createdByAvatar?: string;
  createdAt: string;
}

export interface DiaperRecord {
  id: string;
  babyId: string;
  time: string;
  type: 'pee' | 'poop' | 'both' | 'dry';
  poopColor?: string;
  poopTexture?: string;
  note?: string;
  createdBy: string;
  createdByName?: string;
  createdByAvatar?: string;
  createdAt: string;
}

export interface GrowthRecord {
  id: string;
  babyId: string;
  time: string;
  height?: number;
  weight?: number;
  headCircumference?: number;
  note?: string;
  createdBy: string;
  createdByName?: string;
  createdByAvatar?: string;
  createdAt: string;
}

// Timeline Types
export interface TimelineEntry {
  type: 'feeding' | 'sleep' | 'diaper' | 'growth';
  time: string;
  data: FeedingRecord | SleepRecord | DiaperRecord | GrowthRecord;
}

// Statistics Types
export interface DailyFeeding {
  date: string;
  amount: number;
}

export interface DailySleep {
  date: string;
  hours: number;
}

export interface GrowthData {
  date: string;
  month: number;
  height: number | null;
  weight: number | null;
  head: number | null;
}

export interface GrowthStandard {
  month: number;
  type: 'height' | 'weight' | 'head_circumference';
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
}

export interface StatisticsData {
  feeding: DailyFeeding[];
  sleep: DailySleep[];
  growth: GrowthData[];
  standards: GrowthStandard[];
}

// Vaccine Types
export interface VaccineSchedule {
  id: string;
  babyId: string;
  vaccineName: string;
  vaccineType: string;
  ageInMonths: number;
  scheduledDate: string;
  vaccinationStatus: 'pending' | 'completed' | 'skipped';
  isRequired: boolean;
}

// AI Insight Types
export interface AIInsight {
  title: string;
  content: string;
  type: 'feeding' | 'sleep' | 'growth' | 'general';
  priority: 'high' | 'medium' | 'low';
}

// Daily Tips Types
export interface DailyTip {
  id: string;
  title: string;
  description: string;
  type: 'feeding' | 'sleep' | 'development' | 'safety';
  priority: 'high' | 'medium' | 'low';
}
