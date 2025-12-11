import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, Stethoscope, Settings, Info, Image as ImageIcon, X } from 'lucide-react';
import { AgentType, Message, AgentResponse } from './types';
import { processHospitalRequest } from './services/geminiService';
import AgentCard from './components/AgentCard';
import VisualizationPanel from './components/VisualizationPanel';

const App: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentType>(AgentType.COORDINATOR);
  const [lastResponse, setLastResponse] = useState<AgentResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Keep the data URL prefix for display, strip it for API sending later if needed
        setSelectedImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !selectedImage) || isProcessing) return;

    // Extract base64 data without prefix for the API if an image is selected
    const imageBase64Raw = selectedImage ? selectedImage.split(',')[1] : undefined;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
    };

    // If there's an image, we might want to display it in the chat bubble (simplified here as just text or separate UI)
    // For this demo, we append a marker text if image exists
    const displayContent = selectedImage 
      ? `[Medical Image Attached]\n${inputValue}` 
      : inputValue;
    
    const displayMessage = { ...userMessage, content: displayContent };

    setMessages((prev) => [...prev, displayMessage]);
    setInputValue('');
    setSelectedImage(null);
    setIsProcessing(true);
    setActiveAgent(AgentType.COORDINATOR);
    setLastResponse(null);

    // Simulate thinking/routing delay for visual effect
    await new Promise(resolve => setTimeout(resolve, 1500));

    const result = await processHospitalRequest(userMessage.content, imageBase64Raw);
    
    // Update Active Agent based on result
    setActiveAgent(result.agentType);
    
    // Small delay to allow user to see the agent switch before content loads
    await new Promise(resolve => setTimeout(resolve, 800));

    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: result.content,
      agentResponse: result
    };

    setMessages((prev) => [...prev, botMessage]);
    setLastResponse(result);
    setIsProcessing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Sample prompts for quick testing (Updated to Indonesian/English mix context)
  const samplePrompts = [
    { label: "RME", text: "Dr. Sutomo notes: Pasien Budi Santoso, diagnosis acute bronchitis, resep Amoxicillin 500mg." },
    { label: "Admin", text: "Buatkan analisis aging schedule untuk piutang asuransi yang lewat 90 hari." },
    { label: "Clinical", text: "Pasien tekanan darah 160/95, pusing berat. Berikan rekomendasi awal." },
    { label: "Edu", text: "Buatkan materi edukasi perawatan luka diabetes yang mudah dipahami lansia." }
  ];

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar / Agent Status */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl hidden md:flex">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 text-indigo-700">
            <div className="p-2 bg-indigo-50 rounded-lg">
                <Stethoscope size={24} />
            </div>
            <h1 className="font-bold text-xl tracking-tight">MediCore AI</h1>
          </div>
          <p className="text-xs text-slate-500 mt-2 ml-1">Hospital Orchestration System</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Active Agents</p>
          
          <AgentCard 
            type={AgentType.RME} 
            isActive={activeAgent === AgentType.RME} 
            description="Medical Records & Compliance"
          />
          <AgentCard 
            type={AgentType.ADMIN} 
            isActive={activeAgent === AgentType.ADMIN} 
            description="Billing, Claims & Finance"
          />
          <AgentCard 
            type={AgentType.CLINICAL} 
            isActive={activeAgent === AgentType.CLINICAL} 
            description="Decision Support System"
          />
          <AgentCard 
            type={AgentType.EDUCATION} 
            isActive={activeAgent === AgentType.EDUCATION} 
            description="Patient Communication"
          />
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>System Status: <span className="text-emerald-500 font-bold">Online</span></span>
            <Settings size={14} className="cursor-pointer hover:text-indigo-600"/>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${activeAgent === AgentType.COORDINATOR ? 'bg-slate-300' : 'bg-indigo-500 animate-pulse'}`}></span>
            <h2 className="font-semibold text-slate-700">
              {activeAgent === AgentType.COORDINATOR ? 'Coordinator Standing By' : `Orchestrating: ${activeAgent}`}
            </h2>
          </div>
          <button className="text-slate-400 hover:text-indigo-600 transition-colors">
            <Info size={20} />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-40 select-none">
              <Stethoscope size={64} className="mb-4 text-slate-300" />
              <p className="text-xl font-light text-slate-400">MediCore Hospital Intelligence</p>
              <p className="text-sm text-slate-400 mt-2">Ready for Clinical, Admin, RME & Education tasks</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl rounded-2xl p-5 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
              }`}>
                {msg.role === 'assistant' && msg.agentResponse && (
                  <div className="mb-3 flex items-center gap-2 pb-2 border-b border-slate-100 opacity-75">
                    <span className="text-xs font-bold uppercase tracking-wide text-indigo-500">{msg.agentResponse.agentType} Agent</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-[10px] text-slate-400 italic">{msg.agentResponse.reasoning}</span>
                  </div>
                )}
                {/* Render image if user sent one */}
                {msg.role === 'user' && msg.content.includes('[Medical Image Attached]') && (
                   <div className="mb-2 p-2 bg-indigo-500/20 rounded-lg inline-block">
                      <ImageIcon className="w-5 h-5 text-white" />
                   </div>
                )}
                <div className="prose prose-sm max-w-none text-inherit leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
           {isProcessing && (
            <div className="flex justify-start">
               <div className="bg-white px-6 py-4 rounded-2xl rounded-bl-none shadow-sm border border-slate-100 flex items-center gap-3">
                 <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                 </div>
                 <span className="text-xs text-slate-500 font-medium animate-pulse">
                   {activeAgent === AgentType.COORDINATOR ? 'Analyzing & Routing...' : `Processing with ${activeAgent}...`}
                 </span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-slate-200">
          
          {/* Quick Prompts */}
          {messages.length === 0 && (
             <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                {samplePrompts.map((p, i) => (
                    <button 
                        key={i}
                        onClick={() => setInputValue(p.text)}
                        className="flex-shrink-0 px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-full text-xs font-medium transition-colors"
                    >
                        {p.label}
                    </button>
                ))}
             </div>
          )}

          {/* Image Preview */}
          {selectedImage && (
            <div className="mb-3 relative inline-block">
              <div className="relative rounded-lg overflow-hidden border border-slate-200 w-24 h-24 group">
                <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                >
                  <X size={12} />
                </button>
              </div>
              <span className="text-xs text-slate-500 ml-2">DICOM/Image Attached</span>
            </div>
          )}

          <div className="relative flex items-end gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            
            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleImageUpload}
            />

            <button 
              onClick={() => fileInputRef.current?.click()}
              className={`p-3 rounded-lg transition-colors ${selectedImage ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
              title="Upload Medical Image"
            >
              {selectedImage ? <ImageIcon size={20} /> : <Plus size={20} />}
            </button>
            
            <textarea
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[50px] py-3 text-sm text-slate-700 placeholder-slate-400"
              placeholder="Describe the clinical task or ask about administration..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button 
              className={`p-3 rounded-lg transition-all shadow-sm ${
                inputValue.trim() || selectedImage
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
              onClick={handleSendMessage}
              disabled={(!inputValue.trim() && !selectedImage) || isProcessing}
            >
              <Send size={20} />
            </button>
          </div>
          <div className="text-center mt-2">
            <p className="text-[10px] text-slate-400">
              AI dapat melakukan kesalahan. Selalu verifikasi rekomendasi klinis dengan profesional medis.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel: Data Visualization */}
      <div className="w-96 bg-white border-l border-slate-200 hidden xl:flex flex-col shadow-xl z-20">
        <div className="p-5 border-b border-slate-100">
           <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Operational Excellence</h3>
        </div>
        <div className="p-6 flex-1 overflow-y-auto bg-slate-50/50">
            <VisualizationPanel lastResponse={lastResponse} isProcessing={isProcessing && activeAgent !== AgentType.COORDINATOR} />
        </div>
      </div>

    </div>
  );
};

export default App;
