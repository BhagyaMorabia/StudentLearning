import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const { subtopicName, markdownContent, weaknessLevel, messages } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not configured in the environment.' },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `
You are an expert, highly encouraging JEE Physics and Mathematics tutor.
You are currently teaching a student about: "${subtopicName}".
Their mastery level on this topic is: ${weaknessLevel}.

CURRICULUM KNOWLEDGE BASE:
${markdownContent}

YOUR TEACHING STRATEGY:
1. You MUST break down the curriculum into numbered micro-parts, starting from absolute basics. Do NOT teach everything at once.
2. In each response, teach only the next small part. Keep it short enough for a student to digest before continuing.
3. At the end of every response, stop and ask one quick check question or ask the user to type "yes" if they understand and are ready for the next part.
4. If the user says "yes", continue from the exact point where you stopped and teach the next logical micro-part.
5. If the user asks a question, answer it patiently using analogies, then continue from the same point in the curriculum flow.
6. Format your output beautifully using Markdown. Use bold text, bullet points, and LaTeX ($$). Do not output massive walls of text.
`;

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages: chatMessages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      max_tokens: 1024,
    });

    return NextResponse.json({ text: chatCompletion.choices[0]?.message?.content || "No response generated." });
  } catch (error: unknown) {
    console.error('AI Tutor Interactive Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI response' },
      { status: 500 }
    );
  }
}
