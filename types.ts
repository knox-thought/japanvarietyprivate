export enum Region {
  KANTO = 'คันโต (โตเกียวและรอบๆ)',
  KANSAI = 'คันไซ (โอซาก้า/เกียวโต)',
  HOKKAIDO = 'ฮอกไกโด',
  KYUSHU = 'คิวชู',
  CHUBU = 'ชูบุ (นาโกย่า/ทาคายาม่า)',
  OTHER = 'อื่นๆ'
}

export enum ServiceType {
  NONE = 'ไม่ใช้รถ',
  TRANSFER = 'รับ-ส่ง (Transfer)',
  CHARTER = 'เหมา 10 ชม. (Charter)'
}

export interface FlightInfo {
  type: 'LANDING' | 'TAKEOFF';
  time: string; // HH:mm
  flightNumber?: string;
  // สำหรับขาเข้า (LANDING)
  airport?: string; // ลงสนามบินไหน
  destination?: string; // ให้ไปส่งที่ไหน (โรงแรม/ที่พัก)
  // สำหรับขาออก (TAKEOFF)
  pickupLocation?: string; // ไปรับที่ไหน (โรงแรม/ที่พัก)
  departureAirport?: string; // ส่งสนามบินไหน
}

export interface DayConfig {
  date: string;
  serviceType: ServiceType;
  flightInfo?: FlightInfo;
}

export interface TravelerConfig {
  adults: number;
  children: number; // Ages 6-12
  toddlers: number; // Under 6
  suitcasesLarge: number;
  suitcasesSmall: number;
}

export interface TripPreferences {
  region: Region;
  startDate: string;
  endDate: string;
  days: DayConfig[];
  travelerConfig: TravelerConfig;
  interests: string[];
  customIdeas: string; // New field for user specific plans
}

// AI Response Types
export interface Activity {
  time: string;
  title: string;
  description: string;
  isDrive: boolean;
}

export interface DayItinerary {
  dayNumber: number;
  date: string;
  serviceType: string;
  theme: string;
  activities: Activity[];
}

export interface AIItineraryResponse {
  tripTitle: string;
  summary: string;
  vehicleRecommendation: string;
  itinerary: DayItinerary[];
  estimatedDistanceKm: number;
  quotationForOperator: string; // New field for English quote
}