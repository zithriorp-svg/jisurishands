import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Grab the API key from your Vercel environment
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    // Force a direct connection to Google's servers to request the Master List
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();

    // Filter the list to only show models that support text generation (chat)
    const generateContentModels = data.models
      ?.filter((model: any) => model.supportedGenerationMethods?.includes("generateContent"))
      .map((model: any) => ({
        name: model.name.replace('models/', ''), // Clean up the name for easy copying
        displayName: model.displayName,
        version: model.version,
        description: model.description
      }));

    return NextResponse.json({ 
      status: "Matrix Diagnostic Complete", 
      totalModelsFound: generateContentModels?.length || 0,
      compatibleModels: generateContentModels || data 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

