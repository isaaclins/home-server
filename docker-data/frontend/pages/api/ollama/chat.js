// import { NextResponse } from 'next/server'; // Not used in Pages Router

// TODO: Replace with actual API call to local Ollama instance (e.g., http://localhost:11434/api/chat)
// and implement proper streaming.

import fetch from 'node-fetch'; // Import node-fetch

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { model, messages, stream } = req.body;

      if (!model || !messages) {
        res.status(400).json({ error: 'Model and messages are required' });
        return;
      }

      const ollamaResponse = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          stream: stream !== undefined ? stream : false, // Ensure stream is explicitly false if not provided
        }),
      });

      if (!ollamaResponse.ok) {
        const errorBody = await ollamaResponse.text();
        console.error('Ollama API error:', ollamaResponse.status, errorBody);
        res.status(ollamaResponse.status).json({ error: `Ollama API Error: ${errorBody}` });
        return;
      }

      if (stream !== undefined ? stream : false) {
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Transfer-Encoding', 'chunked');
        ollamaResponse.body.pipe(res);
      } else {
        const responseData = await ollamaResponse.json();
        res.status(200).json(responseData);
      }

    } catch (error) {
      console.error('Error in Ollama chat API proxy:', error);
      res.status(500).json({ error: 'Failed to process chat message' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 
