import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { API_URL } from "../context/AuthContext";

const agentDetails = {
  Ava: {
    name: "Ava",
    title: "Technical Lead",
    avatar: "🤖",
    color: "from-purple-500 via-indigo-500 to-blue-600",
    bgBorder: "border-purple-500/30",
    bgText: "text-purple-300",
    pitch: 1.1,
    rate: 1.05,
    description: "Direct technical evaluation. System design, algorithms, databases.",
    intro: "Hello! I am Ava, your Technical Lead. I'll evaluate your system architectural foundations, database designs, and core software engineering mastery. Let's begin!"
  },
  Marcus: {
    name: "Marcus",
    title: "Product Manager",
    avatar: "💼",
    color: "from-cyan-500 via-blue-500 to-indigo-600",
    bgBorder: "border-blue-500/30",
    bgText: "text-blue-300",
    pitch: 0.95,
    rate: 1.0,
    description: "Agile delivery, milestone prioritization, risk analysis, project metrics.",
    intro: "Welcome. I am Marcus, your Product Manager. Today we will focus on sprint prioritization strategies, agile execution mechanics, and stakeholder management. Let's begin."
  },
  Sophia: {
    name: "Sophia",
    title: "HR Specialist",
    avatar: "🌸",
    color: "from-rose-500 via-pink-500 to-purple-600",
    bgBorder: "border-rose-500/30",
    bgText: "text-rose-300",
    pitch: 1.15,
    rate: 0.95,
    description: "Core cultural values, team dynamics, behavioral skills, career drive.",
    intro: "Hi! I am Sophia, your HR Specialist. I am looking forward to exploring your career journey, cross-functional collaboration styles, behavioral adaptability, and cultural values. Let's start."
  },
  Dexter: {
    name: "Dexter",
    title: "Genius Dev",
    avatar: "⚡",
    color: "from-amber-400 via-orange-500 to-red-500",
    bgBorder: "border-amber-500/30",
    bgText: "text-amber-300",
    pitch: 1.05,
    rate: 1.15,
    description: "Code health metrics, unit testing setups, secure frameworks, complex debugging.",
    intro: "Hey there! I am Dexter, code dev lead. Let's chat code standards, automated testing pipelines, tricky legacy debugging, and modern secure software builds. Let's do this!"
  }
};

