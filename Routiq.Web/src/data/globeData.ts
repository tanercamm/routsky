export interface CityPoint {
  name: string;
  country: string;
  lat: number;
  lng: number;
  isSupported: boolean;
  tier?: 1 | 2 | 3;
  safetyIndex?: number;
  costOfLivingIndex?: number;
  avgMealCost?: number;
  bestMonths?: string;
}

// Navisio-supported cities from CityIntelligences DB
// tier 1 = major global hub, tier 2 = secondary hub, tier 3 = niche/regional
export const SUPPORTED_CITIES: CityPoint[] = [
  // ── Europe ───────────────────────────────────────────────────────────
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278, isSupported: true, tier: 1, safetyIndex: 65.5, costOfLivingIndex: 80, avgMealCost: 25, bestMonths: '5,6,7,8,9' },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, isSupported: true, tier: 1, safetyIndex: 58.2, costOfLivingIndex: 75, avgMealCost: 22, bestMonths: '5,6,7,8,9,10' },
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041, isSupported: true, tier: 1, safetyIndex: 70, costOfLivingIndex: 78, avgMealCost: 22, bestMonths: '5,6,7,8,9' },
  { name: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964, isSupported: true, tier: 1, safetyIndex: 60.5, costOfLivingIndex: 60, avgMealCost: 18, bestMonths: '4,5,6,9,10' },
  { name: 'Barcelona', country: 'Spain', lat: 41.3851, lng: 2.1734, isSupported: true, tier: 1, safetyIndex: 55.4, costOfLivingIndex: 55, avgMealCost: 15, bestMonths: '4,5,6,9,10' },
  { name: 'Frankfurt', country: 'Germany', lat: 50.1109, lng: 8.6821, isSupported: true, tier: 1, safetyIndex: 72, costOfLivingIndex: 70, avgMealCost: 18, bestMonths: '5,6,7,8,9' },
  { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784, isSupported: true, tier: 1, safetyIndex: 55, costOfLivingIndex: 35, avgMealCost: 8, bestMonths: '4,5,6,9,10' },
  { name: 'Vienna', country: 'Austria', lat: 48.2082, lng: 16.3738, isSupported: true, tier: 2, safetyIndex: 80.1, costOfLivingIndex: 65, avgMealCost: 20, bestMonths: '5,6,7,8,9' },
  { name: 'Prague', country: 'Czech Republic', lat: 50.0755, lng: 14.4378, isSupported: true, tier: 2, safetyIndex: 75.8, costOfLivingIndex: 45, avgMealCost: 12, bestMonths: '5,6,9,10' },
  { name: 'Budapest', country: 'Hungary', lat: 47.4979, lng: 19.0402, isSupported: true, tier: 2, safetyIndex: 68.3, costOfLivingIndex: 40, avgMealCost: 10, bestMonths: '5,6,9,10' },
  { name: 'Lisbon', country: 'Portugal', lat: 38.7223, lng: -9.1393, isSupported: true, tier: 2, safetyIndex: 74, costOfLivingIndex: 48, avgMealCost: 14, bestMonths: '4,5,6,9,10' },
  { name: 'Porto', country: 'Portugal', lat: 41.1579, lng: -8.6291, isSupported: true, tier: 3, safetyIndex: 78, costOfLivingIndex: 42, avgMealCost: 12, bestMonths: '5,6,7,8,9' },
  { name: 'Milan', country: 'Italy', lat: 45.4642, lng: 9.19, isSupported: true, tier: 2, safetyIndex: 62, costOfLivingIndex: 65, avgMealCost: 18, bestMonths: '4,5,6,9,10' },
  { name: 'Munich', country: 'Germany', lat: 48.1351, lng: 11.582, isSupported: true, tier: 2, safetyIndex: 80, costOfLivingIndex: 72, avgMealCost: 18, bestMonths: '5,6,7,8,9' },
  { name: 'Zurich', country: 'Switzerland', lat: 47.3769, lng: 8.5417, isSupported: true, tier: 2, safetyIndex: 82.3, costOfLivingIndex: 120, avgMealCost: 40, bestMonths: '6,7,8,9' },
  { name: 'Geneva', country: 'Switzerland', lat: 46.2044, lng: 6.1432, isSupported: true, tier: 3, safetyIndex: 75.4, costOfLivingIndex: 115, avgMealCost: 38, bestMonths: '6,7,8,9' },
  { name: 'Krakow', country: 'Poland', lat: 50.0647, lng: 19.945, isSupported: true, tier: 3, safetyIndex: 78.9, costOfLivingIndex: 35, avgMealCost: 8, bestMonths: '5,6,7,8,9' },
  { name: 'Sofia', country: 'Bulgaria', lat: 42.6977, lng: 23.3219, isSupported: true, tier: 3, safetyIndex: 62.1, costOfLivingIndex: 30, avgMealCost: 8, bestMonths: '5,6,9,10' },
  { name: 'Belgrade', country: 'Serbia', lat: 44.7866, lng: 20.4489, isSupported: true, tier: 3, safetyIndex: 63.8, costOfLivingIndex: 35, avgMealCost: 9, bestMonths: '5,6,9,10' },
  { name: 'Bucharest', country: 'Romania', lat: 44.4268, lng: 26.1025, isSupported: true, tier: 3, safetyIndex: 66.2, costOfLivingIndex: 32, avgMealCost: 9, bestMonths: '5,6,9,10' },
  { name: 'Cluj-Napoca', country: 'Romania', lat: 46.7712, lng: 23.6236, isSupported: true, tier: 3, safetyIndex: 77.4, costOfLivingIndex: 34, avgMealCost: 9, bestMonths: '5,6,9,10' },
  { name: 'Sarajevo', country: 'Bosnia', lat: 43.8563, lng: 18.4131, isSupported: true, tier: 3, safetyIndex: 67.2, costOfLivingIndex: 29, avgMealCost: 6, bestMonths: '5,6,9,10' },
  { name: 'Tirana', country: 'Albania', lat: 41.3275, lng: 19.8187, isSupported: true, tier: 3, safetyIndex: 64.9, costOfLivingIndex: 30, avgMealCost: 7, bestMonths: '5,6,9,10' },
  { name: 'Skopje', country: 'North Macedonia', lat: 41.9973, lng: 21.428, isSupported: true, tier: 3, safetyIndex: 65.4, costOfLivingIndex: 28, avgMealCost: 6, bestMonths: '5,6,9,10' },
  { name: 'Ljubljana', country: 'Slovenia', lat: 46.0569, lng: 14.5058, isSupported: true, tier: 3, safetyIndex: 82.3, costOfLivingIndex: 50, avgMealCost: 12, bestMonths: '5,6,7,8,9' },
  { name: 'Kotor', country: 'Montenegro', lat: 42.4247, lng: 18.7712, isSupported: true, tier: 3, safetyIndex: 72.1, costOfLivingIndex: 40, avgMealCost: 12, bestMonths: '5,6,9,10' },
  { name: 'Dubrovnik', country: 'Croatia', lat: 42.6507, lng: 18.0944, isSupported: true, tier: 3, safetyIndex: 79.5, costOfLivingIndex: 60, avgMealCost: 20, bestMonths: '5,6,9,10' },
  { name: 'Athens', country: 'Greece', lat: 37.9838, lng: 23.7275, isSupported: true, tier: 2, safetyIndex: 60, costOfLivingIndex: 50, avgMealCost: 14, bestMonths: '4,5,6,9,10' },
  { name: 'Edinburgh', country: 'United Kingdom', lat: 55.9533, lng: -3.1883, isSupported: true, tier: 3, safetyIndex: 70, costOfLivingIndex: 68, avgMealCost: 20, bestMonths: '6,7,8,9' },
  { name: 'Copenhagen', country: 'Denmark', lat: 55.6761, lng: 12.5683, isSupported: true, tier: 2, safetyIndex: 78, costOfLivingIndex: 85, avgMealCost: 25, bestMonths: '5,6,7,8,9' },
  { name: 'Amalfi Coast', country: 'Italy', lat: 40.6333, lng: 14.6029, isSupported: true, tier: 3, safetyIndex: 75, costOfLivingIndex: 85, avgMealCost: 30, bestMonths: '5,6,7,8,9' },
  { name: 'Tbilisi', country: 'Georgia', lat: 41.7151, lng: 44.8271, isSupported: true, tier: 3, safetyIndex: 73.5, costOfLivingIndex: 25, avgMealCost: 8, bestMonths: '5,6,9,10' },
  { name: 'Antalya', country: 'Turkey', lat: 36.8969, lng: 30.7133, isSupported: true, tier: 2, safetyIndex: 60, costOfLivingIndex: 30, avgMealCost: 7, bestMonths: '4,5,6,9,10' },
  { name: 'Nice', country: 'France', lat: 43.7102, lng: 7.262, isSupported: true, tier: 3, safetyIndex: 64, costOfLivingIndex: 70, avgMealCost: 20, bestMonths: '5,6,7,8,9' },
  { name: 'Seville', country: 'Spain', lat: 37.3891, lng: -5.9845, isSupported: true, tier: 3, safetyIndex: 60, costOfLivingIndex: 45, avgMealCost: 12, bestMonths: '3,4,5,9,10,11' },

  // ── North Africa & Middle East ───────────────────────────────────────
  { name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708, isSupported: true, tier: 1, safetyIndex: 84, costOfLivingIndex: 70, avgMealCost: 15, bestMonths: '11,12,1,2,3' },
  { name: 'Doha', country: 'Qatar', lat: 25.2854, lng: 51.531, isSupported: true, tier: 2, safetyIndex: 82, costOfLivingIndex: 65, avgMealCost: 12, bestMonths: '11,12,1,2,3' },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357, isSupported: true, tier: 2, safetyIndex: 54.3, costOfLivingIndex: 18, avgMealCost: 3, bestMonths: '10,11,12,1,2,3,4' },
  { name: 'Marrakech', country: 'Morocco', lat: 31.6295, lng: -7.9811, isSupported: true, tier: 2, safetyIndex: 63.4, costOfLivingIndex: 25, avgMealCost: 5, bestMonths: '3,4,5,9,10,11' },
  { name: 'Fez', country: 'Morocco', lat: 34.0181, lng: -5.0078, isSupported: true, tier: 3, safetyIndex: 60.1, costOfLivingIndex: 22, avgMealCost: 4, bestMonths: '3,4,5,9,10,11' },
  { name: 'Tangier', country: 'Morocco', lat: 35.7595, lng: -5.834, isSupported: true, tier: 3, safetyIndex: 65.5, costOfLivingIndex: 24, avgMealCost: 5, bestMonths: '4,5,6,9,10' },
  { name: 'Tunis', country: 'Tunisia', lat: 36.8065, lng: 10.1815, isSupported: true, tier: 3, safetyIndex: 58.2, costOfLivingIndex: 20, avgMealCost: 4, bestMonths: '4,5,6,9,10' },
  { name: 'Casablanca', country: 'Morocco', lat: 33.5731, lng: -7.5898, isSupported: true, tier: 3, safetyIndex: 60, costOfLivingIndex: 28, avgMealCost: 6, bestMonths: '4,5,6,9,10' },
  { name: 'Amman', country: 'Jordan', lat: 31.9454, lng: 35.9284, isSupported: true, tier: 3, safetyIndex: 68, costOfLivingIndex: 35, avgMealCost: 6, bestMonths: '3,4,5,10,11' },
  { name: 'Muscat', country: 'Oman', lat: 23.588, lng: 58.3829, isSupported: true, tier: 3, safetyIndex: 80, costOfLivingIndex: 50, avgMealCost: 8, bestMonths: '10,11,12,1,2,3' },

  // ── Asia ──────────────────────────────────────────────────────────────
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, isSupported: true, tier: 1, safetyIndex: 84, costOfLivingIndex: 80, avgMealCost: 8, bestMonths: '2,3,4,5,6,7' },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, isSupported: true, tier: 1, safetyIndex: 82.5, costOfLivingIndex: 60, avgMealCost: 8, bestMonths: '3,4,5,9,10,11' },
  { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018, isSupported: true, tier: 1, safetyIndex: 60.1, costOfLivingIndex: 35, avgMealCost: 4, bestMonths: '11,12,1,2' },
  { name: 'Hong Kong', country: 'China', lat: 22.3193, lng: 114.1694, isSupported: true, tier: 1, safetyIndex: 78, costOfLivingIndex: 75, avgMealCost: 10, bestMonths: '10,11,12,1,2,3' },
  { name: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.978, isSupported: true, tier: 1, safetyIndex: 81.1, costOfLivingIndex: 65, avgMealCost: 7, bestMonths: '4,5,9,10,11' },
  { name: 'Kuala Lumpur', country: 'Malaysia', lat: 3.139, lng: 101.6869, isSupported: true, tier: 2, safetyIndex: 48.7, costOfLivingIndex: 32, avgMealCost: 4, bestMonths: '5,6,7' },
  { name: 'Taipei', country: 'Taiwan', lat: 25.033, lng: 121.5654, isSupported: true, tier: 2, safetyIndex: 82, costOfLivingIndex: 45, avgMealCost: 5, bestMonths: '3,4,5,9,10,11' },
  { name: 'Mumbai', country: 'India', lat: 19.076, lng: 72.8777, isSupported: true, tier: 1, safetyIndex: 48, costOfLivingIndex: 25, avgMealCost: 3, bestMonths: '10,11,12,1,2,3' },
  { name: 'New Delhi', country: 'India', lat: 28.6139, lng: 77.209, isSupported: true, tier: 2, safetyIndex: 45, costOfLivingIndex: 22, avgMealCost: 2, bestMonths: '10,11,12,1,2,3' },
  { name: 'Kyoto', country: 'Japan', lat: 35.0116, lng: 135.7681, isSupported: true, tier: 3, safetyIndex: 85.2, costOfLivingIndex: 55, avgMealCost: 7, bestMonths: '3,4,5,9,10,11' },
  { name: 'Osaka', country: 'Japan', lat: 34.6937, lng: 135.5023, isSupported: true, tier: 2, safetyIndex: 80.4, costOfLivingIndex: 50, avgMealCost: 6, bestMonths: '3,4,5,9,10,11' },
  { name: 'Chiang Mai', country: 'Thailand', lat: 18.7883, lng: 98.9853, isSupported: true, tier: 3, safetyIndex: 75.8, costOfLivingIndex: 30, avgMealCost: 3, bestMonths: '11,12,1,2' },
  { name: 'Phuket', country: 'Thailand', lat: 7.8804, lng: 98.3923, isSupported: true, tier: 3, safetyIndex: 58, costOfLivingIndex: 40, avgMealCost: 5, bestMonths: '11,12,1,2,3,4' },
  { name: 'Bali', country: 'Indonesia', lat: -8.3405, lng: 115.092, isSupported: true, tier: 2, safetyIndex: 68.2, costOfLivingIndex: 32, avgMealCost: 5, bestMonths: '5,6,7,8,9,10' },
  { name: 'Hanoi', country: 'Vietnam', lat: 21.0285, lng: 105.8542, isSupported: true, tier: 2, safetyIndex: 63.4, costOfLivingIndex: 28, avgMealCost: 3, bestMonths: '10,11,12,3,4' },
  { name: 'Ho Chi Minh City', country: 'Vietnam', lat: 10.8231, lng: 106.6297, isSupported: true, tier: 2, safetyIndex: 58.9, costOfLivingIndex: 30, avgMealCost: 3.5, bestMonths: '12,1,2,3' },
  { name: 'Hoi An', country: 'Vietnam', lat: 15.8801, lng: 108.338, isSupported: true, tier: 3, safetyIndex: 74.2, costOfLivingIndex: 25, avgMealCost: 4, bestMonths: '2,3,4,5' },
  { name: 'Da Nang', country: 'Vietnam', lat: 16.0544, lng: 108.2022, isSupported: true, tier: 3, safetyIndex: 72, costOfLivingIndex: 26, avgMealCost: 3, bestMonths: '2,3,4,5' },
  { name: 'Siem Reap', country: 'Cambodia', lat: 13.3671, lng: 103.8448, isSupported: true, tier: 3, safetyIndex: 65.5, costOfLivingIndex: 26, avgMealCost: 5, bestMonths: '11,12,1,2' },
  { name: 'Colombo', country: 'Sri Lanka', lat: 6.9271, lng: 79.8612, isSupported: true, tier: 3, safetyIndex: 60.5, costOfLivingIndex: 30, avgMealCost: 4, bestMonths: '1,2,3,4' },
  { name: 'Malé Atolls', country: 'Maldives', lat: 4.1755, lng: 73.5093, isSupported: true, tier: 3, safetyIndex: 65, costOfLivingIndex: 75, avgMealCost: 30, bestMonths: '11,12,1,2,3,4' },
  { name: 'Penang', country: 'Malaysia', lat: 5.4164, lng: 100.3327, isSupported: true, tier: 3, safetyIndex: 55, costOfLivingIndex: 28, avgMealCost: 3, bestMonths: '12,1,2,3' },
  { name: 'Luang Prabang', country: 'Laos', lat: 19.8856, lng: 102.1347, isSupported: true, tier: 3, safetyIndex: 70, costOfLivingIndex: 22, avgMealCost: 4, bestMonths: '11,12,1,2,3' },
  { name: 'Kathmandu', country: 'Nepal', lat: 27.7172, lng: 85.324, isSupported: true, tier: 3, safetyIndex: 60, costOfLivingIndex: 18, avgMealCost: 3, bestMonths: '3,4,5,9,10,11' },
  { name: 'Goa', country: 'India', lat: 15.2993, lng: 74.124, isSupported: true, tier: 3, safetyIndex: 55, costOfLivingIndex: 20, avgMealCost: 4, bestMonths: '11,12,1,2,3' },

  // ── Americas ──────────────────────────────────────────────────────────
  { name: 'New York', country: 'United States', lat: 40.7128, lng: -74.006, isSupported: true, tier: 1, safetyIndex: 55, costOfLivingIndex: 90, avgMealCost: 25, bestMonths: '4,5,6,9,10' },
  { name: 'Los Angeles', country: 'United States', lat: 33.9425, lng: -118.408, isSupported: true, tier: 1, safetyIndex: 50, costOfLivingIndex: 85, avgMealCost: 22, bestMonths: '3,4,5,9,10,11' },
  { name: 'Miami', country: 'United States', lat: 25.7617, lng: -80.1918, isSupported: true, tier: 2, safetyIndex: 52, costOfLivingIndex: 75, avgMealCost: 20, bestMonths: '11,12,1,2,3,4' },
  { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332, isSupported: true, tier: 1, safetyIndex: 42.6, costOfLivingIndex: 35, avgMealCost: 8, bestMonths: '3,4,5,10,11' },
  { name: 'Cancun', country: 'Mexico', lat: 21.1619, lng: -86.8515, isSupported: true, tier: 2, safetyIndex: 48, costOfLivingIndex: 40, avgMealCost: 10, bestMonths: '11,12,1,2,3,4' },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lng: -58.3816, isSupported: true, tier: 1, safetyIndex: 47.9, costOfLivingIndex: 20, avgMealCost: 6, bestMonths: '3,4,5,9,10,11' },
  { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333, isSupported: true, tier: 1, safetyIndex: 38, costOfLivingIndex: 35, avgMealCost: 8, bestMonths: '4,5,6,7,8,9' },
  { name: 'Rio de Janeiro', country: 'Brazil', lat: -22.9068, lng: -43.1729, isSupported: true, tier: 2, safetyIndex: 35, costOfLivingIndex: 35, avgMealCost: 8, bestMonths: '5,6,7,8,9' },
  { name: 'Bogotá', country: 'Colombia', lat: 4.711, lng: -74.0721, isSupported: true, tier: 2, safetyIndex: 44, costOfLivingIndex: 25, avgMealCost: 5, bestMonths: '12,1,2,3' },
  { name: 'Cartagena', country: 'Colombia', lat: 10.391, lng: -75.5144, isSupported: true, tier: 3, safetyIndex: 46.5, costOfLivingIndex: 28, avgMealCost: 8, bestMonths: '1,2,3,12' },
  { name: 'Medellín', country: 'Colombia', lat: 6.2476, lng: -75.5658, isSupported: true, tier: 3, safetyIndex: 42.1, costOfLivingIndex: 22, avgMealCost: 5, bestMonths: '1,2,3,12' },
  { name: 'Lima', country: 'Peru', lat: -12.0464, lng: -77.0428, isSupported: true, tier: 2, safetyIndex: 33.8, costOfLivingIndex: 30, avgMealCost: 6, bestMonths: '12,1,2,3,4' },
  { name: 'Cusco', country: 'Peru', lat: -13.532, lng: -71.9675, isSupported: true, tier: 3, safetyIndex: 49.2, costOfLivingIndex: 25, avgMealCost: 5, bestMonths: '5,6,7,8,9,10' },
  { name: 'Panama City', country: 'Panama', lat: 8.9824, lng: -79.5199, isSupported: true, tier: 2, safetyIndex: 51.5, costOfLivingIndex: 55, avgMealCost: 10, bestMonths: '1,2,3,4' },
  { name: 'La Fortuna', country: 'Costa Rica', lat: 10.4719, lng: -84.6427, isSupported: true, tier: 3, safetyIndex: 65.5, costOfLivingIndex: 45, avgMealCost: 12, bestMonths: '12,1,2,3,4' },
  { name: 'San José', country: 'Costa Rica', lat: 9.9281, lng: -84.0907, isSupported: true, tier: 3, safetyIndex: 44.1, costOfLivingIndex: 50, avgMealCost: 10, bestMonths: '12,1,2,3,4' },
  { name: 'Guatemala City', country: 'Guatemala', lat: 14.6349, lng: -90.5069, isSupported: true, tier: 3, safetyIndex: 38.5, costOfLivingIndex: 35, avgMealCost: 6, bestMonths: '11,12,1,2,3,4' },
  { name: 'Antigua', country: 'Guatemala', lat: 14.5586, lng: -90.7295, isSupported: true, tier: 3, safetyIndex: 52.4, costOfLivingIndex: 40, avgMealCost: 8, bestMonths: '11,12,1,2,3,4' },
  { name: 'Granada', country: 'Nicaragua', lat: 11.9344, lng: -85.956, isSupported: true, tier: 3, safetyIndex: 55, costOfLivingIndex: 25, avgMealCost: 5, bestMonths: '12,1,2,3,4' },
  { name: 'Oaxaca', country: 'Mexico', lat: 17.0732, lng: -96.7266, isSupported: true, tier: 3, safetyIndex: 50, costOfLivingIndex: 28, avgMealCost: 5, bestMonths: '10,11,12,3,4' },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832, isSupported: true, tier: 2, safetyIndex: 72, costOfLivingIndex: 70, avgMealCost: 20, bestMonths: '5,6,7,8,9' },
  { name: 'Vancouver', country: 'Canada', lat: 49.2827, lng: -123.1207, isSupported: true, tier: 2, safetyIndex: 70, costOfLivingIndex: 72, avgMealCost: 20, bestMonths: '6,7,8,9' },
  { name: 'Santiago', country: 'Chile', lat: -33.4489, lng: -70.6693, isSupported: true, tier: 2, safetyIndex: 50, costOfLivingIndex: 40, avgMealCost: 10, bestMonths: '10,11,12,1,2,3' },
  { name: 'Havana', country: 'Cuba', lat: 23.1136, lng: -82.3666, isSupported: true, tier: 3, safetyIndex: 58, costOfLivingIndex: 22, avgMealCost: 6, bestMonths: '11,12,1,2,3,4' },

  // ── Africa ────────────────────────────────────────────────────────────
  { name: 'Cape Town', country: 'South Africa', lat: -33.9249, lng: 18.4241, isSupported: true, tier: 2, safetyIndex: 42, costOfLivingIndex: 35, avgMealCost: 8, bestMonths: '10,11,12,1,2,3' },
  { name: 'Nairobi', country: 'Kenya', lat: -1.2921, lng: 36.8219, isSupported: true, tier: 2, safetyIndex: 40, costOfLivingIndex: 28, avgMealCost: 5, bestMonths: '1,2,7,8,9,10' },
  { name: 'Zanzibar', country: 'Tanzania', lat: -6.1659, lng: 39.2026, isSupported: true, tier: 3, safetyIndex: 55, costOfLivingIndex: 22, avgMealCost: 5, bestMonths: '6,7,8,9,10' },
  { name: 'Johannesburg', country: 'South Africa', lat: -26.2041, lng: 28.0473, isSupported: true, tier: 2, safetyIndex: 35, costOfLivingIndex: 32, avgMealCost: 8, bestMonths: '4,5,8,9,10' },
  { name: 'Addis Ababa', country: 'Ethiopia', lat: 8.9806, lng: 38.7578, isSupported: true, tier: 3, safetyIndex: 45, costOfLivingIndex: 18, avgMealCost: 3, bestMonths: '10,11,12,1,2,3' },
  { name: 'Accra', country: 'Ghana', lat: 5.6037, lng: -0.187, isSupported: true, tier: 3, safetyIndex: 52, costOfLivingIndex: 25, avgMealCost: 4, bestMonths: '11,12,1,2' },
  { name: 'Kigali', country: 'Rwanda', lat: -1.9403, lng: 29.8739, isSupported: true, tier: 3, safetyIndex: 68, costOfLivingIndex: 22, avgMealCost: 4, bestMonths: '6,7,8,9' },
  { name: 'Dakar', country: 'Senegal', lat: 14.7167, lng: -17.4677, isSupported: true, tier: 3, safetyIndex: 50, costOfLivingIndex: 25, avgMealCost: 5, bestMonths: '11,12,1,2,3,4' },

  // ── Oceania ───────────────────────────────────────────────────────────
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, isSupported: true, tier: 1, safetyIndex: 78, costOfLivingIndex: 80, avgMealCost: 22, bestMonths: '9,10,11,12,1,2,3' },
  { name: 'Melbourne', country: 'Australia', lat: -37.8136, lng: 144.9631, isSupported: true, tier: 2, safetyIndex: 75, costOfLivingIndex: 75, avgMealCost: 20, bestMonths: '10,11,12,1,2,3' },
  { name: 'Auckland', country: 'New Zealand', lat: -36.8485, lng: 174.7633, isSupported: true, tier: 2, safetyIndex: 74, costOfLivingIndex: 68, avgMealCost: 18, bestMonths: '11,12,1,2,3' },
  { name: 'Queenstown', country: 'New Zealand', lat: -45.0312, lng: 168.6626, isSupported: true, tier: 3, safetyIndex: 80, costOfLivingIndex: 72, avgMealCost: 22, bestMonths: '12,1,2,3,6,7,8' },
];

