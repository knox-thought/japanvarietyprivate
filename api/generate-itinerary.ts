import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TripPreferences, AIItineraryResponse, ServiceType } from "../types";

// Vercel Serverless Function
export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not configured');
    return new Response(
      JSON.stringify({ error: 'API key not configured. Please set GEMINI_API_KEY environment variable.' }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );
  }

  try {
    const { prefs } = await req.json() as { prefs: TripPreferences };
    
    if (!prefs) {
      return new Response(
        JSON.stringify({ error: 'Missing trip preferences' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
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
    const totalPax = travelerConfig.adults + travelerConfig.children + travelerConfig.toddlers;
    const totalLuggage = travelerConfig.suitcasesLarge + travelerConfig.suitcasesSmall;
    
    const daysConfigDescription = days.map(d => {
      let desc = `Date: ${d.date}, Service Type: ${d.serviceType}`;
      if (d.serviceType === ServiceType.TRANSFER && d.flightInfo) {
        if (d.flightInfo.type === 'LANDING') {
           // Landing: Pickup is Landing Time + 1.5h
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
           // Takeoff: Dropoff is Takeoff Time - 2h
           const [h, m] = d.flightInfo.time.split(':').map(Number);
           const isRedEye = h >= 0 && h < 4; // flights just after midnight
           let dropoffH = h - 2;
           let dropoffNote = '';
           if (dropoffH < 0) {
             dropoffH += 24;
             dropoffNote = ' (previous calendar day)';
           }
           
           desc += ` (FLIGHT TAKEOFF at ${d.flightInfo.time}${isRedEye ? ' (red-eye / just after midnight)' : ''}`;
           if (d.flightInfo.pickupLocation) {
             desc += `, Pickup Location: ${d.flightInfo.pickupLocation}`;
           }
           if (d.flightInfo.departureAirport) {
             desc += `, Departure Airport: ${d.flightInfo.departureAirport}`;
           }
           desc += `, Must arrive airport by ${dropoffH.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}${dropoffNote})`;
           
           if (isRedEye) {
             desc += ' IMPORTANT: This is a red-eye flight departing shortly after midnight. Treat this transfer as happening on the previous evening (previous calendar day) when planning the schedule.';
           }
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

      Logistics:
      - Passengers: ${totalPax} (Adults: ${travelerConfig.adults}, Children: ${travelerConfig.children}, Toddlers: ${travelerConfig.toddlers}).
      - Luggage: ${travelerConfig.suitcasesLarge} Large, ${travelerConfig.suitcasesSmall} Small.
      ${travelerConfig.toddlers > 0 ? "- CRITICAL: Include child-friendly stops or ensure pace is suitable for young children (under 6)." : ""}
      
      Interests: ${interests.join(", ")}.

      USER SPECIFIC REQUESTS / ROUGH PLAN (IMPORTANT):
      "${customIdeas}"
      * Please integrate these requests into the itinerary where appropriate based on the dates.

      Vehicle Rules:
      - Alphard: Max 4-5 pax depending on luggage.
      - HiAce Grand Cabin: Max 9 pax + luggage.
      - Commuter/Coaster: Large groups.

      Task:
      Generate the JSON response. 
      Crucially, generate the 'quotationForOperator' field. This is a text block for the car operator.
      It MUST be in English.
      
      Structure for 'quotationForOperator' (Use this format for each service day):
      
      [Date DD/MM/YYYY]
      Service: [Charter (10 Hours) OR Transfer (Pickup Only)] [If Transfer: Pickup Time]
      Pax: [Total Pax], Luggage: [Total Luggage]
      Car: [Car Type Recommendation]
      Route: [Location A -> Location B -> Location C]

      Repeat this block for every day requiring a car (Transfer or Charter). Do not include days with 'None' service.
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
            'Access-Control-Allow-Origin': '*',
          } 
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
          'Access-Control-Allow-Origin': '*',
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
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );
  }
}

