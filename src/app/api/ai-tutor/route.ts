import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

interface TutorOption {
  id: string;
  text: string;
}

export async function POST(req: Request) {
  try {
    const { questionText, options, userAnswerId, correctAnswerId, explanationMarkdown } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not configured in the environment.' },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    const prompt = `
You are an expert, empathetic JEE Physics and Mathematics tutor. 
Your student has just answered a multiple-choice question incorrectly.

CURRICULUM KNOWLEDGE (USE THIS TO GUIDE YOUR EXPLANATION):
${explanationMarkdown}

QUESTION:
${questionText}

OPTIONS:
${(options as TutorOption[]).map((o) => `${o.id}: ${o.text}`).join('\n')}

CORRECT ANSWER: ${correctAnswerId}
STUDENT'S WRONG ANSWER: ${userAnswerId}

YOUR TASK:
Analyze why the student might have chosen option ${userAnswerId}. What common misconception, calculation error, or trap did they fall into based on the JEE curriculum?
Then, gently explain the correct approach (Option ${correctAnswerId}) in a highly encouraging tone, breaking down the logic simply using the provided curriculum knowledge.
Do NOT just repeat the standard explanation verbatim. Talk directly to the student ("You probably thought... but actually...").
Keep your response under 150 words and format it nicely in Markdown.
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 512,
    });

    return NextResponse.json({ text: chatCompletion.choices[0]?.message?.content || "No response generated." });
  } catch (error: unknown) {
    console.error('AI Tutor Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI response' },
      { status: 500 }
    );
  }
}