// World capitals and significant cities (non-supported) for background markers
export const WORLD_CAPITALS: CityPoint[] = [
  // ── Americas ──────────────────────────────────────────────────────────
  { name: 'Washington D.C.', country: 'United States', lat: 38.9072, lng: -77.0369, isSupported: false, tier: 1 },
  { name: 'Ottawa', country: 'Canada', lat: 45.4215, lng: -75.6972, isSupported: false, tier: 2 },
  { name: 'Brasília', country: 'Brazil', lat: -15.7975, lng: -47.8919, isSupported: false, tier: 2 },
  { name: 'Quito', country: 'Ecuador', lat: -0.1807, lng: -78.4678, isSupported: false, tier: 3 },
  { name: 'Montevideo', country: 'Uruguay', lat: -34.9011, lng: -56.1645, isSupported: false, tier: 3 },
  { name: 'Asunción', country: 'Paraguay', lat: -25.2637, lng: -57.5759, isSupported: false, tier: 3 },
  { name: 'La Paz', country: 'Bolivia', lat: -16.4897, lng: -68.1193, isSupported: false, tier: 3 },
  { name: 'Caracas', country: 'Venezuela', lat: 10.4806, lng: -66.9036, isSupported: false, tier: 3 },
  { name: 'Georgetown', country: 'Guyana', lat: 6.8013, lng: -58.1551, isSupported: false, tier: 3 },
  { name: 'Paramaribo', country: 'Suriname', lat: 5.852, lng: -55.2038, isSupported: false, tier: 3 },
  { name: 'Managua', country: 'Nicaragua', lat: 12.1364, lng: -86.2514, isSupported: false, tier: 3 },
  { name: 'Tegucigalpa', country: 'Honduras', lat: 14.0723, lng: -87.1921, isSupported: false, tier: 3 },
  { name: 'San Salvador', country: 'El Salvador', lat: 13.6929, lng: -89.2182, isSupported: false, tier: 3 },
  { name: 'Kingston', country: 'Jamaica', lat: 18.0179, lng: -76.8099, isSupported: false, tier: 3 },
  { name: 'Port-au-Prince', country: 'Haiti', lat: 18.5944, lng: -72.3074, isSupported: false, tier: 3 },
  { name: 'Chicago', country: 'United States', lat: 41.8781, lng: -87.6298, isSupported: false, tier: 1 },
  { name: 'San Francisco', country: 'United States', lat: 37.7749, lng: -122.4194, isSupported: false, tier: 2 },
  { name: 'Atlanta', country: 'United States', lat: 33.749, lng: -84.388, isSupported: false, tier: 2 },
  { name: 'Dallas', country: 'United States', lat: 32.7767, lng: -96.797, isSupported: false, tier: 2 },
  { name: 'Denver', country: 'United States', lat: 39.7392, lng: -104.9903, isSupported: false, tier: 3 },
  { name: 'Montreal', country: 'Canada', lat: 45.5017, lng: -73.5673, isSupported: false, tier: 2 },

  // ── Europe ────────────────────────────────────────────────────────────
  { name: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405, isSupported: false, tier: 1 },
  { name: 'Madrid', country: 'Spain', lat: 40.4168, lng: -3.7038, isSupported: false, tier: 1 },
  { name: 'Warsaw', country: 'Poland', lat: 52.2297, lng: 21.0122, isSupported: false, tier: 2 },
  { name: 'Stockholm', country: 'Sweden', lat: 59.3293, lng: 18.0686, isSupported: false, tier: 2 },
  { name: 'Oslo', country: 'Norway', lat: 59.9139, lng: 10.7522, isSupported: false, tier: 2 },
  { name: 'Helsinki', country: 'Finland', lat: 60.1699, lng: 24.9384, isSupported: false, tier: 2 },
  { name: 'Dublin', country: 'Ireland', lat: 53.3498, lng: -6.2603, isSupported: false, tier: 2 },
  { name: 'Brussels', country: 'Belgium', lat: 50.8503, lng: 4.3517, isSupported: false, tier: 2 },
  { name: 'Bern', country: 'Switzerland', lat: 46.9481, lng: 7.4474, isSupported: false, tier: 3 },
  { name: 'Ankara', country: 'Turkey', lat: 39.9334, lng: 32.8597, isSupported: false, tier: 2 },
  { name: 'Kyiv', country: 'Ukraine', lat: 50.4501, lng: 30.5234, isSupported: false, tier: 2 },
  { name: 'Moscow', country: 'Russia', lat: 55.7558, lng: 37.6173, isSupported: false, tier: 1 },
  { name: 'Reykjavik', country: 'Iceland', lat: 64.1466, lng: -21.9426, isSupported: false, tier: 3 },
  { name: 'Vilnius', country: 'Lithuania', lat: 54.6872, lng: 25.2797, isSupported: false, tier: 3 },
  { name: 'Riga', country: 'Latvia', lat: 56.9496, lng: 24.1052, isSupported: false, tier: 3 },
  { name: 'Tallinn', country: 'Estonia', lat: 59.437, lng: 24.7536, isSupported: false, tier: 3 },
  { name: 'Zagreb', country: 'Croatia', lat: 45.815, lng: 15.9819, isSupported: false, tier: 3 },
  { name: 'Podgorica', country: 'Montenegro', lat: 42.4304, lng: 19.2594, isSupported: false, tier: 3 },
  { name: 'Bratislava', country: 'Slovakia', lat: 48.1486, lng: 17.1077, isSupported: false, tier: 3 },
  { name: 'Minsk', country: 'Belarus', lat: 53.9006, lng: 27.559, isSupported: false, tier: 3 },
  { name: 'Chisinau', country: 'Moldova', lat: 47.0105, lng: 28.8638, isSupported: false, tier: 3 },
  { name: 'Tirana', country: 'Albania', lat: 41.3275, lng: 19.8187, isSupported: false, tier: 3 },
  { name: 'Luxembourg', country: 'Luxembourg', lat: 49.6116, lng: 6.13, isSupported: false, tier: 3 },
  { name: 'St. Petersburg', country: 'Russia', lat: 59.9343, lng: 30.3351, isSupported: false, tier: 2 },
  { name: 'Gothenburg', country: 'Sweden', lat: 57.7089, lng: 11.9746, isSupported: false, tier: 3 },

  // ── Asia ──────────────────────────────────────────────────────────────
  { name: 'Beijing', country: 'China', lat: 39.9042, lng: 116.4074, isSupported: false, tier: 1 },
  { name: 'Shanghai', country: 'China', lat: 31.2304, lng: 121.4737, isSupported: false, tier: 1 },
  { name: 'Guangzhou', country: 'China', lat: 23.1291, lng: 113.2644, isSupported: false, tier: 2 },
  { name: 'Shenzhen', country: 'China', lat: 22.5431, lng: 114.0579, isSupported: false, tier: 2 },
  { name: 'Islamabad', country: 'Pakistan', lat: 33.6844, lng: 73.0479, isSupported: false, tier: 2 },
  { name: 'Karachi', country: 'Pakistan', lat: 24.8607, lng: 67.0011, isSupported: false, tier: 2 },
  { name: 'Dhaka', country: 'Bangladesh', lat: 23.8103, lng: 90.4125, isSupported: false, tier: 2 },
  { name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lng: 106.8456, isSupported: false, tier: 1 },
  { name: 'Manila', country: 'Philippines', lat: 14.5995, lng: 120.9842, isSupported: false, tier: 2 },
  { name: 'Phnom Penh', country: 'Cambodia', lat: 11.5564, lng: 104.9282, isSupported: false, tier: 3 },
  { name: 'Vientiane', country: 'Laos', lat: 17.9757, lng: 102.6331, isSupported: false, tier: 3 },
  { name: 'Naypyidaw', country: 'Myanmar', lat: 19.7633, lng: 96.0785, isSupported: false, tier: 3 },
  { name: 'Yangon', country: 'Myanmar', lat: 16.8661, lng: 96.1951, isSupported: false, tier: 3 },
  { name: 'Ulaanbaatar', country: 'Mongolia', lat: 47.8864, lng: 106.9057, isSupported: false, tier: 3 },
  { name: 'Busan', country: 'South Korea', lat: 35.1796, lng: 129.0756, isSupported: false, tier: 3 },
  { name: 'Kolkata', country: 'India', lat: 22.5726, lng: 88.3639, isSupported: false, tier: 2 },
  { name: 'Chennai', country: 'India', lat: 13.0827, lng: 80.2707, isSupported: false, tier: 3 },
  { name: 'Bangalore', country: 'India', lat: 12.9716, lng: 77.5946, isSupported: false, tier: 2 },
  { name: 'Hyderabad', country: 'India', lat: 17.385, lng: 78.4867, isSupported: false, tier: 3 },
  { name: 'Colombo', country: 'Sri Lanka', lat: 6.9271, lng: 79.8612, isSupported: false, tier: 3 },

  // ── Middle East & Central Asia ────────────────────────────────────────
  { name: 'Riyadh', country: 'Saudi Arabia', lat: 24.7136, lng: 46.6753, isSupported: false, tier: 1 },
  { name: 'Jeddah', country: 'Saudi Arabia', lat: 21.4858, lng: 39.1925, isSupported: false, tier: 2 },
  { name: 'Abu Dhabi', country: 'UAE', lat: 24.4539, lng: 54.3773, isSupported: false, tier: 2 },
  { name: 'Tehran', country: 'Iran', lat: 35.6892, lng: 51.389, isSupported: false, tier: 2 },
  { name: 'Baghdad', country: 'Iraq', lat: 33.3152, lng: 44.3661, isSupported: false, tier: 2 },
  { name: 'Beirut', country: 'Lebanon', lat: 33.8938, lng: 35.5018, isSupported: false, tier: 3 },
  { name: 'Baku', country: 'Azerbaijan', lat: 40.4093, lng: 49.8671, isSupported: false, tier: 3 },
  { name: 'Yerevan', country: 'Armenia', lat: 40.1792, lng: 44.4991, isSupported: false, tier: 3 },
  { name: 'Astana', country: 'Kazakhstan', lat: 51.1694, lng: 71.4491, isSupported: false, tier: 3 },
  { name: 'Tashkent', country: 'Uzbekistan', lat: 41.2995, lng: 69.2401, isSupported: false, tier: 3 },
  { name: 'Bishkek', country: 'Kyrgyzstan', lat: 42.8746, lng: 74.5698, isSupported: false, tier: 3 },
  { name: 'Dushanbe', country: 'Tajikistan', lat: 38.5598, lng: 68.774, isSupported: false, tier: 3 },
  { name: 'Ashgabat', country: 'Turkmenistan', lat: 37.9601, lng: 58.3261, isSupported: false, tier: 3 },
  { name: 'Kuwait City', country: 'Kuwait', lat: 29.3759, lng: 47.9774, isSupported: false, tier: 3 },
  { name: 'Manama', country: 'Bahrain', lat: 26.2285, lng: 50.586, isSupported: false, tier: 3 },

  // ── Africa ────────────────────────────────────────────────────────────
  { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792, isSupported: false, tier: 1 },
  { name: 'Algiers', country: 'Algeria', lat: 36.7538, lng: 3.0588, isSupported: false, tier: 2 },
  { name: 'Pretoria', country: 'South Africa', lat: -25.7479, lng: 28.2293, isSupported: false, tier: 2 },
  { name: 'Dar es Salaam', country: 'Tanzania', lat: -6.7924, lng: 39.2083, isSupported: false, tier: 3 },
  { name: 'Kampala', country: 'Uganda', lat: 0.3476, lng: 32.5825, isSupported: false, tier: 3 },
  { name: 'Maputo', country: 'Mozambique', lat: -25.9692, lng: 32.5732, isSupported: false, tier: 3 },
  { name: 'Lusaka', country: 'Zambia', lat: -15.3875, lng: 28.3228, isSupported: false, tier: 3 },
  { name: 'Harare', country: 'Zimbabwe', lat: -17.8252, lng: 31.0335, isSupported: false, tier: 3 },
  { name: 'Windhoek', country: 'Namibia', lat: -22.5609, lng: 17.0658, isSupported: false, tier: 3 },
  { name: 'Gaborone', country: 'Botswana', lat: -24.6282, lng: 25.9231, isSupported: false, tier: 3 },
  { name: 'Abuja', country: 'Nigeria', lat: 9.0765, lng: 7.3986, isSupported: false, tier: 3 },
  { name: 'Kinshasa', country: 'DR Congo', lat: -4.4419, lng: 15.2663, isSupported: false, tier: 2 },
  { name: 'Luanda', country: 'Angola', lat: -8.8399, lng: 13.2894, isSupported: false, tier: 3 },
  { name: 'Bamako', country: 'Mali', lat: 12.6392, lng: -8.0029, isSupported: false, tier: 3 },
  { name: 'Antananarivo', country: 'Madagascar', lat: -18.8792, lng: 47.5079, isSupported: false, tier: 3 },
  { name: 'Tripoli', country: 'Libya', lat: 32.8872, lng: 13.1802, isSupported: false, tier: 3 },
  { name: 'Rabat', country: 'Morocco', lat: 34.0209, lng: -6.8416, isSupported: false, tier: 3 },
  { name: 'Abidjan', country: 'Ivory Coast', lat: 5.3599, lng: -4.0083, isSupported: false, tier: 3 },
  { name: 'Nouakchott', country: 'Mauritania', lat: 18.0735, lng: -15.9582, isSupported: false, tier: 3 },

  // ── Oceania ───────────────────────────────────────────────────────────
  { name: 'Canberra', country: 'Australia', lat: -35.2809, lng: 149.13, isSupported: false, tier: 3 },
  { name: 'Wellington', country: 'New Zealand', lat: -41.2865, lng: 174.7762, isSupported: false, tier: 3 },
  { name: 'Brisbane', country: 'Australia', lat: -27.4698, lng: 153.0251, isSupported: false, tier: 2 },
  { name: 'Perth', country: 'Australia', lat: -31.9505, lng: 115.8605, isSupported: false, tier: 3 },
  { name: 'Suva', country: 'Fiji', lat: -18.1416, lng: 178.4419, isSupported: false, tier: 3 },
  { name: 'Port Moresby', country: 'Papua New Guinea', lat: -6.3149, lng: 143.9556, isSupported: false, tier: 3 },
  { name: 'Honolulu', country: 'United States', lat: 21.3069, lng: -157.8583, isSupported: false, tier: 3 },
  { name: 'Adelaide', country: 'Australia', lat: -34.9285, lng: 138.6007, isSupported: false, tier: 3 },
  { name: 'Christchurch', country: 'New Zealand', lat: -43.532, lng: 172.6306, isSupported: false, tier: 3 },
  { name: 'Noumea', country: 'New Caledonia', lat: -22.2558, lng: 166.4505, isSupported: false, tier: 3 },
  { name: 'Apia', country: 'Samoa', lat: -13.8333, lng: -171.75, isSupported: false, tier: 3 },

  // ── Additional global cities ─────────────────────────────────────────
  { name: 'Chengdu', country: 'China', lat: 30.5728, lng: 104.0668, isSupported: false, tier: 2 },
  { name: 'Wuhan', country: 'China', lat: 30.5928, lng: 114.3055, isSupported: false, tier: 3 },
  { name: 'Chongqing', country: 'China', lat: 29.4316, lng: 106.9123, isSupported: false, tier: 3 },
  { name: 'Hangzhou', country: 'China', lat: 30.2741, lng: 120.1551, isSupported: false, tier: 3 },
  { name: 'Xi\'an', country: 'China', lat: 34.3416, lng: 108.9398, isSupported: false, tier: 3 },
  { name: 'Nagoya', country: 'Japan', lat: 35.1815, lng: 136.9066, isSupported: false, tier: 3 },
  { name: 'Fukuoka', country: 'Japan', lat: 33.5904, lng: 130.4017, isSupported: false, tier: 3 },
  { name: 'Incheon', country: 'South Korea', lat: 37.4563, lng: 126.7052, isSupported: false, tier: 2 },
  { name: 'Cebu', country: 'Philippines', lat: 10.3157, lng: 123.8854, isSupported: false, tier: 3 },
  { name: 'Surabaya', country: 'Indonesia', lat: -7.2575, lng: 112.7521, isSupported: false, tier: 3 },
  { name: 'Medan', country: 'Indonesia', lat: 3.5952, lng: 98.6722, isSupported: false, tier: 3 },
  { name: 'Lahore', country: 'Pakistan', lat: 31.5204, lng: 74.3587, isSupported: false, tier: 3 },
  { name: 'Ahmedabad', country: 'India', lat: 23.0225, lng: 72.5714, isSupported: false, tier: 3 },
  { name: 'Pune', country: 'India', lat: 18.5204, lng: 73.8567, isSupported: false, tier: 3 },
  { name: 'Dhiban', country: 'Jordan', lat: 31.5, lng: 35.78, isSupported: false, tier: 3 },
  { name: 'Salalah', country: 'Oman', lat: 17.0151, lng: 54.0924, isSupported: false, tier: 3 },
  { name: 'Tbilisi', country: 'Georgia', lat: 41.7151, lng: 44.8271, isSupported: false, tier: 3 },
  { name: 'Almaty', country: 'Kazakhstan', lat: 43.2551, lng: 76.9126, isSupported: false, tier: 3 },
  { name: 'Samarkand', country: 'Uzbekistan', lat: 39.6542, lng: 66.9597, isSupported: false, tier: 3 },
  { name: 'Ulan-Ude', country: 'Russia', lat: 51.8335, lng: 107.5841, isSupported: false, tier: 3 },
  { name: 'Vladivostok', country: 'Russia', lat: 43.1332, lng: 131.9113, isSupported: false, tier: 3 },
  { name: 'Novosibirsk', country: 'Russia', lat: 55.0084, lng: 82.9357, isSupported: false, tier: 3 },
  { name: 'Niamey', country: 'Niger', lat: 13.5116, lng: 2.1254, isSupported: false, tier: 3 },
  { name: 'Ouagadougou', country: 'Burkina Faso', lat: 12.3714, lng: -1.5197, isSupported: false, tier: 3 },
  { name: 'Conakry', country: 'Guinea', lat: 9.6412, lng: -13.5784, isSupported: false, tier: 3 },
  { name: 'Freetown', country: 'Sierra Leone', lat: 8.4657, lng: -13.2317, isSupported: false, tier: 3 },
  { name: 'Monrovia', country: 'Liberia', lat: 6.3156, lng: -10.8074, isSupported: false, tier: 3 },
  { name: 'Libreville', country: 'Gabon', lat: 0.4162, lng: 9.4673, isSupported: false, tier: 3 },
  { name: 'Brazzaville', country: 'Congo', lat: -4.2634, lng: 15.2429, isSupported: false, tier: 3 },
  { name: 'Yaoundé', country: 'Cameroon', lat: 3.848, lng: 11.5021, isSupported: false, tier: 3 },
  { name: 'Douala', country: 'Cameroon', lat: 4.0511, lng: 9.7679, isSupported: false, tier: 3 },
  { name: 'Asmara', country: 'Eritrea', lat: 15.3229, lng: 38.9251, isSupported: false, tier: 3 },
  { name: 'Mogadishu', country: 'Somalia', lat: 2.0469, lng: 45.3182, isSupported: false, tier: 3 },
  { name: 'Djibouti', country: 'Djibouti', lat: 11.5721, lng: 43.1456, isSupported: false, tier: 3 },
  { name: 'Port Louis', country: 'Mauritius', lat: -20.1609, lng: 57.5012, isSupported: false, tier: 3 },
  { name: 'Victoria', country: 'Seychelles', lat: -4.6191, lng: 55.4513, isSupported: false, tier: 3 },
  { name: 'Recife', country: 'Brazil', lat: -8.0476, lng: -34.877, isSupported: false, tier: 3 },
  { name: 'Salvador', country: 'Brazil', lat: -12.9714, lng: -38.5124, isSupported: false, tier: 3 },
  { name: 'Belo Horizonte', country: 'Brazil', lat: -19.9167, lng: -43.9345, isSupported: false, tier: 3 },
  { name: 'Córdoba', country: 'Argentina', lat: -31.4201, lng: -64.1888, isSupported: false, tier: 3 },
  { name: 'Guayaquil', country: 'Ecuador', lat: -2.1894, lng: -79.8891, isSupported: false, tier: 3 },
  { name: 'Santa Cruz', country: 'Bolivia', lat: -17.7833, lng: -63.1822, isSupported: false, tier: 3 },
  { name: 'Anchorage', country: 'United States', lat: 61.2181, lng: -149.9003, isSupported: false, tier: 3 },

  // ── Additional major airports & secondary hubs ─────────────────────
  // Americas
  { name: 'Houston', country: 'United States', lat: 29.7604, lng: -95.3698, isSupported: false, tier: 2 },
  { name: 'Seattle', country: 'United States', lat: 47.6062, lng: -122.3321, isSupported: false, tier: 2 },
  { name: 'Boston', country: 'United States', lat: 42.3601, lng: -71.0589, isSupported: false, tier: 2 },
  { name: 'Philadelphia', country: 'United States', lat: 39.9526, lng: -75.1652, isSupported: false, tier: 2 },
  { name: 'Phoenix', country: 'United States', lat: 33.4484, lng: -112.074, isSupported: false, tier: 2 },
  { name: 'Minneapolis', country: 'United States', lat: 44.9778, lng: -93.265, isSupported: false, tier: 3 },
  { name: 'Las Vegas', country: 'United States', lat: 36.1699, lng: -115.1398, isSupported: false, tier: 3 },
  { name: 'Orlando', country: 'United States', lat: 28.5383, lng: -81.3792, isSupported: false, tier: 3 },
  { name: 'Portland', country: 'United States', lat: 45.5152, lng: -122.6784, isSupported: false, tier: 3 },
  { name: 'Nashville', country: 'United States', lat: 36.1627, lng: -86.7816, isSupported: false, tier: 3 },
  { name: 'Charlotte', country: 'United States', lat: 35.2271, lng: -80.8431, isSupported: false, tier: 3 },
  { name: 'Calgary', country: 'Canada', lat: 51.0447, lng: -114.0719, isSupported: false, tier: 3 },
  { name: 'Edmonton', country: 'Canada', lat: 53.5461, lng: -113.4938, isSupported: false, tier: 3 },
  { name: 'Guadalajara', country: 'Mexico', lat: 20.6597, lng: -103.3496, isSupported: false, tier: 2 },
  { name: 'Monterrey', country: 'Mexico', lat: 25.6866, lng: -100.3161, isSupported: false, tier: 3 },
  { name: 'Curitiba', country: 'Brazil', lat: -25.4284, lng: -49.2733, isSupported: false, tier: 3 },
  { name: 'Fortaleza', country: 'Brazil', lat: -3.7319, lng: -38.5267, isSupported: false, tier: 3 },
  { name: 'Manaus', country: 'Brazil', lat: -3.119, lng: -60.0217, isSupported: false, tier: 3 },
  { name: 'Porto Alegre', country: 'Brazil', lat: -30.0346, lng: -51.2177, isSupported: false, tier: 3 },
  // Europe
  { name: 'Manchester', country: 'United Kingdom', lat: 53.4808, lng: -2.2426, isSupported: false, tier: 2 },
  { name: 'Birmingham', country: 'United Kingdom', lat: 52.4862, lng: -1.8904, isSupported: false, tier: 3 },
  { name: 'Glasgow', country: 'United Kingdom', lat: 55.8642, lng: -4.2518, isSupported: false, tier: 3 },
  { name: 'Marseille', country: 'France', lat: 43.2965, lng: 5.3698, isSupported: false, tier: 2 },
  { name: 'Lyon', country: 'France', lat: 45.764, lng: 4.8357, isSupported: false, tier: 3 },
  { name: 'Naples', country: 'Italy', lat: 40.8518, lng: 14.2681, isSupported: false, tier: 3 },
  { name: 'Florence', country: 'Italy', lat: 43.7696, lng: 11.2558, isSupported: false, tier: 3 },
  { name: 'Venice', country: 'Italy', lat: 45.4408, lng: 12.3155, isSupported: false, tier: 3 },
  { name: 'Bologna', country: 'Italy', lat: 44.4949, lng: 11.3426, isSupported: false, tier: 3 },
  { name: 'Palermo', country: 'Italy', lat: 38.1157, lng: 13.3615, isSupported: false, tier: 3 },
  { name: 'Valencia', country: 'Spain', lat: 39.4699, lng: -0.3763, isSupported: false, tier: 3 },
  { name: 'Málaga', country: 'Spain', lat: 36.7213, lng: -4.4214, isSupported: false, tier: 3 },
  { name: 'Bilbao', country: 'Spain', lat: 43.263, lng: -2.935, isSupported: false, tier: 3 },
  { name: 'Rotterdam', country: 'Netherlands', lat: 51.9225, lng: 4.4792, isSupported: false, tier: 3 },
  { name: 'Antwerp', country: 'Belgium', lat: 51.2194, lng: 4.4025, isSupported: false, tier: 3 },
  { name: 'Thessaloniki', country: 'Greece', lat: 40.6401, lng: 22.9444, isSupported: false, tier: 3 },
  { name: 'Gdańsk', country: 'Poland', lat: 54.352, lng: 18.6466, isSupported: false, tier: 3 },
  { name: 'Wrocław', country: 'Poland', lat: 51.1079, lng: 17.0385, isSupported: false, tier: 3 },
  // Asia
  { name: 'Sapporo', country: 'Japan', lat: 43.0618, lng: 141.3545, isSupported: false, tier: 3 },
  { name: 'Jaipur', country: 'India', lat: 26.9124, lng: 75.7873, isSupported: false, tier: 3 },
  { name: 'Kochi', country: 'India', lat: 9.9312, lng: 76.2673, isSupported: false, tier: 3 },
  { name: 'Bandung', country: 'Indonesia', lat: -6.9175, lng: 107.6191, isSupported: false, tier: 3 },
  { name: 'Yogyakarta', country: 'Indonesia', lat: -7.7956, lng: 110.3695, isSupported: false, tier: 3 },
  { name: 'Makassar', country: 'Indonesia', lat: -5.1477, lng: 119.4327, isSupported: false, tier: 3 },
  { name: 'Johor Bahru', country: 'Malaysia', lat: 1.4927, lng: 103.7414, isSupported: false, tier: 3 },
  { name: 'Davao', country: 'Philippines', lat: 7.1907, lng: 125.4553, isSupported: false, tier: 3 },
  { name: 'Nha Trang', country: 'Vietnam', lat: 12.2388, lng: 109.1967, isSupported: false, tier: 3 },
  { name: 'Chittagong', country: 'Bangladesh', lat: 22.3569, lng: 91.7832, isSupported: false, tier: 3 },
  { name: 'Yekaterinburg', country: 'Russia', lat: 56.8389, lng: 60.6057, isSupported: false, tier: 3 },
  { name: 'Krasnoyarsk', country: 'Russia', lat: 56.0097, lng: 92.8525, isSupported: false, tier: 3 },
  { name: 'Kazan', country: 'Russia', lat: 55.8304, lng: 49.0661, isSupported: false, tier: 3 },
  { name: 'Kunming', country: 'China', lat: 25.0389, lng: 102.7183, isSupported: false, tier: 3 },
  { name: 'Nanning', country: 'China', lat: 22.817, lng: 108.3665, isSupported: false, tier: 3 },
  // Africa
  { name: 'Mombasa', country: 'Kenya', lat: -4.0435, lng: 39.6682, isSupported: false, tier: 3 },
  { name: 'Durban', country: 'South Africa', lat: -29.8587, lng: 31.0218, isSupported: false, tier: 2 },
  { name: 'Lomé', country: 'Togo', lat: 6.1375, lng: 1.2123, isSupported: false, tier: 3 },
  { name: 'Cotonou', country: 'Benin', lat: 6.3654, lng: 2.4183, isSupported: false, tier: 3 },
  { name: "N'Djamena", country: 'Chad', lat: 12.1348, lng: 15.0557, isSupported: false, tier: 3 },
  { name: 'Juba', country: 'South Sudan', lat: 4.8594, lng: 31.5713, isSupported: false, tier: 3 },
  { name: 'Bujumbura', country: 'Burundi', lat: -3.3822, lng: 29.3644, isSupported: false, tier: 3 },
  { name: 'Lilongwe', country: 'Malawi', lat: -13.9626, lng: 33.7741, isSupported: false, tier: 3 },
  // Oceania
  { name: 'Darwin', country: 'Australia', lat: -12.4634, lng: 130.8456, isSupported: false, tier: 3 },
  { name: 'Cairns', country: 'Australia', lat: -16.9186, lng: 145.7781, isSupported: false, tier: 3 },
  { name: 'Gold Coast', country: 'Australia', lat: -28.0167, lng: 153.4, isSupported: false, tier: 3 },
  { name: 'Papeete', country: 'French Polynesia', lat: -17.5516, lng: -149.5585, isSupported: false, tier: 3 },
  { name: 'Nadi', country: 'Fiji', lat: -17.7765, lng: 177.9653, isSupported: false, tier: 3 },
  // Middle East
  { name: 'Sharjah', country: 'UAE', lat: 25.3463, lng: 55.4209, isSupported: false, tier: 3 },
  { name: 'Medina', country: 'Saudi Arabia', lat: 24.4539, lng: 39.6142, isSupported: false, tier: 3 },
  { name: 'Erbil', country: 'Iraq', lat: 36.1912, lng: 44.0119, isSupported: false, tier: 3 },
];

export const ALL_CITIES: CityPoint[] = (() => {
  const seen = new Set<string>();
  return [...SUPPORTED_CITIES, ...WORLD_CAPITALS].filter(c => {
    const key = `${c.lat.toFixed(1)},${c.lng.toFixed(1)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
})();

const MONTH_NAMES: Record<string, string> = {
  '1': 'Jan', '2': 'Feb', '3': 'Mar', '4': 'Apr', '5': 'May', '6': 'Jun',
  '7': 'Jul', '8': 'Aug', '9': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

export function formatBestMonths(months?: string): string {
  if (!months) return 'Year-round';
  return months.split(',').map(m => MONTH_NAMES[m.trim()] || m.trim()).join(', ');
}

export function getSafetyColor(index?: number): string {
  if (!index) return '#64748b';
  if (index >= 75) return '#22c55e';
  if (index >= 60) return '#eab308';
  return '#ef4444';
}

export function getSafetyLabel(index?: number): string {
  if (!index) return 'Unknown';
  if (index >= 75) return 'Very Safe';
  if (index >= 60) return 'Moderate';
  return 'Caution';
}
