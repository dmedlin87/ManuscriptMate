import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

export const ai = new GoogleGenAI({ apiKey });