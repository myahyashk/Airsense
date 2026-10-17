export interface AQICategoryInfo {
  category: string;
  min: number;
  max: number;
  color: string;
  textColor: string;
  bgLight: string;
  borderColor: string;
  severity: "info" | "warning" | "danger";
  description: string;
  advisory: string;
}

export const AQI_CATEGORIES: AQICategoryInfo[] = [
  {
    category: "Good",
    min: 0,
    max: 50,
    color: "#10b981",
    textColor: "#34d399",
    bgLight: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    severity: "info",
    description: "Air quality is considered satisfactory, and air pollution poses little or no risk.",
    advisory: "Air quality is ideal for all outdoor activities across campus."
  },
  {
    category: "Moderate",
    min: 51,
    max: 100,
    color: "#eab308",
    textColor: "#facc15",
    bgLight: "rgba(234, 179, 8, 0.12)",
    borderColor: "rgba(234, 179, 8, 0.3)",
    severity: "info",
    description: "Air quality is acceptable; however, some pollutants may pose a moderate health concern.",
    advisory: "Unusually sensitive people should consider reducing prolonged outdoor exertion."
  },
  {
    category: "Unhealthy for Sensitive Groups",
    min: 101,
    max: 150,
    color: "#f97316",
    textColor: "#fb923c",
    bgLight: "rgba(249, 115, 22, 0.12)",
    borderColor: "rgba(249, 115, 22, 0.3)",
    severity: "warning",
    description: "Members of sensitive groups may experience health effects. The general public is not likely to be affected.",
    advisory: "Sensitive individuals should limit prolonged outdoor exertion on campus."
  },
  {
    category: "Unhealthy",
    min: 151,
    max: 200,
    color: "#ef4444",
    textColor: "#f87171",
    bgLight: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    severity: "danger",
    description: "Everyone may begin to experience health effects; sensitive groups may experience more serious effects.",
    advisory: "Active students and staff should avoid heavy outdoor exertion and wear masks."
  },
  {
    category: "Very Unhealthy",
    min: 201,
    max: 300,
    color: "#8b5cf6",
    textColor: "#a78bfa",
    bgLight: "rgba(139, 92, 246, 0.12)",
    borderColor: "rgba(139, 92, 246, 0.3)",
    severity: "danger",
    description: "Health alert: everyone may experience more serious health effects.",
    advisory: "Avoid all outdoor activities; remain in filtered indoor university spaces."
  },
  {
    category: "Hazardous",
    min: 301,
    max: 500,
    color: "#881337",
    textColor: "#fda4af",
    bgLight: "rgba(136, 19, 55, 0.2)",
    borderColor: "rgba(136, 19, 55, 0.5)",
    severity: "danger",
    description: "Health warnings of emergency conditions. The entire population is likely to be affected.",
    advisory: "Emergency campus warning: Stay indoors, seal windows, and wear N95 respirators."
  }
];

export function getAQIInfo(aqi: number): AQICategoryInfo {
  const val = Math.max(0, Math.round(aqi || 0));
  for (const cat of AQI_CATEGORIES) {
    if (val <= cat.max) {
      return cat;
    }
  }
  return AQI_CATEGORIES[AQI_CATEGORIES.length - 1];
}
