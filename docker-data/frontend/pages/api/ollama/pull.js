import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { name } = req.body; // Model name to pull, e.g., "mistral:latest"

      if (!name) {
        res.status(400).json({ error: 'Model name is required' });
        return;
      }

      const ollamaResponse = await fetch('http://localhost:11434/api/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          stream: true, // Ollama pull API streams progress
        }),
      });

      if (!ollamaResponse.ok) {
        const errorBody = await ollamaResponse.text();
        console.error('Ollama Pull API error:', ollamaResponse.status, errorBody);
        res.status(ollamaResponse.status).json({ error: `Ollama Pull API Error: ${errorBody}` });
        return;
      }

      // Stream the response from Ollama back to the client
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Transfer-Encoding', 'chunked');
      ollamaResponse.body.pipe(res);

    } catch (error) {
      console.error('Error in Ollama pull API proxy:', error);
      res.status(500).json({ error: 'Failed to pull Ollama model' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 
