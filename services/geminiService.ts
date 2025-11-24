import { TripPreferences, AIItineraryResponse } from "../types";

/**
 * Generate itinerary by calling the backend API endpoint
 * This keeps the Gemini API key secure on the server side
 * 
 * Supports multiple hosting platforms:
 * - Vercel: Uses /api/generate-itinerary (api/generate-itinerary.ts)
 * - Cloudflare Pages: Uses /api/generate-itinerary (functions/api/generate-itinerary.ts)
 * - Netlify: Uses /api/generate-itinerary (netlify/functions/generate-itinerary.ts)
 */
export const generateItinerary = async (prefs: TripPreferences): Promise<AIItineraryResponse> => {
  // Use relative path - works in both dev and production
  // Works with Vercel, Cloudflare Pages, Netlify, and other platforms
  // Each platform will route /api/* to their respective serverless functions
  const apiUrl = '/api/generate-itinerary';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefs }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data.tripTitle || !data.itinerary) {
      throw new Error('Invalid response format from server');
    }

    return data as AIItineraryResponse;
  } catch (error) {
    // Re-throw with more context
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate itinerary. Please try again.');
  }
};