import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthContext } from '@/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';

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
  const [localOllamaModels, setLocalOllamaModels] = useState([]);
  const [externalModelsForPulling, setExternalModelsForPulling] = useState([]);
  const [isAddModelDialogOpen, setIsAddModelDialogOpen] = useState(false);
  const [dialogModelTagSelections, setDialogModelTagSelections] = useState({});
  const [clearChatOnModelChange, setClearChatOnModelChange] = useState(false);
  const [modelToPull, setModelToPull] = useState('');
  const [isPullingModel, setIsPullingModel] = useState(false);

  const managedModels = useMemo(() => {
    let availableModels = [];
    if (isAdmin || (user && user.roles && user.roles.includes('_ollama_user'))) {
      availableModels = [...localOllamaModels];
    } else {
      availableModels = [];
    }

    if (selectedModel && !availableModels.some(m => m.id === selectedModel)) {
        if (availableModels.length > 0) {
            setTimeout(() => setSelectedModel(availableModels.length > 0 ? availableModels[0].id : ''), 0);
        } else {
            setTimeout(() => setSelectedModel(''), 0);
        }
    }
    return availableModels;
  }, [localOllamaModels, isAdmin, user, selectedModel]);

  const previousSelectedModelRef = useRef();
  useEffect(() => {
    if (previousSelectedModelRef.current && previousSelectedModelRef.current !== selectedModel) {
      const currentModelDetails = managedModels.find(m => m.id === selectedModel);
      toast.info(`Switched to model: ${currentModelDetails?.name || selectedModel}`);
      if (clearChatOnModelChange) {
        setChatHistory([]);
        toast.info("Chat history cleared.");
      }
    }
    previousSelectedModelRef.current = selectedModel;
  }, [selectedModel, clearChatOnModelChange, managedModels]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    // TODO: Add check for _ollama_user role once user object structure is known
    // if (!loading && user && !user.roles.includes('_ollama_user') && !isAdmin) {
    //   router.push('/unauthorized'); // Or some other appropriate page
    //   return;
    // }

    const getAllModelsData = async () => {
      try {
        const localResponse = await fetch('/api/ollama/models');
        if (!localResponse.ok) {
          throw new Error(`HTTP error fetching local models: ${localResponse.status}`);
        }
        const localData = await localResponse.json();
        setLocalOllamaModels(localData);

        if (!selectedModel && localData.length > 0) {
            // Defer this to the managedModels effect or a separate effect watching localOllamaModels
            // to ensure managedModels has been calculated based on roles.
            // setSelectedModel(localData[0].id); // Simplified for now, will be refined by managedModels effect
        }

        if (localData.length === 0 && isAdmin) {
          try {
            const externalResponse = await fetch('/api/ollama/available-external-models.js');
            if (!externalResponse.ok) {
              toast.error("Could not fetch external model list. Please enter model names manually to pull (e.g., 'gemma:latest').");
              setExternalModelsForPulling([]);
              throw new Error(`HTTP error fetching external models: ${externalResponse.status}`);
            }
            const externalData = await externalResponse.json();
            setExternalModelsForPulling(externalData.map(model => ({
              name: model.name,
              description: model.description,
              tags: model.tags || [],
              extras: model.extras || [],
              id: model.name 
            })));
          } catch (error) {
            console.error("Failed to fetch or process external models for pulling:", error);
            setExternalModelsForPulling([]);
          }
        } else if (!isAdmin) {
           setExternalModelsForPulling([]);
        }

      } catch (error) {
        console.error("Failed to fetch local models:", error);
        setLocalOllamaModels([]);
        if (isAdmin) setExternalModelsForPulling([]); 
      }
    };

    if (!loading && user) {
        getAllModelsData();
    }

  }, [user, loading, router, isAdmin]);

  useEffect(() => {
    if (!selectedModel && managedModels.length > 0) {
      setSelectedModel(managedModels[0].id);
    } else if (selectedModel && managedModels.length === 0) {
      setSelectedModel('');
    }
  }, [managedModels, selectedModel]);

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedModel) return;

    const newUserMessage = { role: 'user', content: message };
    setChatHistory(prev => [...prev, { sender: 'user', text: message }]);
    setMessage('');

    const apiMessages = chatHistory.map(chat => ({
      role: chat.sender === 'user' ? 'user' : 'assistant', 
      content: chat.text
    }));
    apiMessages.push(newUserMessage);

    try {
      const response = await fetch('/api/ollama/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: apiMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      if (response.body) {
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let accumulatedResponse = '';
        let firstChunk = true;

        setChatHistory(prev => [...prev, { sender: 'bot', text: '' }]);

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const lines = value.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            try {
              const parsedChunk = JSON.parse(line);
              if (parsedChunk.message && parsedChunk.message.content) {
                accumulatedResponse += parsedChunk.message.content;
                setChatHistory(prev => {
                  const newHistory = [...prev];
                  newHistory[newHistory.length - 1] = { sender: 'bot', text: accumulatedResponse };
                  return newHistory;
                });
              }
              if (parsedChunk.done) {
                console.log("Streaming complete:", parsedChunk);
                return;
              }
            } catch (e) {
              console.error("Error parsing stream chunk:", line, e);
            }
          }
        }
      } else {
        const data = await response.json();
        setChatHistory(prev => [...prev, { sender: 'bot', text: data.message?.content || "No response content" }]);
      }

    } catch (error) {
      console.error('Failed to send message or process stream:', error);
      setChatHistory(prev => [...prev, { sender: 'bot', text: 'Error: Could not connect to the model.' }]);
    }
  };

  const handlePullModel = async (modelNameToPull) => {
    const finalModelName = typeof modelNameToPull === 'string' ? modelNameToPull : modelToPull;
    if (!finalModelName.trim()) {
      toast.error("Please enter a model name to pull (e.g., mistral:latest).");
      return;
    }
    setIsPullingModel(true);
    toast.info(`Starting to pull model: ${finalModelName}... This may take a while.`);

    try {
      const response = await fetch('/api/ollama/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: finalModelName }),
      });

      if (response.body) {
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let lastStatus = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const lines = value.split('\n').filter(line => line.trim() !== '');
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.status && parsed.status !== lastStatus) {
                console.log(`Pull progress for ${finalModelName}: ${parsed.status}`);
                lastStatus = parsed.status;
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) { /* ignore lines that are not json or don't have status */ }
          }
        }
      }

      if (!response.ok) {
        let errorMsg = `Failed to pull model. Status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
        } catch (e) { /* ignore if error response is not json */ }
        throw new Error(errorMsg);
      }
      
      toast.success(`Model ${finalModelName} pulled successfully! Refreshing local models...`);
      setModelToPull('');
      const localModelsResponse = await fetch('/api/ollama/models');
      const localModelsData = await localModelsResponse.json();
      setLocalOllamaModels(localModelsData);

    } catch (error) {
      console.error("Failed to pull model:", error);
      toast.error(`Error pulling model ${finalModelName}: ${error.message}`);
    } finally {
      setIsPullingModel(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Ollama Chat</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16)-theme(spacing.1)-1px)]">
      <div className="flex-grow overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row gap-4 p-4">
          {/* Left Panel: Model Selection and Management */}
          <Card className="w-full lg:w-1/4 lg:max-w-xs flex flex-col">
            <CardHeader>
              <CardTitle>Ollama Chat</CardTitle>
              <CardDescription>Select a model and start chatting.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="model-select">Active Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger id="model-select">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {managedModels.length > 0 ? (
                      managedModels.map(model => (
                        <SelectItem key={model.id} value={model.id}>{model.name} ({model.details?.family || 'N/A'})</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No models available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="clear-chat-toggle" checked={clearChatOnModelChange} onCheckedChange={setClearChatOnModelChange} />
                <label htmlFor="clear-chat-toggle" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Clear chat on model change
                </label>
              </div>
              {isAdmin && (
                <Dialog open={isAddModelDialogOpen} onOpenChange={setIsAddModelDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Manage Models</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Manage Ollama Models</DialogTitle>
                      <DialogDescription>
                        Pull new models from Ollama library or delete existing local models.
                      </DialogDescription>
                    </DialogHeader>
                    {/* Content for model management */}
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="model-to-pull" className="text-right whitespace-nowrap">
                                Pull Model
                            </Label>
                            <Input 
                                id="model-to-pull"
                                value={modelToPull} 
                                onChange={(e) => setModelToPull(e.target.value)}
                                placeholder="e.g., llama3:latest" 
                                className="col-span-2"
                            />
                            <Button onClick={() => handlePullModel(modelToPull)} disabled={isPullingModel || !modelToPull.trim()}>
                                {isPullingModel ? 'Pulling...' : 'Pull'}
                            </Button>
                        </div>
                        <div className="text-xs text-muted-foreground col-span-4">
                            Browse available models and tags on <a href="https://ollama.com/library" target="_blank" rel="noopener noreferrer" className="underline">ollama.com/library</a>.
                        </div>
                       
                        <h4 className="font-semibold pt-2">Available Local Models:</h4>
                        {localOllamaModels.length > 0 ? (
                            <ScrollArea className="h-40 border rounded-md p-2">
                                {localOllamaModels.map(model => (
                                    <div key={model.id} className="flex justify-between items-center p-1.5 hover:bg-muted rounded-sm">
                                        <span className="text-sm">{model.name}</span>
                                        <Button 
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeleteModel(model.id)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                ))}
                            </ScrollArea>
                        ) : (
                            <p className="text-sm text-muted-foreground">No local models found.</p>
                        )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddModelDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
            <CardFooter className="mt-auto">
              <p className="text-xs text-muted-foreground">
                Ensure Ollama service is running.
              </p>
            </CardFooter>
          </Card>

          {/* Right Panel: Chat Interface */}
          <Card className="w-full lg:w-3/4 flex flex-col h-full">
            <CardHeader>
              <CardTitle>Chat with {selectedModel ? managedModels.find(m=>m.id === selectedModel)?.name : 'N/A'}</CardTitle>
              <CardDescription>Type your message below and press Enter or click Send.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden flex flex-col">
              <ScrollArea className="flex-grow border rounded-lg p-4 bg-muted">
                {chatHistory.length === 0 && <p className="text-muted-foreground text-center">No messages yet.</p>}
                {chatHistory.map((chat, index) => (
                  <div key={index} className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
                    <span className={`inline-block p-2 rounded-lg max-w-[70%] ${chat.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {chat.text}
                    </span>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
            <CardFooter className="mt-auto">
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex w-full items-start space-x-2">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Chat with ${selectedModel || 'selected model'}... (Shift+Enter for new line)`}
                  className="flex-1 resize-none min-h-[52px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button type="submit" disabled={!message.trim() || !selectedModel} className="h-[52px]">
                  Send
                </Button>
              </form>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}


