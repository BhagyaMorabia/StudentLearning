import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const { subtopicName, currentMarkdown, weaknessLevel } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not configured in the environment.' },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    const prompt = `
You are an expert, highly encouraging JEE Physics and Mathematics tutor. 
Your student is struggling with the topic: "${subtopicName}".
Their current mastery level for this topic is: ${weaknessLevel}.

CURRICULUM KNOWLEDGE BASE (USE THIS EXACT MATERIAL TO TEACH):
${currentMarkdown}

YOUR TASK:
Rewrite and expand the provided curriculum material into a highly personalized, step-by-step "Lesson from Scratch".
1. Start with the extreme basics (assume they forgot foundational math if their level is Weak).
2. Use analogies to explain the concepts.
3. Break down the provided standard material into a conversational, easy-to-read format. Do not hallucinate external formulas unless necessary; stick strictly to the knowledge base provided above.
4. Include exactly ONE worked-out example based on the curriculum, explaining every single mathematical step out loud (e.g. "Now we move the square root to the other side because...").
5. Format your response beautifully in Markdown. Use bolding for emphasis. Use LaTeX $$ $$ for math equations. Do NOT use Mermaid diagrams.
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1500,
    });

    return NextResponse.json({ text: chatCompletion.choices[0]?.message?.content || "No lesson generated." });
  } catch (error: unknown) {
    console.error('AI Tutor Teach Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI lesson' },
      { status: 500 }
    );
  }
}
