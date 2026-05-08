import { NextRequest, NextResponse } from "next/server";
import { MemWal } from "@mysten-incubation/memwal";

const memwal = MemWal.create({
  key: process.env.MEMWAL_DELEGATE_KEY!,
  accountId: process.env.MEMWAL_ACCOUNT_ID!,
  serverUrl: process.env.MEMWAL_SERVER_URL!,
  namespace: process.env.MEMWAL_NAMESPACE!,
});

export async function POST(req: NextRequest) {
  try {
    const { action, text, query } = await req.json();

    if (action === "remember") {
      try {
        const job = await memwal.remember(text);
        const completed = await memwal.waitForRememberJob(job.job_id);
        return NextResponse.json({ 
          success: true, 
          job_id: job.job_id,
          blob_id: completed?.blob_id || completed?.blobId || null
        });
      } catch (e) {
        return NextResponse.json({ success: false, error: String(e) });
      }
    }

    if (action === "list") {
      try {
        const result = await memwal.recall("*");
        const memories = result.results || [];
        return NextResponse.json({ memories });
      } catch (e) {
        try {
          const result = await memwal.recall("memory");
          const memories = result.results || [];
          return NextResponse.json({ memories });
        } catch (e2) {
          return NextResponse.json({ memories: [] });
        }
      }
    }

    if (action === "recall") {
      try {
        const result = await memwal.recall(query);
        const memories = result.results || [];
        return NextResponse.json({ memories });
      } catch (e) {
        return NextResponse.json({ memories: [] });
      }
    }

    if (action === "ask") {
      try {
        const result = await memwal.recall(query);
        const memories = result.results || [];

        if (memories.length === 0) {
          return NextResponse.json({ answer: "No relevant memories found." });
        }

        const context = memories
          .slice(0, 5)
          .map((m: any) => m.text)
          .join("\n");

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: `Answer using only these memories:\n\n${context}` },
              { role: "user", content: query }
            ]
          })
        });

        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content || "No answer found.";
        return NextResponse.json({ answer });

      } catch (e) {
        return NextResponse.json({ answer: "Error: " + String(e) });
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}