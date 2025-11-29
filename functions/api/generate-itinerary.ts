import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TripPreferences, AIItineraryResponse, ServiceType } from "../../types";

const ALLOWED_ORIGINS = [
  'https://japanvarietyprivate.pages.dev',
  'https://japanvarietyprivate.knox-thought.com',
  'http://localhost:3000',
];

/**
 * Cloudflare Pages Function
 * This file is automatically deployed as a serverless function at /api/generate-itinerary
 * 
 * Cloudflare Pages Functions use a slightly different runtime than Vercel,
 * but the code structure is very similar.
 */
export const onRequestPost = async ({ request, env }: { request: Request; env: any }) => {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Vary': 'Origin',
      },
    });
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not configured');
    return new Response(
      JSON.stringify({ error: 'API key not configured. Please set GEMINI_API_KEY environment variable.' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
          'Vary': 'Origin',
        },
      }
    );
  }

  try {
    const { prefs } = await request.json() as { prefs: TripPreferences };
    
    if (!prefs) {
      return new Response(
        JSON.stringify({ error: 'Missing trip preferences' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
            'Vary': 'Origin',
          },
        }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const itinerarySchema: Schema = {
      type: Type.OBJECT,
      properties: {
        tripTitle: { type: Type.STRING, description: "A catchy title for the trip in Thai" },
        summary: { type: Type.STRING, description: "A brief summary of the experience in Thai" },
        vehicleRecommendation: { type: Type.STRING, description: "Recommended vehicle type (e.g., Alphard, HiAce) with explanation in Thai" },
        estimatedDistanceKm: { type: Type.NUMBER, description: "Rough estimate of total driving distance" },
        quotationForOperator: { 
          type: Type.STRING, 
          description: " STRICTLY ENGLISH ONLY. A formatted text block for price estimation. Format for each service day:\nDate [DD/MM/YYYY]\nService: [Charter (10 Hours) / Transfer (Pickup Only)] [Time Info]\n[Pax] Pax, [Luggage] Luggage\n[Car Type]\n[Route A -> B -> C]" 
        },
        itinerary: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              dayNumber: { type: Type.INTEGER },
              date: { type: Type.STRING },
              serviceType: { type: Type.STRING, description: "The service type used this day (Transfer/Charter/None)" },
              theme: { type: Type.STRING, description: "Theme of the day in Thai (e.g. ชมวัฒนธรรมเก่าแก่)" },
              activities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING, description: "Time in HH:mm format (24hr)" },
                    title: { type: Type.STRING, description: "Activity title in Thai" },
                    description: { type: Type.STRING, description: "Activity description in Thai" },
                    isDrive: { type: Type.BOOLEAN, description: "True if this segment involves significant driving" }
                  }
                }
              }
            }
          }
        }
      }
    };

    const { region, days, travelerConfig, interests, startDate, endDate, customIdeas } = prefs;
    const totalPax = travelerConfig.adults + travelerConfig.toddlers;
    const totalLuggage = travelerConfig.suitcasesLarge + travelerConfig.suitcasesSmall;
    
    // Helper function to describe a single service
    const describeService = (service: any, date: string, serviceIndex: number) => {
      let desc = `Service #${serviceIndex + 1}: ${service.serviceType}`;
      
      if (service.serviceType === ServiceType.CHARTER) {
        // Charter service with start time
        const startTime = service.charterStartTime || '???';
        desc += ` (Start Time: ${startTime})`;
      } else if (service.serviceType === ServiceType.TRANSFER && service.flightInfo) {
        if (service.flightInfo.type === 'LANDING') {
           // Landing: Pickup is Landing Time + 1.5h
           const [h, m] = service.flightInfo.time.split(':').map(Number);
           const pickupH = h + 1 + Math.floor((m + 30)/60);
           const pickupM = (m + 30) % 60;
           desc += ` (FLIGHT LANDING at ${service.flightInfo.time}`;
           if (service.flightInfo.airport) {
             desc += `, Landing Airport: ${service.flightInfo.airport}`;
           }
           if (service.flightInfo.destination) {
             desc += `, Drop-off Location: ${service.flightInfo.destination}`;
           }
           desc += `, Pickup Appointment at ${pickupH}:${pickupM.toString().padStart(2,'0')})`;
        } else {
           // Takeoff: Dropoff is Takeoff Time - 2.5h (must arrive 2.5 hours before flight)
           const [h, m] = service.flightInfo.time.split(':').map(Number);
           const isRedEye = h >= 0 && h < 4; // flights just after midnight
           
           // Calculate 2.5 hours (150 minutes) before takeoff
           let totalMins = h * 60 + m - 150;
           let dropoffNote = '';
           if (totalMins < 0) {
             totalMins += 24 * 60;
             dropoffNote = ' (previous calendar day)';
           }
           const dropoffH = Math.floor(totalMins / 60);
           const dropoffM = totalMins % 60;
           
           desc += ` (FLIGHT TAKEOFF at ${service.flightInfo.time}${isRedEye ? ' (red-eye / just after midnight)' : ''}`;
           if (service.flightInfo.pickupLocation) {
             desc += `, Pickup Location: ${service.flightInfo.pickupLocation}`;
           }
           if (service.flightInfo.departureAirport) {
             desc += `, Departure Airport: ${service.flightInfo.departureAirport}`;
           }
           desc += `, Must arrive airport by ${dropoffH.toString().padStart(2,'0')}:${dropoffM.toString().padStart(2,'0')}${dropoffNote})`;
           
           if (isRedEye) {
             desc += ' IMPORTANT: This is a red-eye flight departing shortly after midnight. Treat this transfer as happening on the previous evening (previous calendar day) when planning the schedule.';
           }
        }
      } else if (service.serviceType === ServiceType.TRANSFER && !service.flightInfo) {
        // Transfer without flight info
        desc += ` (Pickup Time: ???)`;
      }
      
      return desc;
    };

    const daysConfigDescription = days.map(d => {
      // Support new services array format
      if (d.services && d.services.length > 0) {
        const servicesDesc = d.services.map((s: any, idx: number) => describeService(s, d.date, idx)).join('\n    ');
        return `Date: ${d.date} (${d.services.length} service(s))\n    ${servicesDesc}`;
      }
      
      // Fallback for legacy single service format
      let desc = `Date: ${d.date}, Service Type: ${d.serviceType || ServiceType.NONE}`;
      if (d.serviceType === ServiceType.TRANSFER && d.flightInfo) {
        if (d.flightInfo.type === 'LANDING') {
           const [h, m] = d.flightInfo.time.split(':').map(Number);
           const pickupH = h + 1 + Math.floor((m + 30)/60);
           const pickupM = (m + 30) % 60;
           desc += ` (FLIGHT LANDING at ${d.flightInfo.time}`;
           if (d.flightInfo.airport) {
             desc += `, Landing Airport: ${d.flightInfo.airport}`;
           }
           if (d.flightInfo.destination) {
             desc += `, Drop-off Location: ${d.flightInfo.destination}`;
           }
           desc += `, Pickup Appointment at ${pickupH}:${pickupM.toString().padStart(2,'0')})`;
        } else {
           // Takeoff: must arrive 2.5 hours before flight
           const [h, m] = d.flightInfo.time.split(':').map(Number);
           const isRedEye = h >= 0 && h < 4;
           
           // Calculate 2.5 hours (150 minutes) before takeoff
           let totalMins = h * 60 + m - 150;
           let dropoffNote = '';
           if (totalMins < 0) {
             totalMins += 24 * 60;
             dropoffNote = ' (previous calendar day)';
           }
           const dropoffH = Math.floor(totalMins / 60);
           const dropoffM = totalMins % 60;
           
           desc += ` (FLIGHT TAKEOFF at ${d.flightInfo.time}${isRedEye ? ' (red-eye / just after midnight)' : ''}`;
           if (d.flightInfo.pickupLocation) {
             desc += `, Pickup Location: ${d.flightInfo.pickupLocation}`;
           }
           if (d.flightInfo.departureAirport) {
             desc += `, Departure Airport: ${d.flightInfo.departureAirport}`;
           }
           desc += `, Must arrive airport by ${dropoffH.toString().padStart(2,'0')}:${dropoffM.toString().padStart(2,'0')}${dropoffNote})`;
        }
      }
      return desc;
    }).join('\n');

    const prompt = `
      Act as a professional private travel planner for Japan, specializing in serving Thai luxury tourists.
      Plan a trip to ${region} from ${startDate} to ${endDate}.
      
      1. MAIN CONTENT (Itinerary, Title, etc.) MUST BE IN THAI (ภาษาไทย).
      2. "quotationForOperator" FIELD MUST BE IN ENGLISH (ภาษาอังกฤษล้วน).
      3. TIMES MUST BE IN 24-HOUR FORMAT (e.g. 09:00, 14:30).

      Daily Service Requirements (STRICTLY FOLLOW THESE):
      ${daysConfigDescription}

      Definitions of Service Types:
      - "${ServiceType.TRANSFER}": Point-to-Point transfer only. 
        If Flight Landing info provided: Pickup at airport -> Hotel.
        If Flight Takeoff info provided: Hotel -> Airport.
      - "${ServiceType.CHARTER}": Full 10-hour service. Plan a full day tour with multiple stops, lunch, and sightseeing.
      - "${ServiceType.NONE}": No car service. Suggest free time, walking, or public transport near their hotel.

      IMPORTANT: A single day may have MULTIPLE services (e.g., morning Transfer + evening Transfer, or Transfer + Charter).
      When a day has multiple services, plan activities that fit each service's time window and respect the user's notes for each service.

      Logistics:
      - Passengers: ${totalPax} total (${travelerConfig.adults} Adults, ${travelerConfig.toddlers} Children 0-6 years old).
      - Luggage: ${travelerConfig.suitcasesLarge} Large, ${travelerConfig.suitcasesSmall} Small.
      ${travelerConfig.toddlers > 0 ? `- IMPORTANT: There are ${travelerConfig.toddlers} children aged 0-6. Car seats are REQUIRED for all of them. Include child-friendly stops or ensure pace is suitable for young children.` : ""}
      
      Interests: ${interests.join(", ")}.

      USER SPECIFIC REQUESTS / ROUGH PLAN (IMPORTANT):
      "${customIdeas}"
      * Please integrate these requests into the itinerary where appropriate based on the dates.

      Vehicle Rules (VERY IMPORTANT):
      - Toyota Alphard (Luxury Van):
        * Comfortably seats 5–6 guests.
        * Luggage guideline: about 3–4 suitcases (24”) OR 2–3 suitcases (28”).
        * Best for small families or groups that want extra comfort.
      - Toyota Hiace Grand Cabin (Van):
        * Comfortably seats up to 9 guests.
        * Luggage guideline: about 7–9 suitcases (24”) OR 5–7 suitcases (28”).
        * Suitable for medium-size groups with normal luggage.
      - Toyota Coaster (Micro Bus):
        * Seats about 17–18 guests.
        * Luggage guideline: around 15–17 suitcases (mixed sizes). It can feel tighter and some luggage may need to be placed along the aisle.
        * Use this mainly for larger groups where budget per person is important.

      Charter Service Time Rules (VERY IMPORTANT):
      - These rules apply only to "${ServiceType.CHARTER}" (10-hour) service days.
      - Standard contracted service is 10 hours, but you MUST design the customer's schedule so that car usage is typically about 8–9 hours total.
      - In general, start the car service around 08:00–09:00 local time. You may adjust earlier/later when it makes the itinerary more natural, but avoid wasteful very early starts.
      - Strongly prefer to have the car return to the final drop-off (usually the hotel) at least 1 hour BEFORE reaching the 10-hour limit, to allow buffer for traffic or delays.
      - The car can technically be extended up to 12 hours total (2 hours of overtime), but this should be used ONLY when really necessary (for example, very long-distance days).
      - If overtime (more than 10 hours) is used, make it clear in the Thai description for that day why overtime is needed. NEVER exceed 12 hours of car usage in a single day.

      Dinner / Evening Rules for Charter Days:
      - For charter (10-hour) service days, whenever possible, plan the **dinner** at a restaurant or area close to the guest's hotel.
      - Minimize driving time AFTER dinner. Ideally, after dinner the car should only need a short drive back to the hotel.
      - If there is an important night activity after dinner (e.g. night view, illumination), try to choose a spot that is still relatively close to the hotel, not on the opposite side of the city.

      Task:
      Generate the JSON response. 
      Crucially, generate the 'quotationForOperator' field. This is a text block for the car operator.
      It MUST be in English.
      
      Structure for 'quotationForOperator' (Use this format for each service day):
      
      [Date DD/MM/YYYY]
      Service: [Charter (10 Hours) Start: HH:MM] OR [Transfer (Pickup Only) Pickup: HH:MM]
      - If no start/pickup time was specified, use "???" instead of the time
      Pax: ${travelerConfig.adults} Adults + ${travelerConfig.toddlers} Children (0-6 yrs)${travelerConfig.toddlers > 0 ? ` - NEED ${travelerConfig.toddlers} CAR SEAT(S)` : ''}
      Luggage: [Total Luggage]
      Car: [Car Type Recommendation]
      Route: [Location A -> Location B -> Location C]

      WAITING TIME RULES (include in quotation):
      - Charter (10 Hours): Service starts from pickup time
      - Transfer (Airport Pickup/Landing): 90 min free waiting from flight landing time
      - Transfer (Other): 30 min free waiting from appointment time
      - Exceeding waiting time incurs additional charges

      Repeat this block for every day requiring a car (Transfer or Charter). Do not include days with 'None' service.
      If a day has multiple services, list each service on its own line with its time.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: itinerarySchema,
        systemInstruction: "You are an expert Japanese travel concierge for Thai customers.",
      },
    });

    const text = response.text;
    if (!text) {
      return new Response(
        JSON.stringify({ error: 'No response from AI service' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
            'Vary': 'Origin',
          },
        }
      );
    }

    const result = JSON.parse(text) as AIItineraryResponse;

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
          'Vary': 'Origin',
        },
      }
    );
  } catch (error) {
    console.error("Gemini API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate itinerary',
        message: errorMessage 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
          'Vary': 'Origin',
        },
      }
    );
  }
};

// Handle OPTIONS for CORS preflight
export const onRequestOptions = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

