import { NextResponse } from 'next/server';

// TODO: Replace with actual API call to local Ollama instance (e.g., http://localhost:11434/api/tags)
const fetchOllamaModels = async () => {
  // Placeholder data
  return [
    { id: 'llama2', name: 'Llama 2', details: 'A 7B parameter language model.' },
    { id: 'mistral', name: 'Mistral', details: 'A 7B parameter language model, good for general tasks.' },
    { id: 'codellama', name: 'Code Llama', details: 'A model specialized for code generation and understanding.' },
    { id: 'llava', name: 'LLaVA', details: 'A multimodal model that can understand images.' },
  ];
};

export async function GET(request) {
  try {
    const models = await fetchOllamaModels();
    return NextResponse.json(models);
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    return NextResponse.json({ error: 'Failed to fetch Ollama models' }, { status: 500 });
  }
} 
