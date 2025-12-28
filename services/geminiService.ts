
import { GoogleGenAI } from "@google/genai";
import { Sale } from "../types";

// Helper for generating email drafts using Gemini API
export const generateEmailDraft = async (sale: Sale, type: 'follow_up' | 'payment_reminder' | 'delivery'): Promise<string> => {
  // Always use {apiKey: process.env.API_KEY} as required by guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const total = sale.price * sale.items.length;
  const paidItems = sale.items.filter(i => i.isPaid);
  const unpaidItems = sale.items.filter(i => !i.isPaid);
  
  const itemsDescription = sale.items.map(i => `${i.name} (${i.isPaid ? 'Paid' : 'Unpaid'})`).join(", ");
  const paidAmount = paidItems.length * sale.price;
  const dueAmount = unpaidItems.length * sale.price;

  const prompt = `
    Act as a professional sales manager for a digital agency.
    Write a short, polite, and effective ${type.replace('_', ' ')} email for the following client.
    
    Client Name: ${sale.clientName}
    Service: ${sale.serviceType}
    Status: ${sale.status}
    Items Breakdown: ${itemsDescription}
    Total Contract Value: ${total} MAD
    Amount Paid: ${paidAmount} MAD
    Amount Due: ${dueAmount} MAD
    
    Keep it under 150 words. Do not include placeholders like "[Your Name]", just sign off with "Nexus Agency Team".
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Failed to generate content.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error contacting AI service.";
  }
};

// Helper for analyzing sales data using Gemini API
export const analyzeSalesData = async (sales: Sale[], query: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const context = sales.map(s => {
    const paidCount = s.items.filter(i => i.isPaid).length;
    return {
      client: s.clientName,
      service: s.serviceType,
      status: s.status,
      items: s.items.map(i => i.name),
      totalValue: `${s.price * s.items.length} MAD`,
      paidAmount: `${s.price * paidCount} MAD`,
      isFullyPaid: paidCount === s.items.length,
      leadDate: s.leadDate
    };
  });

  const prompt = `
    You are a helpful data analyst for a digital agency.
    Here is the current sales data (JSON format):
    ${JSON.stringify(context)}

    User Query: "${query}"

    Provide a concise answer based on the data provided. If the data is insufficient, say so.
    Do not output markdown code blocks, just plain text with simple formatting.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "No insights available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error analyzing data.";
  }
};

// Helper for generating creative scripts for tasks
export const generateCreativeScript = async (clientName: string, serviceType: string, taskName: string, lang: 'en' | 'ar'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Act as a creative director. Write a compelling script or detailed shot list for a digital marketing task.
    
    Client: ${clientName}
    Service Type: ${serviceType}
    Specific Task: ${taskName}
    Target Language: ${lang === 'ar' ? 'Arabic (Moroccan Dialect preferred if applicable)' : 'English'}

    If it's a "Script Writing" task, provide a video script with Scene/Visual/Audio columns format (as text).
    If it's a "UGC Photo" task, provide a creative brief for the model (outfit, pose, setting).
    If it's "Voice Over", provide the script to be read.

    Keep it professional but creative.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Failed to generate script.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating script.";
  }
};