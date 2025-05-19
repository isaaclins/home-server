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
  const [activePulls, setActivePulls] = useState({});
  const [selectedModelForTagSelection, setSelectedModelForTagSelection] = useState(null);
  const [chosenTag, setChosenTag] = useState('');

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
            const externalResponse = await fetch('https://isaaclins.com/ollama-model-api/models.json');
            
            if (externalResponse.status === 200) {
              const externalData = await externalResponse.json();
              setExternalModelsForPulling(externalData.map(model => ({
                name: model.name,
                description: model.description,
                tags: model.tags || [],
                extras: model.extras || [],
                id: model.name // Assuming 'id' should be the model name for consistency
              })));
            } else if (externalResponse.status === 304) {
              // Not modified, client should use cache. The externalModelsForPulling list remains as it is.
              toast.info('External model list is up to date (loaded from cache).');
              console.log('External model list not modified (304). Current list (if any) retained and will be displayed.');
            } else {
              // Any other non-200, non-304 status is an error here
              toast.error("Could not fetch external model list from registry. Please enter model names manually to pull.");
              setExternalModelsForPulling([]);
            }
          } catch (error) {
            console.error("Failed to fetch or process external models for pulling:", error);
            // This catch handles network errors for the fetch itself, or JSON parsing errors for a 200 response
            toast.error("Error fetching or processing external model list. Please try manual pull.");
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

    const userMessageText = message;
    setChatHistory(prev => [...prev, { id: crypto.randomUUID(), sender: 'user', text: userMessageText }]);
    setMessage('');

    const apiMessages = chatHistory
      .filter(chat => chat.sender === 'user' || (chat.sender === 'bot' && chat.text)) // Use previous bot messages that have content
      .map(chat => ({
        role: chat.sender === 'user' ? 'user' : 'assistant', 
        content: chat.text
      }));
    apiMessages.push({ role: 'user', content: userMessageText });

    const botMessageId = crypto.randomUUID();
    const currentModelObject = managedModels.find(m => m.id === selectedModel);
    const botModelName = currentModelObject?.name || selectedModel; // Fallback to ID if name not found
    const rawStartTime = Date.now();

    setChatHistory(prev => [...prev, {
      id: botMessageId,
      sender: 'bot',
      modelName: botModelName,
      text: '', // Initially empty
      isLoading: true,
      durationMs: null,
      isThoughtCollapsed: true,
      rawStartTime
    }]);

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

        // The initial bot message placeholder is already added above with isLoading: true.
        // We will update it as chunks arrive.

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const lines = value.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            try {
              const parsedChunk = JSON.parse(line);
              if (parsedChunk.message && parsedChunk.message.content) {
                accumulatedResponse += parsedChunk.message.content;
                setChatHistory(prev => prev.map(msg =>
                  msg.id === botMessageId ? { ...msg, text: accumulatedResponse } : msg
                ));
              }
              if (parsedChunk.done) {
                console.log("Streaming complete:", parsedChunk);
                // Final update for this message
                const rawEndTime = Date.now();
                setChatHistory(prev => prev.map(msg =>
                  msg.id === botMessageId
                    ? { ...msg, isLoading: false, durationMs: rawEndTime - msg.rawStartTime }
                    : msg
                ));
                return;
              }
            } catch (e) {
              console.error("Error parsing stream chunk:", line, e);
            }
          }
        }
      } else {
        // Non-streamed response (should ideally not happen if stream: true is respected)
        const data = await response.json();
        const rawEndTime = Date.now();
        setChatHistory(prev => prev.map(msg =>
          msg.id === botMessageId
            ? { ...msg, text: data.message?.content || "No response content", isLoading: false, durationMs: rawEndTime - msg.rawStartTime }
            : msg
        ));
      }

    } catch (error) {
      console.error('Failed to send message or process stream:', error);
      const rawEndTime = Date.now();
      setChatHistory(prev => prev.map(msg =>
        msg.id === botMessageId
          ? { ...msg, text: 'Error: Could not connect to the model.', isLoading: false, durationMs: rawEndTime - msg.rawStartTime }
          : msg
      ));
    }
  };

  const handlePullModel = async (modelNameToPull) => {
    const finalModelName = typeof modelNameToPull === 'string' ? modelNameToPull.trim() : '';
    if (!finalModelName) {
      toast.error("Please enter a model name to pull (e.g., mistral:latest).");
      return;
    }

    if (activePulls[finalModelName] && !activePulls[finalModelName].isComplete && !activePulls[finalModelName].error) {
      toast.info(`Model ${finalModelName} is already being pulled.`);
      return;
    }

    const newAbortController = new AbortController(); // Create controller upfront

    setActivePulls(prev => ({
      ...prev,
      [finalModelName]: {
        modelName: finalModelName,
        statusMessage: `Initializing pull for ${finalModelName}...`,
        percentage: 0,
        downloadRateBps: null,
        currentDigest: null,
        rateCalcLastTimestamp: null,
        rateCalcLastCompletedBytes: null,
        error: null,
        isComplete: false,
        abortController: newAbortController, // Store the pre-created controller
        isCancelling: false, // New flag for cancellation UI state
      }
    }));

    toast.info(`Starting to pull model: ${finalModelName}... This may take a while.`);

    try {
      const response = await fetch('/api/ollama/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: finalModelName }),
        signal: newAbortController.signal, // Use the signal from the pre-created controller
      });

      if (response.body) {
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        
        // Rate calculation variables specific to this pull, managed via setActivePulls
        // Local copies for the loop, updated into state
        let currentDigestForRate = null;
        let lastTimestampForRate = null;
        let lastCompletedBytesForRate = null;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const lines = value.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              let newPercentage = null;
              let newDownloadRateBps = null;
              let newStatusMessage = parsed.status || (activePulls[finalModelName]?.statusMessage || '');
              
              if (parsed.digest && parsed.digest !== currentDigestForRate) {
                currentDigestForRate = parsed.digest;
                lastTimestampForRate = Date.now();
                lastCompletedBytesForRate = parsed.completed || 0;
                newDownloadRateBps = null; // Reset rate for new layer
              }

              if (parsed.total && parsed.completed) {
                newPercentage = Math.round((parsed.completed / parsed.total) * 100);
                
                if (lastTimestampForRate && lastCompletedBytesForRate !== null && parsed.completed > lastCompletedBytesForRate) {
                  const timeDiffSeconds = (Date.now() - lastTimestampForRate) / 1000;
                  if (timeDiffSeconds >= 0.25) { // Update rate if enough time passed or significant byte change
                    const bytesDiff = parsed.completed - lastCompletedBytesForRate;
                    newDownloadRateBps = bytesDiff / timeDiffSeconds;
                    lastTimestampForRate = Date.now();
                    lastCompletedBytesForRate = parsed.completed;
                  } else {
                    // Keep previous rate if interval too short, unless it was null
                    newDownloadRateBps = activePulls[finalModelName]?.downloadRateBps || null;
                  }
                } else if (parsed.completed === 0) {
                    newDownloadRateBps = null; // Explicitly null if download hasn't started for this layer
                }

              } else if (parsed.status && !parsed.total) {
                 // For statuses like "pulling manifest", keep current percentage or set to an indeterminate small value
                 // newPercentage will remain null, so state update won't change it unless it was null
              }


              setActivePulls(prev => ({
                ...prev,
                [finalModelName]: {
                  ...(prev[finalModelName] || {}),
                  modelName: finalModelName,
                  statusMessage: newStatusMessage,
                  percentage: newPercentage !== null ? newPercentage : (prev[finalModelName]?.percentage || 0),
                  downloadRateBps: newDownloadRateBps !== null ? newDownloadRateBps : (prev[finalModelName]?.downloadRateBps || null),
                  currentDigest: currentDigestForRate || prev[finalModelName]?.currentDigest,
                  rateCalcLastTimestamp: lastTimestampForRate || prev[finalModelName]?.rateCalcLastTimestamp,
                  rateCalcLastCompletedBytes: lastCompletedBytesForRate !== null ? lastCompletedBytesForRate : prev[finalModelName]?.rateCalcLastCompletedBytes,
                  error: parsed.error ? parsed.error : prev[finalModelName]?.error,
                }
              }));

              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) { /* ignore lines that are not json or don't conform */ }
          }
        }
      }

      if (!response.ok) {
        let errorMsg = `Failed to pull model ${finalModelName}. Status: ${response.status}`;
        try {
            const errorData = await response.json(); // Attempt to parse backend error
            errorMsg = errorData.error || errorMsg;
        } catch (e) { /* ignore if error response is not json */ }
        throw new Error(errorMsg);
      }
      
      toast.success(`Model ${finalModelName} pulled successfully! Refreshing local models...`);
      setActivePulls(prev => ({
        ...prev,
        [finalModelName]: {
          ...(prev[finalModelName] || {}),
          statusMessage: `Successfully pulled ${finalModelName}!`,
          percentage: 100,
          downloadRateBps: null,
          isComplete: true,
          error: null,
        }
      }));
      // setModelToPull(''); // Don't clear, user might want to pull another variant or re-pull
      
      const localModelsResponse = await fetch('/api/ollama/models');
      const localModelsData = await localModelsResponse.json();
      setLocalOllamaModels(localModelsData);

    } catch (error) {
      if (error.name === 'AbortError') {
        toast.warn(`Pull for ${finalModelName} cancelled by user.`);
        setActivePulls(prev => ({
          ...prev,
          [finalModelName]: {
            ...(prev[finalModelName] || {}),
            modelName: finalModelName,
            statusMessage: `Pull for ${finalModelName} cancelled.`, 
            percentage: prev[finalModelName]?.percentage || 0,
            downloadRateBps: null,
            error: 'Cancelled', // Specific error marker
            isComplete: true,
            isCancelling: false, // Reset cancelling flag
            abortController: prev[finalModelName]?.abortController, 
          }
        }));
      } else {
        console.error(`Failed to pull model ${finalModelName}:`, error);
        toast.error(`Error pulling model ${finalModelName}: ${error.message}`);
        setActivePulls(prev => ({
          ...prev,
          [finalModelName]: {
            ...(prev[finalModelName] || {}),
            modelName: finalModelName,
            statusMessage: `Error pulling ${finalModelName}: ${error.message.substring(0, 100)}...`,
            percentage: prev[finalModelName]?.percentage || 0,
            downloadRateBps: null,
            error: error.message,
            isComplete: true,
            isCancelling: false, // Ensure cancelling flag is reset on other errors too
            abortController: prev[finalModelName]?.abortController,
          }
        }));
      }
    } 
    // finally {
      // The pull entry remains in activePulls to show final status (complete/error)
      // setIsPullingModel(false); // Removed
      // setTimeout(() => setPullProgress({ message: '', percentage: null, downloadRateBps: null }), 5000); // Removed
    // }
  };

  const handleCancelPull = (modelName) => {
    setActivePulls(prev => {
      const pullData = prev[modelName];
      if (pullData && pullData.abortController && !pullData.isComplete && !pullData.error && !pullData.isCancelling) {
        pullData.abortController.abort();
        return {
          ...prev,
          [modelName]: {
            ...pullData,
            statusMessage: `Cancelling pull for ${modelName}...`,
            isCancelling: true, // Set cancelling flag
          }
        };
      }
      return prev;
    });
  };

  const handleClearFinishedPull = (modelName) => {
    setActivePulls(prev => {
      const newActivePulls = { ...prev };
      if (newActivePulls[modelName] && newActivePulls[modelName].isComplete) {
        delete newActivePulls[modelName];
      }
      return newActivePulls;
    });
  };

  const handleDeleteModel = async (modelIdToDelete) => {
    if (!modelIdToDelete) return;

    if (!window.confirm(`Are you sure you want to delete the model: ${modelIdToDelete}? This action cannot be undone.`)) {
      return;
    }

    toast.info(`Deleting model: ${modelIdToDelete}...`);
    try {
      // ... existing code ...
    } catch (error) {
      console.error(`Failed to delete model ${modelIdToDelete}:`, error);
      toast.error(`Error deleting model ${modelIdToDelete}: ${error.message}`);
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

  const toggleThoughtCollapse = (messageId) => {
    setChatHistory(prev => prev.map(msg =>
      msg.id === messageId && msg.sender === 'bot' ? { ...msg, isThoughtCollapsed: !msg.isThoughtCollapsed } : msg
    ));
  };

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
                  <SelectTrigger id="model-select" className="w-full min-w-0">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent className="border bg-popover text-popover-foreground shadow-md backdrop-blur-sm">
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
                    <div className="space-y-4 py-4">
                        {externalModelsForPulling && externalModelsForPulling.length > 0 && (
                          <div className="grid grid-cols-[1fr_3fr] items-center gap-3">
                            <Label htmlFor="select-external-model" className="text-right">
                              Select Model
                            </Label>
                            <Select
                              onValueChange={(value) => {
                                const selected = externalModelsForPulling.find(m => m.id === value);
                                setSelectedModelForTagSelection(selected);
                                if (selected) {
                                  let pullName = selected.name;
                                  if (selected.tags && selected.tags.length > 0) {
                                    setChosenTag(selected.tags[0]);
                                    pullName += ':' + selected.tags[0];
                                  } else {
                                    setChosenTag('');
                                  }
                                  setModelToPull(pullName);
                                  toast.info(`Selected: ${pullName}. Adjust tag if needed or select from tag dropdown, then click Pull.`)
                                } else {
                                  setSelectedModelForTagSelection(null);
                                  setChosenTag('');
                                }
                              }}
                            >
                              <SelectTrigger id="select-external-model" className="w-full">
                                <SelectValue placeholder="Select a model from registry..." />
                              </SelectTrigger>
                              <SelectContent className="max-h-56 border bg-popover text-popover-foreground shadow-md backdrop-blur-sm">
                                {externalModelsForPulling.map(model => {
                                  const isLocal = localOllamaModels.some(localModel => localModel.name.startsWith(model.name + ':') || localModel.name === model.name);
                                  const displayName = `${model.name}${isLocal ? ' (local)' : ''}`;
                                  return (
                                    <SelectItem key={model.id} value={model.id}>
                                      {displayName} ({model.tags && model.tags.length > 0 ? model.tags.join(', ') : 'latest'})
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {selectedModelForTagSelection && selectedModelForTagSelection.tags && selectedModelForTagSelection.tags.length > 0 && (
                          <div className="grid grid-cols-[1fr_3fr] items-center gap-3 mt-3">
                            <Label htmlFor="select-tag" className="text-right">
                              Select Tag
                            </Label>
                            <Select
                              value={chosenTag}
                              onValueChange={(tag) => {
                                setChosenTag(tag);
                                if (selectedModelForTagSelection) {
                                  const pullName = selectedModelForTagSelection.name + ':' + tag;
                                  setModelToPull(pullName);
                                  toast.info(`Set to pull: ${pullName}`);
                                }
                              }}
                            >
                              <SelectTrigger id="select-tag" className="w-full">
                                <SelectValue placeholder="Select a tag..." />
                              </SelectTrigger>
                              <SelectContent className="max-h-56 border bg-popover text-popover-foreground shadow-md backdrop-blur-sm">
                                {selectedModelForTagSelection.tags.map(tag => (
                                  <SelectItem key={tag} value={tag}>
                                    {tag}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-[1fr_2fr_auto] items-center gap-3">
                            <Label htmlFor="model-to-pull" className="text-right">
                                Pull Model Name
                            </Label>
                            <Input 
                                id="model-to-pull"
                                value={modelToPull} 
                                onChange={(e) => setModelToPull(e.target.value)}
                                placeholder="e.g., llama3:latest" 
                                className="min-w-0"
                                disabled={activePulls[modelToPull] && !activePulls[modelToPull].isComplete && !activePulls[modelToPull].error}
                            />
                            <Button 
                                onClick={() => handlePullModel(modelToPull)} 
                                disabled={!modelToPull.trim() || (activePulls[modelToPull] && !activePulls[modelToPull].isComplete && !activePulls[modelToPull].error)}
                                className="whitespace-nowrap"
                            >
                                {activePulls[modelToPull] && !activePulls[modelToPull].isComplete && !activePulls[modelToPull].error ? 'Pulling...' : 'Pull'}
                            </Button>
                        </div>

                        {/* Display for multiple active pulls */}
                        {Object.keys(activePulls).length > 0 && (
                          <div className="mt-4 space-y-3">
                            <h5 className="text-sm font-medium">Active Downloads:</h5>
                            {Object.values(activePulls).map((pull) => (
                              <div key={pull.modelName} className="text-xs p-2 border rounded-md">
                                <p className="font-semibold truncate">{pull.modelName}</p>
                                <p className="text-muted-foreground truncate">
                                  {pull.percentage !== null && pull.percentage >= 0 && !pull.isComplete && !pull.error && `(${pull.percentage}%) `}
                                  {pull.statusMessage}
                                  {pull.downloadRateBps && pull.downloadRateBps > 0 && !pull.isComplete && !pull.error && ` (~${(pull.downloadRateBps / 1024 / 1024).toFixed(2)} MB/s)`}
                                </p>
                                {pull.percentage !== null && !pull.isComplete && !pull.error && (
                                  <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700 mt-1">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-linear" 
                                      style={{ width: `${pull.percentage}%` }}
                                    ></div>
                                  </div>
                                )}
                                {pull.error && <p className="text-red-500 mt-1">Error: {pull.error === 'Cancelled' ? 'Cancelled by user.' : pull.error}</p>}
                                {pull.isComplete && !pull.error && <p className="text-green-500 mt-1">Status: Download complete!</p>}
                                {pull.isComplete && pull.error === 'Cancelled' && <p className="text-yellow-500 mt-1">Status: Cancelled.</p>}
                                {pull.isComplete && pull.error && pull.error !== 'Cancelled' && <p className="text-red-500 mt-1">Status: Failed.</p>}

                                {!pull.isComplete && !pull.error && (
                                   <Button 
                                      variant="outline"
                                      size="sm"
                                      className="mt-2 w-full text-xs"
                                      onClick={() => handleCancelPull(pull.modelName)}
                                      disabled={pull.isComplete || !!pull.error || pull.isCancelling}
                                    >
                                      {pull.isCancelling ? 'Cancelling...' : 'Cancel Pull'}
                                    </Button>
                                )}
                                {pull.isComplete && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 w-full text-xs"
                                    onClick={() => handleClearFinishedPull(pull.modelName)}
                                  >
                                    Clear from list
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground pt-2"> {/* Adjusted padding */}
                            Browse available models and tags on <a href="https://ollama.com/library" target="_blank" rel="noopener noreferrer" className="underline">ollama.com/library</a>.
                        </div>
                       
                        <div className="mt-3"> {/* Added margin top */}
                          <h4 className="font-semibold mb-2">Available Local Models:</h4>
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
                  <div key={chat.id} className={`flex mb-3 ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {chat.sender === 'user' ? (
                      <span className="inline-block p-2 px-3 rounded-lg max-w-[70%] bg-primary text-primary-foreground shadow">
                        {chat.text}
                      </span>
                    ) : ( // Bot message
                      <div className="flex flex-col items-start max-w-[75%]"> {/* Max width for the bot's entire content block */}
                        {/* Thought Header */}
                        <div 
                          className="w-full p-1 text-xs text-muted-foreground/90 hover:text-muted-foreground cursor-pointer flex justify-between items-center rounded-t-md"
                          onClick={() => toggleThoughtCollapse(chat.id)}
                          aria-expanded={!chat.isThoughtCollapsed}
                          aria-controls={`thought-content-${chat.id}`}
                        >
                          <span className="font-medium">
                            Response by {chat.modelName}
                            {chat.isLoading && "..."}
                            {!chat.isLoading && chat.durationMs !== null && ` (took ${(chat.durationMs / 1000).toFixed(1)}s)`}
                          </span>
                          <span className="text-xs">{chat.isThoughtCollapsed ? 'Show details ▼' : 'Hide details ▲'}</span>
                        </div>
                        
                        {/* Collapsible Thought Content */}
                        {!chat.isThoughtCollapsed && (
                          <div 
                            id={`thought-content-${chat.id}`} 
                            className="w-full p-2.5 my-0 text-xs bg-stone-50 dark:bg-stone-800 border-x border-b border-stone-200 dark:border-stone-700 rounded-b-md shadow-inner space-y-1"
                          >
                            <p><strong>Model:</strong> {chat.modelName}</p>
                            {chat.rawStartTime && <p><strong>Timestamp:</strong> {new Date(chat.rawStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>}
                            {chat.durationMs !== null && !chat.isLoading && <p><strong>Generation Time:</strong> {(chat.durationMs / 1000).toFixed(2)} seconds</p>}
                            <p><strong>Status:</strong> {chat.isLoading ? "Receiving response..." : "Complete."}</p>
                            <p className="italic text-muted-foreground/70 pt-1">This section shows metadata about the model's response generation.</p>
                          </div>
                        )}
                        
                        {/* Actual Bot Message Bubble */}
                        <span className={`inline-block p-2 px-3 rounded-lg mt-1.5 max-w-full bg-muted text-muted-foreground shadow ${!chat.isThoughtCollapsed ? 'rounded-t-none': ''}`}>
                          {chat.text.trim() === '' && chat.isLoading ? 
                              <span className="italic">Generating response...</span> : 
                              (chat.text.trim() === '' && !chat.isLoading && chat.durationMs !== null ? 
                                <span className="italic">(No text in response)</span> : 
                                chat.text
                              )
                          }
                          {chat.text.trim() === '' && !chat.isLoading && chat.durationMs === null && 
                            <span className="italic text-red-500">(Error or empty stream)</span>
                          }
                        </span>
                      </div>
                    )}
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


