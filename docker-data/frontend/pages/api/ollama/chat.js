import { NextResponse } from 'next/server';

// TODO: Replace with actual API call to local Ollama instance (e.g., http://localhost:11434/api/chat)
// and implement proper streaming.

export async function POST(request) {
  try {
    const { model, messages, stream } = await request.json(); // Assuming messages is an array of previous chat messages

    if (!model || !messages) {
      return NextResponse.json({ error: 'Model and messages are required' }, { status: 400 });
    }

    // Simulate a streaming response
    if (stream) {
      const readableStream = new ReadableStream({
        async start(controller) {
          const lastUserMessage = messages[messages.length - 1]?.content || "No message provided";
          const botResponse = `Echo for model ${model}: ${lastUserMessage}`;
          const chunks = botResponse.split(' '); // Split into words to simulate chunks

          for (const chunk of chunks) {
            // Each chunk should be a JSON object with a "message" (or "response" for some Ollama versions) and a "done" field.
            // For Ollama, the response format for a stream is typically a series of JSON objects like:
            // { "model": "model_name", "created_at": "timestamp", "message": { "role": "assistant", "content": "response chunk" }, "done": false }
            // When done: { "model": "model_name", "created_at": "timestamp", "done": true, ...other final stats... }
            const payload = {
              model: model,
              created_at: new Date().toISOString(),
              message: {
                role: "assistant",
                content: chunk + ' ',
              },
              done: false,
            };
            controller.enqueue(new TextEncoder().encode(JSON.stringify(payload) + '\n'));
            await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
          }
          // Send final done message
          const finalPayload = {
            model: model,
            created_at: new Date().toISOString(),
            done: true,
            // Include other final stats if available from Ollama, e.g., total_duration, load_duration etc.
          };
          controller.enqueue(new TextEncoder().encode(JSON.stringify(finalPayload) + '\n'));
          controller.close();
        },
      });
      return new Response(readableStream, {
        headers: { 'Content-Type': 'application/x-ndjson', 'Transfer-Encoding': 'chunked' },
      });
    } else {
      // Simulate a non-streaming (full) response
      const lastUserMessage = messages[messages.length - 1]?.content || "No message provided";
      const botResponse = `Full echo for model ${model}: ${lastUserMessage}`;
      return NextResponse.json({
        model: model,
        created_at: new Date().toISOString(),
        message: {
          role: "assistant",
          content: botResponse,
        },
        done: true,
      });
    }

  } catch (error) {
    console.error('Error in Ollama chat API:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
} 
