// import { NextResponse } from 'next/server'; // Not used in Pages Router
import fetch from 'node-fetch'; // Import node-fetch

// TODO: Replace with actual API call to local Ollama instance (e.g., http://localhost:11434/api/tags)
const fetchOllamaModels = async () => {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) {
      console.error('Failed to fetch models from Ollama:', response.status);
      // Return an empty array or a default set of models in case of error
      // to prevent the page from crashing.
      return []; 
    }
    const data = await response.json();
    // The /api/tags response is an object with a "models" array.
    // Each model object in that array has a "name" field (e.g., "llama2:latest")
    // and other details like "modified_at", "size".
    // We can transform this to match the previous placeholder structure if needed,
    // or use it as is and adapt the frontend.
    // For now, let's adapt to a simpler structure for the dropdown.
    return data.models.map(model => ({
      id: model.name, // Use the full name like "mistral:latest" as ID
      name: model.name.split(':')[0], // Display name as the part before ':'
      details: `Model Size: ${(model.size / 1024 / 1024 / 1024).toFixed(2)} GB, Modified: ${model.modified_at}`
    }));
  } catch (error) {
    console.error('Error connecting to Ollama to fetch models:', error);
    return []; // Return empty array on network or other errors
  }
};

export default async function handler(req, res) { // Changed to default export and standard (req, res)
  if (req.method === 'GET') {
    try {
      const models = await fetchOllamaModels();
      res.status(200).json(models); // Use res.status().json()
    } catch (error) {
      console.error('Error fetching Ollama models in handler:', error);
      res.status(500).json({ error: 'Failed to fetch Ollama models' }); // Use res.status().json()
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 