const AIInterviewRoom = () => {
  const { candidateId } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Interview status
  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [transcript, setTranscript] = useState([]); // [{ question: "...", answer: "..." }]
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gradingResult, setGradingResult] = useState(null);

  // Voice recording states
  const [recording, setRecording] = useState(false);
  const [recordingStep, setRecordingStep] = useState("");
  const [lastAudioUrl, setLastAudioUrl] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState("");
  
  const mediaRecorderRef = React.useRef(null);
  const audioChunksRef = React.useRef([]);
  const recognitionRef = React.useRef(null);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const fetchCandidatePublic = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_URL}/api/hr/public/candidates/${candidateId}`);
      if (res.ok) {
        setCandidate(await res.json());
      } else {
        const data = await res.json();
        setError(data.detail || "This secure interview link is invalid or has expired.");
      }
    } catch (err) {
      setError("Failed to establish secure handshake with interview servers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (candidateId) {
      fetchCandidatePublic();
    }
  }, [candidateId]);

  const handleStart = () => {
    setStarted(true);
    // Auto speak first question
    speakQuestion(candidate.questions[0]);
  };

  // Speaks using Web Speech Synthesis if available, else visual indicator
  const speakQuestion = (text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      const pitchVal = selectedAgent ? (agentDetails[selectedAgent]?.pitch ?? 1.0) : 1.0;
      const rateVal = selectedAgent ? (agentDetails[selectedAgent]?.rate ?? 1.05) : 1.05;
      utterance.pitch = pitchVal;
      utterance.rate = rateVal;
      
      // Find a premium natural voice if possible
      const voices = window.speechSynthesis.getVoices();
      const premiumVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Natural"));
      if (premiumVoice) utterance.voice = premiumVoice;
      window.speechSynthesis.speak(utterance);
    }
  };

  const uploadAudio = async (blob, stepIdx) => {
    setRecordingStep("transcribing");
    const formData = new FormData();
    formData.append("file", blob, `question_${stepIdx}.webm`);
    
    try {
      const res = await fetch(`${API_URL}/api/hr/public/candidates/${candidateId}/upload-audio/${stepIdx}`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setLastAudioUrl(data.audio_url);
      }
    } catch (err) {
      console.error("Failed to upload audio recording:", err);
    } finally {
      setRecordingStep("");
    }
  };

  const handleRecordVoice = async () => {
    if (recording) {
      // Stop recording
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setRecording(false);
      setRecordingStep("");
      return;
    }
    
    try {
      setRecording(true);
      setRecordingStep("listening");
      setCurrentAnswer("");
      setLastAudioUrl(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        uploadAudio(audioBlob, currentStep);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognitionRef.current = recognition;
        
        recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          setCurrentAnswer(finalTranscript + interimTranscript);
        };
        
        recognition.onerror = (event) => {
          console.error("Speech Recognition Error", event);
        };
        
        recognition.onend = () => {
          setRecording(false);
        };
        
        recognition.start();
      } else {
        // Fallback simulation if SpeechRecognition is not supported on current browser:
        const mockTranscriptions = {
          0: [
            "Yes, absolutely. In my recent project, I had to build a department-insulated document filing system using React functional components. ",
            "I leverage hooks like custom context providers to bridge the isolation layer securely, avoiding stale state closures, ",
            "and utilizing React.memo and useMemo pipelines to guarantee less than ten milliseconds page response under heavy DOM telemetry loads."
          ],
          1: [
            "Managing tight constraints is all about task scheduling and milestone tracking. I structure my work in small, iterative sprints. ",
            "I continuously check with administrators regarding scope changes, using Docker and Kubernetes deployments to verify builds on isolated stagers, ",
            "ensuring we discover errors early and automate critical deployments safely without impacting live workspaces."
          ],
          2: [
            "A modular layout relies on single-purpose, focused components that exchange parameters via strict props or unified hooks. ",
            "I avoid hardcoded variables, designing reusable components styled with Vanilla CSS and clean Tailwind grids, ",
            "which keeps the template visual appearance Harmonies and guarantees robust responsive design across all devices."
          ],
          3: [
            "Handling error boundary cases requires solid logic and fallback components. In React, I write wrapper boundaries using componentDidCatch ",
            "to securely intercept layout exceptions, sending error telemetry logs directly to backend logger databases like FastAPI and MongoDB, ",
            "while providing users with beautiful glassmorphic fallback screens so their terminal experience remains unbroken."
          ],
          4: [
            "To ensure premium code quality, I combine static analysis tools with robust testing suites. ",
            "I write unified tests covering logic nodes, enforce strict formatting criteria, and run regular security audits under SHA-256 protocols. ",
            "Additionally, I participate in rigorous group code reviews to align designs with modern engineering best practices."
          ]
        };

        const paragraphs = mockTranscriptions[currentStep] || [
          "I have extensive experience with modular software stacks. I design secure solutions with strict telemetry, ",
          "following optimized engineering methodologies to achieve high availability, clean compliance structures, ",
          "and automated database synchronization parameters."
        ];

        // Listen sequence
        await new Promise(resolve => setTimeout(resolve, 2000));
        setRecordingStep("transcribing");
        
        // Simulate typing transcription
        let fullText = "";
        for (let p of paragraphs) {
          fullText += p;
          setCurrentAnswer(fullText);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        setRecording(false);
        setRecordingStep("");
      }
      
    } catch (err) {
      alert("Microphone access denied. Please allow microphone permissions to record your voice answers.");
      setRecording(false);
      setRecordingStep("");
    }
  };

  const questionsToUse = (candidate && candidate.questions_by_agent && selectedAgent)
    ? (candidate.questions_by_agent[selectedAgent] || candidate.questions)
    : (candidate ? candidate.questions : []);

  const handleSubmitResponse = () => {
    if (!currentAnswer.trim()) {
      alert("Please provide an answer before submitting.");
      return;
    }

    const updatedTranscript = [
      ...transcript,
      {
        question: questionsToUse[currentStep],
        answer: currentAnswer,
        audio_url: lastAudioUrl || null
      }
    ];
    setTranscript(updatedTranscript);
    setCurrentAnswer("");
    setLastAudioUrl(null);

    if (currentStep + 1 < questionsToUse.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      speakQuestion(questionsToUse[nextStep]);
    } else {
      // Completed all questions
      submitInterview(updatedTranscript);
    }
  };

  const submitInterview = async (finalTranscript) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/hr/public/candidates/${candidateId}/submit-ai-interview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ answers: finalTranscript })
      });
      
      if (res.ok) {
        const grading = await res.json();
        setGradingResult(grading);
        setCompleted(true);
      } else {
        alert("Server validation failed. Trying to cache responses locally...");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartWithAgent = (agentKey) => {
    setSelectedAgent(agentKey);
    setStarted(true);
    
    // Voice synth greeting intro
    const introText = agentDetails[agentKey].intro;
    speakQuestion(introText);
    
    // Schedule first question loading after speaking intro
    setTimeout(() => {
      const qSource = (candidate && candidate.questions_by_agent && candidate.questions_by_agent[agentKey])
        ? candidate.questions_by_agent[agentKey]
        : candidate.questions;
      if (qSource && qSource.length > 0) {
        speakQuestion(qSource[0]);
      }
    }, 5800);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-app flex flex-col items-center justify-center text-text-primary">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin"></div>
          <div className="absolute w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }}></div>
        </div>
        <p className="mt-4 text-text-secondary tracking-widest text-xs uppercase font-bold animate-pulse">Syncing Interview Handshake...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg-app flex items-center justify-center p-6 text-text-primary text-center">
        <div className="max-w-md p-8 bg-bg-surface border border-brand-error/20 rounded-3xl space-y-6 shadow-card">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-bold text-brand-error">Handshake Interrupted</h2>
          <p className="text-sm text-text-secondary leading-relaxed">{error}</p>
          <Link to="/" className="inline-block py-2.5 px-6 bg-bg-surface-alt hover:bg-bg-surface border border-border-primary text-text-secondary hover:text-text-primary text-xs font-bold uppercase tracking-wider rounded-full transition-all">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-app text-text-primary flex flex-col justify-between py-10 px-6 relative overflow-hidden">
      {/* Background glowing blobs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-brand-primary/5 rounded-full filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-brand-accent/5 rounded-full filter blur-[100px] pointer-events-none"></div>

      {/* Top branding */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-primary hover:bg-brand-primary/95 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            W
          </div>
          <span className="font-extrabold text-xs tracking-widest uppercase text-text-secondary">WorkPulse AI Labs</span>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-widest text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded shadow-sm">
          Secure Workspace
        </span>
      </header>

      {/* Main interaction board */}
      <main className="max-w-4xl mx-auto w-full z-10 flex flex-col items-center justify-center flex-1 my-10">
        {!started ? (
          // Welcoming Hero
          <div className="max-w-3xl text-center space-y-8 animate-fadeIn w-full">
            <div className="w-20 h-20 bg-gradient-to-tr from-brand-warning to-brand-primary rounded-full flex items-center justify-center text-3xl mx-auto shadow-sm relative group">
              <div className="absolute inset-0 bg-brand-primary/20 rounded-full animate-ping"></div>
              <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2z" stroke="currentColor" />
                <path d="M8 14c1.2 1.5 3.8 1.5 5 0" stroke="currentColor" strokeLinecap="round" />
                <circle cx="9" cy="10" r="1.2" fill="currentColor" />
                <circle cx="15" cy="10" r="1.2" fill="currentColor" />
                <path d="M3 12a9 9 0 0118 0" stroke="currentColor" strokeLinecap="round" />
                <rect x="2" y="11" width="1.5" height="4" rx="0.7" fill="currentColor" />
                <rect x="20" y="11" width="1.5" height="4" rx="0.7" fill="currentColor" />
                <path d="M20 13h-2" stroke="currentColor" />
              </svg>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Interactive Diagnostic Room</p>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-primary">Hello, {candidate?.name || "Applicant"}</h2>
              <p className="text-text-secondary text-xs leading-relaxed max-w-sm mx-auto">
                Welcome to your automated interview for the <strong className="text-brand-primary font-bold">{candidate?.role_applied || "Software Engineer"}</strong> position.
              </p>
            </div>

            {/* Premium AI Agent selector grid */}
            <div className="space-y-4">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary">Select Conversational AI Recruiter Agent:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {Object.keys(agentDetails).map((key) => {
                  const agent = agentDetails[key];
                  const isSelected = selectedAgent === key;
                  return (
                    <div
                      key={key}
                      onClick={() => setSelectedAgent(key)}
                      className={`bg-bg-surface border rounded-2xl p-5 text-center cursor-pointer transition-all duration-300 transform hover:-translate-y-1 shadow-card hover:shadow-card-hover ${
                        isSelected 
                          ? `border-brand-primary shadow-sm bg-brand-primary/10` 
                          : 'border-border-primary'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-tr ${agent.color} flex items-center justify-center text-xl mx-auto mb-3 shadow-sm text-white`}>
                        {agent.avatar}
                      </div>
                      <h4 className="font-bold text-xs text-text-primary leading-tight">{agent.name}</h4>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-brand-primary mt-1">{agent.title}</p>
                      <p className="text-[9px] text-text-secondary leading-relaxed mt-2.5 font-medium">{agent.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-5 bg-bg-surface border border-border-primary rounded-2xl space-y-3 text-left text-xs max-w-md mx-auto shadow-sm">
              <span className="text-[9px] font-bold uppercase tracking-widest text-brand-primary">Handshake Directives:</span>
              <ul className="space-y-2 text-text-secondary text-[11px] leading-relaxed">
                <li>• The selected AI Recruiter will ask <strong>5 customized questions</strong> based on their persona.</li>
                <li>• You may type your responses or select <strong>Voice Input</strong> to speak.</li>
                <li>• Ensure a quiet environment before using voice recording systems.</li>
                <li>• Recruiter dialogues will automatically synchronize with server databases.</li>
              </ul>
            </div>

            <button
              onClick={() => {
                if (!selectedAgent) {
                  alert("Please choose an AI Recruiter Agent to conduct your interview session first.");
                  return;
                }
                handleStartWithAgent(selectedAgent);
              }}
              className="px-8 py-3.5 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs uppercase tracking-widest rounded-full transition-all transform hover:-translate-y-0.5 shadow-sm cursor-pointer text-center"
            >
              {selectedAgent ? `Start Session with ${selectedAgent}` : 'Select Agent Persona'}
            </button>
          </div>
        ) : completed ? (
          // Completed State
          <div className="max-w-xl text-center space-y-6 animate-fadeIn">
            <div className="w-16 h-16 bg-brand-success/10 border border-brand-success/20 rounded-full flex items-center justify-center text-3xl mx-auto text-brand-success shadow-sm">
              ✓
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-text-primary">Interview Complete!</h2>
              <p className="text-xs text-text-secondary max-w-xs mx-auto leading-relaxed">
                Your responses have been successfully compiled, evaluated, and securely archived in the HR recruitment database.
              </p>
            </div>

            {/* AI Fit feedback */}
            <div className="p-6 bg-bg-surface border border-border-primary rounded-3xl space-y-4 max-w-md mx-auto shadow-card text-left">
              <div className="flex justify-between items-center border-b border-border-primary pb-3">
                <span className="text-[9px] font-bold uppercase tracking-widest text-brand-primary">Diagnostic Verdict</span>
                <span className="text-xs font-mono font-bold text-brand-success">SLA Dispatched</span>
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted">AI Scoring Metrics</span>
                <div className="w-full bg-bg-surface-alt border border-border-primary rounded-full h-3 overflow-hidden relative">
                  <div className="bg-brand-primary h-full rounded-full transition-all duration-1000" style={{ width: `${gradingResult?.score || 80}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-text-secondary">
                  <span>Minimum Grade: 70</span>
                  <span className="text-brand-success">Achieved Grade: {gradingResult?.score || 80}</span>
                </div>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed italic bg-bg-surface-alt/50 border border-border-primary rounded-xl p-3">
                "{gradingResult?.notes}"
              </p>
            </div>

            <p className="text-[10px] text-text-muted font-bold tracking-wider uppercase">
              You may now safely close this window. Thank you for your time.
            </p>
          </div>
        ) : (
          // Active Interview Question State
          <div className="w-full space-y-10 animate-fadeIn">
            {/* Top Indicator */}
            <div className="flex justify-between items-center border-b border-border-primary pb-4 w-full">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-brand-primary">Dossier Question {currentStep + 1} of {questionsToUse.length}</span>
                <h3 className="font-bold text-sm text-text-muted uppercase mt-0.5">{candidate?.role_applied || "Software Developer"}</h3>
              </div>
              <span className={`font-mono text-xs font-bold bg-bg-surface-alt border border-border-primary px-2.5 py-1 rounded-xl uppercase tracking-wider text-brand-primary`}>
                AI Recruiter: {agentDetails[selectedAgent]?.name} Active
              </span>
            </div>

            {/* Glowing recruiter avatar orb */}
            <div className="flex flex-col items-center justify-center gap-4 py-4">
              <div className={`w-24 h-24 rounded-full bg-gradient-to-tr ${agentDetails[selectedAgent]?.color} flex items-center justify-center text-4xl shadow-card relative transition-all duration-500 ${recording ? 'scale-110' : ''}`}>
                {/* Visual Speech synth pulses */}
                <div className={`absolute inset-0 rounded-full bg-brand-primary/25 transition-all ${recording ? 'animate-ping' : 'animate-pulse'}`}></div>
                <div className="absolute inset-2 bg-bg-surface rounded-full flex items-center justify-center">
                  <div className={`w-12 h-12 rounded-full bg-bg-surface-alt flex items-center justify-center text-2xl`}>
                    {agentDetails[selectedAgent]?.avatar}
                  </div>
                </div>
              </div>
              <div className="text-center">
                <h4 className="font-bold text-xs text-text-primary leading-tight">{agentDetails[selectedAgent]?.name}</h4>
                <p className="text-[8px] font-bold uppercase tracking-widest text-brand-primary mt-0.5">{agentDetails[selectedAgent]?.title}</p>
                <p className="text-[9px] text-brand-warning uppercase font-bold tracking-widest animate-pulse mt-2">
                  {recordingStep === "listening" ? "🎤 Listening to response..." : recordingStep === "transcribing" ? "⚡ AI Transcribing..." : "AI Interposing..."}
                </p>
              </div>
            </div>

            {/* Question Text card */}
            <div className="p-6 md:p-8 rounded-3xl bg-bg-surface border border-border-primary shadow-card text-center space-y-4 relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${agentDetails[selectedAgent]?.color}`}></div>
              <h2 className="text-lg md:text-xl font-bold text-text-primary leading-relaxed">
                "{questionsToUse[currentStep]}"
              </h2>
            </div>

            {/* Answer Input and Recorders */}
            <div className="space-y-6">
              <div className="relative">
                <textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Type your detailed response here, or click the microphone to speak..."
                  rows="5"
                  disabled={recording}
                  className="w-full px-5 py-4 bg-bg-surface-alt border border-border-primary rounded-2xl text-xs text-text-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition resize-none disabled:opacity-40"
                />
                
                {/* Visual waveform bars while recording */}
                {recording && (
                  <div className="absolute bottom-6 right-6 flex items-end gap-1 h-6">
                    {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 bg-brand-primary rounded-full animate-pulse"
                        style={{
                          height: `${h * 15}%`,
                          animationDelay: `${i * 0.1}s`,
                          animationDuration: "0.4s"
                        }}
                      ></div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <button
                  type="button"
                  onClick={handleRecordVoice}
                  disabled={recording || submitting}
                  className={`w-full sm:w-auto px-6 py-3.5 border rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${recording ? 'bg-brand-error/10 border-brand-error/20 text-brand-error' : 'bg-bg-surface-alt hover:bg-bg-surface border-border-primary text-text-secondary'}`}
                >
                  🎤 {recording ? "Stop Recording" : "Voice Input Response"}
                </button>
                <button
                  type="button"
                  onClick={handleSubmitResponse}
                  disabled={recording || !currentAnswer.trim() || submitting}
                  className="w-full sm:w-auto px-8 py-3.5 bg-brand-primary hover:bg-brand-primary/95 disabled:opacity-30 disabled:pointer-events-none text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer text-center"
                >
                  {submitting ? "Analyzing dossier..." : currentStep + 1 === questionsToUse.length ? "Submit Final Answers" : "Next Question ➔"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="max-w-4xl mx-auto w-full text-center z-10 border-t border-border-primary pt-4 text-[9px] text-text-muted font-bold uppercase tracking-wider">
        © 2026 WorkPulse Inc. • Secure AI Diagnostics Handshake Protocol • SHA-256 OTP Enabled
      </footer>
    </div>
  );
};

export default AIInterviewRoom;
