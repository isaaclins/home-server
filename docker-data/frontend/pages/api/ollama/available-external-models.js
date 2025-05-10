import fetch from 'node-fetch';

const EXTERNAL_MODELS_URL = 'https://isaaclins.com/ollama-model-api/models.json';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const response = await fetch(EXTERNAL_MODELS_URL);
      if (!response.ok) {
        console.error('Failed to fetch external models:', response.status, await response.text());
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const externalModels = await response.json();
      res.status(200).json(externalModels);
    } catch (error) {
      console.error('Error fetching external models in handler:', error);
      res.status(500).json({ error: 'Failed to fetch external models' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 
