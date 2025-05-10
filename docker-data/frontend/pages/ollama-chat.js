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

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Ollama Chat</CardTitle>
          <CardDescription>Chat with available Ollama models.</CardDescription>
          {isAdmin && externalModelsForPulling.length > 0 && (
            <Dialog open={isAddModelDialogOpen} onOpenChange={(isOpen) => {
              setIsAddModelDialogOpen(isOpen);
              if (!isOpen) setDialogModelTagSelections({});
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="mt-2">Pull Models from Registry</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] md:max-w-[700px] lg:max-w-[900px]">
                <DialogHeader>
                  <DialogTitle>Pull Models from Registry</DialogTitle>
                  <DialogDescription>
                    Select a model and a specific tag (if available) to pull to your local Ollama instance.
                    Pulling a model will download it to your server.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[50vh] w-full rounded-md border p-4">
                  <div className="space-y-3">
                    {externalModelsForPulling.map((model) => {
                      const modelIdentifier = model.name;
                      const currentSelectedTag = dialogModelTagSelections[modelIdentifier] || (model.tags.length > 0 ? model.tags[0] : null);

                      return (
                        <div key={model.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 border rounded-md">
                          <div className="flex-grow">
                            <p className="text-sm font-semibold text-foreground">{model.name}</p>
                            {model.description && <p className="text-xs text-muted-foreground mt-1 pr-2">{model.description}</p>}
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {model.tags && model.tags.length > 0 && (
                              <Select 
                                value={currentSelectedTag}
                                onValueChange={(tag) => {
                                  setDialogModelTagSelections(prev => ({ ...prev, [modelIdentifier]: tag }));
                                }}
                              >
                                <SelectTrigger className="w-[150px] h-9 text-xs">
                                  <SelectValue placeholder="Select tag" />
                                </SelectTrigger>
                                <SelectContent>
                                  {model.tags.map(tag => (
                                    <SelectItem key={tag} value={tag} className="text-xs">
                                      {tag} (Pull as {model.name}:{tag})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const modelToPullWithTag = currentSelectedTag 
                                  ? `${model.name}:${currentSelectedTag}` 
                                  : model.name;
                                handlePullModel(modelToPullWithTag);
                                setIsAddModelDialogOpen(false);
                              }}
                              disabled={isPullingModel}
                            >
                              Pull
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsAddModelDialogOpen(false)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <div className="flex items-center space-x-2 mt-2">
            <Checkbox
              id="clear-chat-toggle"
              checked={clearChatOnModelChange}
              onCheckedChange={setClearChatOnModelChange}
            />
            <Label htmlFor="clear-chat-toggle" className="text-sm font-medium">
              Clear chat history on model change
            </Label>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="model-select" className="text-sm font-medium">Select Model:</label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger id="model-select" className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {managedModels.length > 0 ? (
                  managedModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-models" disabled>No models available</SelectItem>
                )}
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
          <CardFooter className="flex flex-col space-y-4 pt-4 border-t items-start">
            <h3 className="text-lg font-semibold">Admin Controls</h3>
            
            <div className="space-y-2 w-full">
              <Label htmlFor="pull-model-input" className="text-sm font-medium">Pull New Model to Local Ollama</Label>
              <div className="flex gap-2">
                <Input 
                  id="pull-model-input"
                  type="text"
                  value={modelToPull}
                  onChange={(e) => setModelToPull(e.target.value)}
                  placeholder="e.g., llama2:latest or mistral"
                  className="flex-grow"
                  disabled={isPullingModel}
                />
                <Button onClick={() => handlePullModel(modelToPull)} disabled={isPullingModel || !modelToPull.trim()}>
                  {isPullingModel ? "Pulling..." : "Pull Model"}
                </Button>
              </div>
            </div>

            <Button variant="destructive" size="sm" disabled={isPullingModel}>
              Delete Selected Model (Local Ollama)
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}


