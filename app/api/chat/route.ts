import { type NextRequest, NextResponse } from "next/server";

// Interface for the incoming chat request from the frontend
interface ChatRequest {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
    stream?: boolean;
    mode?: string; // e.g., "chat", "review", "fix", "optimize"
    model?: string;
}

// A simplified function to call the AI service for a chat response
async function generateChatResponse(prompt: string, systemPrompt: string): Promise<string> {
    try {
        const response = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "qwen2.5-coder:7b", 
                prompt: prompt,
                system: systemPrompt, // Qwen supports system prompts for context
                stream: false, 
                options: {
                    temperature: 0.7, // Balanced creativity and precision
                    num_ctx: 4096,    // Larger context window for analyzing code
                },
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`AI service error: ${response.statusText} - ${errorBody}`);
        }

        const data = await response.json();
        return data.response.trim();

    } catch (error) {
        console.error("AI chat generation error:", error);
        throw new Error("Failed to generate AI response.");
    }
}

function getSystemPrompt(mode: string): string {
    const basePrompt = "You are an expert senior software engineer and coding assistant. You are helpful, concise, and precise.";
    
    switch (mode) {
        case "review":
            return `${basePrompt} Your task is to perform a Code Review. Analyze the provided code for:
            1. Potential bugs or runtime errors.
            2. Security vulnerabilities.
            3. Code style and readability issues.
            4. Best practice violations.
            Provide your feedback in a structured markdown format.`;
        case "fix":
            return `${basePrompt} Your task is to Fix Code. Identify the error in the provided code/request and provide the corrected version. Explain what was wrong and how you fixed it. Prioritize correctness.`;
        case "optimize":
            return `${basePrompt} Your task is to Optimize Code. Analyze the code for time complexity and space complexity. Suggest improvements to make it faster, more memory efficient, or more readable. Provide the optimized code block.`;
        case "chat":
        default:
            return `${basePrompt} Answer the user's coding questions. If they ask for code, provide it in markdown code blocks.`;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: ChatRequest = await request.json();
        const { message, history, mode } = body;

        // 1. Validate the incoming request
        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // 2. Build the context and prompt
        // We structure the prompt to include history manually if the API is stateless per request
        const conversationHistory = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n');
        
        const fullPrompt = `
        ${conversationHistory}
        User: ${message}
        Assistant:
        `;

        const systemInstruction = getSystemPrompt(mode || "chat");

        // 3. Call the AI service to get a response
        const aiResponse = await generateChatResponse(fullPrompt, systemInstruction);

        // 4. Send the successful response back to the frontend
        return NextResponse.json({
            response: aiResponse,
            tokens: Math.round(aiResponse.length / 4), 
            model: "qwen2.5-coder:7b",
        });

    } catch (error: any) {
        console.error("Chat API error:", error);
        return NextResponse.json(
            { error: "Internal server error", message: error.message },
            { status: 500 }
        );
    }
}