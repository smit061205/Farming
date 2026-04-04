import API_BASE from "../api.js"
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'

export default function ConsultPage() {
  const { user, token } = useAuth()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm your Technological Terroir AI Agronomist. I have access to your latest soil metrics and coordinates. How can I assist you with your yield optimization today?" }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const chatEndRef = useRef(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    
    const userMsg = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('${API_BASE}/api/engine/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ messages: [...messages, userMsg] })
      })

      const data = await response.json()
      if (data.status === 'success') {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting to the agronomy database. " + (data.reply || '') }])
      }
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, { role: 'assistant', content: "Connection Error. Please check your network and try again." }])
    } finally {
      setIsLoading(false)
    }
  }

  // Voice to Text Feature
  const handleMicClick = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please try Chrome or Edge.");
      return;
    }

    if (isListening) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    // We let the browser use its naturally configured or translated language 
    // to support regional languages seamlessly.

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Text to Voice Feature
  const handleTTS = (text) => {
    if (!window.speechSynthesis) {
        alert("Text-to-speech is not supported in this browser.");
        return;
    }
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-bg-light relative overflow-x-hidden selection:bg-[#9f402d] selection:text-white flex flex-col">
      <Navbar />

      <main className="flex-1 pt-32 pb-24 px-6 relative z-10 w-full max-w-4xl mx-auto flex flex-col">
        <header className="mb-8">
          <div className="flex items-center gap-3 text-[#173809] mb-3">
            <span className="material-symbols-outlined text-4xl">psychology</span>
            <h1 className="font-headline text-3xl font-black uppercase tracking-tighter">AI Consultant</h1>
          </div>
          <p className="text-[#43493e] max-w-2xl text-sm leading-relaxed">
            Your personal AI Agronomist. It is fully aware of your verified soil parameters and geographic location to provide hyperspecific farming advice.
          </p>
        </header>

        {/* Chat Interface */}
        <div className="flex-1 bg-white/50 backdrop-blur-md border border-[#173809]/10 rounded-[2rem] p-4 flex flex-col shadow-xl overflow-hidden min-h-[500px]">
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <AnimatePresence>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm notranslate group ${
                    msg.role === 'user' 
                      ? 'bg-[#173809] text-white rounded-tr-sm' 
                      : 'bg-[#e7e3ca] text-[#173809] rounded-tl-sm'
                  }`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center justify-between mb-2 text-[#73796d]">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">psychology</span>
                          <span className="font-label text-[10px] uppercase tracking-widest font-bold">Terroir AI</span>
                        </div>
                        <button 
                          onClick={() => handleTTS(msg.content)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-[#9f402d] text-[#173809]/60"
                          title="Read Aloud"
                        >
                          <span className="material-symbols-outlined text-sm">volume_up</span>
                        </button>
                      </div>
                    )}
                    <div className={`text-sm leading-relaxed font-body whitespace-pre-wrap ${msg.role === 'assistant' ? 'format-markdown' : ''}`}>
                      {msg.content}
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-[#e7e3ca] p-4 rounded-2xl rounded-tl-sm flex gap-2 items-center">
                    <span className="w-2 h-2 bg-[#173809]/40 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-[#173809]/40 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-[#173809]/40 rounded-full animate-bounce delay-150"></span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          <div className="p-2 border-t border-[#173809]/10 mt-2 pt-4 flex gap-3 items-center">
            <button
              onClick={handleMicClick}
              className={`w-[52px] h-[52px] rounded-xl flex items-center justify-center transition-colors border ${isListening ? 'bg-red-50 text-red-500 border-red-200 animate-pulse' : 'bg-white text-[#173809]/60 border-[#173809]/20 hover:text-[#173809] hover:bg-[#173809]/5'}`}
              title="Dictate with regional language"
            >
              <span className="material-symbols-outlined">{isListening ? 'mic' : 'mic_none'}</span>
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask about crops, soil remediation, or market dynamics..."
              className="notranslate flex-1 bg-white border border-[#173809]/20 rounded-xl px-4 py-3 text-sm text-[#173809] focus:outline-none focus:border-[#9f402d] resize-none h-[52px]"
              rows="1"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="w-[52px] h-[52px] rounded-xl bg-[#9f402d] text-white flex items-center justify-center disabled:opacity-50 hover:bg-[#c05030] transition-colors"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
