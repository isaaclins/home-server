import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthContext } from '@/context/AuthContext';

// This page will let you chat with Ollama models
// It will be a simple chat interface with a text input and a send button
// It will also have a list of models that you can select from
// The models will be fetched from the LOCAL Ollama API
// The chat will be streamed to the user
// The user will be able to see THEIR chat history
// THEIR chat history will be saved in the database
// The history will be no more than 20 messages
// The user will be able to select the model they want to chat with
// It will be able to send images to the model IF the model supports it
// The user will be able to see the image in the chat

// IF the user is not logged in or has not the right role (_ollama_user), they will be redirected to the login page
// IF the user is admin, they will be able to pull models from the Ollama API using the UI.
// IF The user is admin, they will be able to delete models from the UI.
// IF the user is _ollama_user, they will be able to chat with the models.


export default function OllamaChatPage() {
  const router = useRouter();
  const { user, isAdmin, loading, logout } = useAuthContext();
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    // TODO: Add check for _ollama_user role once user object structure is known
    // if (!loading && user && !user.roles.includes('_ollama_user') && !isAdmin) {
    //   router.push('/unauthorized'); // Or some other appropriate page
    // }

    // Fetch models from local Ollama API
    const getModels = async () => {
      try {
        const response = await fetch('/api/ollama/models');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setModels(data);
        if (data.length > 0) {
          setSelectedModel(data[0].id); // Set default model to the first in the list
        }
      } catch (error) {
        console.error("Failed to fetch models:", error);
        // Optionally, set some error state here to display to the user
        setModels([]); // Clear models or set to an empty array on error
      }
    };

    getModels();
  }, [user, loading, router, isAdmin]);

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedModel) return;

    const newUserMessage = { role: 'user', content: message };
    // Add user message to chat history immediately for responsiveness
    setChatHistory(prev => [...prev, { sender: 'user', text: message }]);
    setMessage(''); // Clear input field

    // Prepare the messages array to send to the API (Ollama expects a specific format)
    // It should include previous messages for context, if any.
    const apiMessages = chatHistory.map(chat => ({
      role: chat.sender === 'user' ? 'user' : 'assistant', 
      content: chat.text
    }));
    apiMessages.push(newUserMessage); // Add the new user message

    try {
      const response = await fetch('/api/ollama/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: apiMessages, // Send the history for context
          stream: true, // Request a streaming response
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      if (response.body) {
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let accumulatedResponse = '';
        let firstChunk = true;

        // Add a placeholder for the bot's response
        // This will be updated as chunks stream in
        setChatHistory(prev => [...prev, { sender: 'bot', text: '' }]);

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          // Each `value` can contain multiple JSON objects separated by newlines
          const lines = value.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            try {
              const parsedChunk = JSON.parse(line);
              if (parsedChunk.message && parsedChunk.message.content) {
                accumulatedResponse += parsedChunk.message.content;
                // Update the last message in chatHistory (the bot's response)
                setChatHistory(prev => {
                  const newHistory = [...prev];
                  newHistory[newHistory.length - 1] = { sender: 'bot', text: accumulatedResponse };
                  return newHistory;
                });
              }
              if (parsedChunk.done) {
                // Streaming is complete
                // You can handle finalization here if needed, e.g., logging total duration
                console.log("Streaming complete:", parsedChunk);
                return; // Exit the loop
              }
            } catch (e) {
              console.error("Error parsing stream chunk:", line, e);
            }
          }
        }
      } else {
        // Fallback for non-streaming or if body is null (should not happen with stream: true)
        const data = await response.json();
        setChatHistory(prev => [...prev, { sender: 'bot', text: data.message?.content || "No response content" }]);
      }

    } catch (error) {
      console.error('Failed to send message or process stream:', error);
      setChatHistory(prev => [...prev, { sender: 'bot', text: 'Error: Could not connect to the model.' }]);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Ollama Chat</CardTitle>
          <CardDescription>Chat with available Ollama models.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="model-select" className="text-sm font-medium">Select Model:</label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger id="model-select" className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg p-4 h-96 overflow-y-auto bg-white">
            {chatHistory.map((chat, index) => (
              <div key={index} className={`mb-2 text-sm ${chat.sender === 'user' ? 'text-right' : 'text-left'}`}>
                <span className={`inline-block p-2 rounded-lg ${chat.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                  {chat.text}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Textarea
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-grow"
            />
            <Button onClick={handleSendMessage}>Send</Button>
          </div>
        </CardContent>
        {isAdmin && (
          <CardFooter className="flex flex-col space-y-2 pt-4 border-t">
            <h3 className="text-lg font-semibold">Admin Controls</h3>
            <Button variant="outline" size="sm">Pull New Model</Button>
            <Button variant="destructive" size="sm">Delete Selected Model</Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}


