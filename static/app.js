// ═══════════════════════════════════════════════════
// NAMASTE COACH v2 — Premium Interview Engine
// ═══════════════════════════════════════════════════

// --- App State ---
let stream = null;
let audioContext = null;
let analyser = null;
let animationFrameId = null;
let mediaRecorder = null;
let audioChunks = [];
let recordedFrames = [];
let frameIntervalId = null;
let timerIntervalId = null;
let timerSeconds = 0;

let currentQuestionIndex = 1;
const maxQuestions = 3;
let currentQuestionText = "";
let sessionHistory = [];

// Custom API Key and Speech Recognition State
let customApiKey = localStorage.getItem('namaste_coach_api_key') || '';
let browserSpeechRecognition = null;
let browserTranscriptText = '';

// Preloaded voices
let voicesReady = false;
let cachedVoices = [];

// Session config
let sessionConfig = {
    candidateName: '',
    role: '',
    level: '',
    company: '',
    jobDescription: '',
    interviewerGender: 'female',
    interviewerName: 'Priya Sharma',
    interviewerFirstName: 'Priya'
};

// --- DOM Elements ---
const onboardingScreen = document.getElementById('onboarding-screen');
const interviewScreen = document.getElementById('interview-screen');
const feedbackScreen = document.getElementById('question-feedback-screen');
const resultsScreen = document.getElementById('results-screen');

const apiDot = document.getElementById('api-status-dot');
const apiMsg = document.getElementById('api-status-text');

const candidateNameInput = document.getElementById('candidate-name');
const roleInput = document.getElementById('role-input');
const levelInput = document.getElementById('level-input');
const companyInput = document.getElementById('company-input');
const jdInput = document.getElementById('jd-input');

const startBtn = document.getElementById('start-interview-btn');
const toggleCamBtn = document.getElementById('toggle-camera-btn');
const toggleMicBtn = document.getElementById('toggle-mic-btn');
const camStatusLabel = document.getElementById('cam-status');
const micStatusLabel = document.getElementById('mic-status');

const recordingTimer = document.getElementById('recording-timer');
const timerText = document.getElementById('timer-text');

const webcamView = document.getElementById('webcam-view');
const snapshotCanvas = document.getElementById('snapshot-canvas');
const micGlowCircle = document.getElementById('mic-active-glow');
const voiceBars = document.querySelectorAll('#voice-bars-container .bar');

const activeQuestionText = document.getElementById('active-question-text');
const questionCounter = document.getElementById('question-count');
const progressBar = document.getElementById('session-progress');
const recordActionBtn = document.getElementById('record-action-btn');
const submitAnswerBtn = document.getElementById('submit-answer-btn');
const endEarlyBtn = document.getElementById('end-early-btn');
const processingLoader = document.getElementById('processing-loader');

const techGaugeValue = document.getElementById('tech-gauge-value');
const commGaugeValue = document.getElementById('comm-gauge-value');
const techGaugeCircle = document.getElementById('tech-gauge-circle');
const commGaugeCircle = document.getElementById('comm-gauge-circle');
const transcriptReview = document.getElementById('transcript-review');
const fillersContainer = document.getElementById('fillers-container');
const techCritique = document.getElementById('tech-critique-content');
const commCritique = document.getElementById('comm-critique-content');
const bodyCritique = document.getElementById('body-critique-content');
const expertPhrasing = document.getElementById('expert-phrasing');
const nextQuestionBtn = document.getElementById('next-question-btn');
const closeFeedbackBtn = document.getElementById('close-feedback-btn');

// Custom API Key Panel elements
const apiStatusTrigger = document.getElementById('api-status-trigger');
const apiKeyPanel = document.getElementById('api-key-panel');
const customApiKeyInput = document.getElementById('custom-api-key-input');
const toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility');
const saveApiKeyBtn = document.getElementById('save-api-key-btn');
const clearApiKeyBtn = document.getElementById('clear-api-key-btn');

const overallTotalScore = document.getElementById('overall-total-score');
const overallTotalFillers = document.getElementById('overall-total-fillers');
const overallBodyScore = document.getElementById('overall-body-score');
const overallRank = document.getElementById('overall-rank');
const questionsSummaryLog = document.getElementById('questions-summary-log');
const restartSessionBtn = document.getElementById('restart-interview-btn');

let hasCameraPermission = false;
let hasMicPermission = false;

const recordingOptions = { mimeType: 'audio/webm' };

// ═══════ PRELOAD VOICES (critical fix) ═══════
function preloadVoices() {
    cachedVoices = window.speechSynthesis.getVoices();
    if (cachedVoices.length > 0) {
        voicesReady = true;
        console.log(`Loaded ${cachedVoices.length} TTS voices`);
    }
}

// Voices load asynchronously — must listen for the event + poll
if ('speechSynthesis' in window) {
    preloadVoices();
    window.speechSynthesis.onvoiceschanged = preloadVoices;
    
    // Poll to make sure the voices are immediately available when user clicks start
    let voiceInterval = setInterval(() => {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
            cachedVoices = voices;
            voicesReady = true;
            console.log(`Voices polled & loaded successfully: ${voices.length}`);
            clearInterval(voiceInterval);
        }
    }, 150);
}

// ═══════ Speech Recognition fallback initialization ═══════
function initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        browserSpeechRecognition = new SpeechRecognition();
        browserSpeechRecognition.continuous = true;
        browserSpeechRecognition.interimResults = true;
        browserSpeechRecognition.lang = 'en-US';

        browserSpeechRecognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    browserTranscriptText += event.results[i][0].transcript + ' ';
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            const hintEl = document.getElementById('action-hint');
            if (hintEl && mediaRecorder && mediaRecorder.state === 'recording') {
                hintEl.innerHTML = `<span style="color: #00d2ff; font-weight: 700;">Live Transcript:</span> "${browserTranscriptText + interimTranscript}"`;
            }
        };

        browserSpeechRecognition.onerror = (e) => {
            console.warn('SpeechRecognition error:', e.error);
        };
    } else {
        console.warn('Web Speech API is not supported in this browser.');
    }
}

// ═══════ INITIALIZATION ═══════
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    checkAPIKey();
    spawnParticles();

    toggleCamBtn.addEventListener('click', requestCameraAccess);
    toggleMicBtn.addEventListener('click', requestMicrophoneAccess);
    startBtn.addEventListener('click', startInterviewSession);
    recordActionBtn.addEventListener('click', handleRecordToggle);
    submitAnswerBtn.addEventListener('click', submitAnswerForAnalysis);
    nextQuestionBtn.addEventListener('click', proceedToNextQuestion);

    closeFeedbackBtn.addEventListener('click', () => {
        window.speechSynthesis.cancel();
        feedbackScreen.style.display = 'none';
    });

    endEarlyBtn.addEventListener('click', () => {
        window.speechSynthesis.cancel();
        finishInterviewSession();
    });

    restartSessionBtn.addEventListener('click', restartSession);

    document.getElementById('speak-expert-btn').addEventListener('click', () => {
        const text = expertPhrasing.textContent;
        if (text) speakResponse(text);
    });

    document.getElementById('download-report-btn').addEventListener('click', downloadPerformanceReport);

    document.getElementById('results-speak-btn').addEventListener('click', () => {
        const score = overallTotalScore.textContent;
        const fillers = overallTotalFillers.textContent;
        const body = overallBodyScore.textContent;
        speakResponse(`Great job ${sessionConfig.candidateName}! Your overall score is ${score}. Body language: ${body}. Filler words used: ${fillers}. Review your detailed feedback below!`);
    });

    [candidateNameInput, roleInput, levelInput, companyInput].forEach(input => {
        input.addEventListener('input', checkReadyToStart);
    });

    // Custom API Key toggle panel behavior
    if (apiStatusTrigger && apiKeyPanel) {
        apiStatusTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            apiKeyPanel.classList.toggle('visible');
        });

        // Hide when clicking outside
        document.addEventListener('click', (e) => {
            if (!apiKeyPanel.contains(e.target) && !apiStatusTrigger.contains(e.target)) {
                apiKeyPanel.classList.remove('visible');
            }
        });
    }

    // Toggle visibility of input
    if (toggleKeyVisibilityBtn && customApiKeyInput) {
        toggleKeyVisibilityBtn.addEventListener('click', () => {
            const isPass = customApiKeyInput.type === 'password';
            customApiKeyInput.type = isPass ? 'text' : 'password';
            toggleKeyVisibilityBtn.querySelector('i').setAttribute('data-lucide', isPass ? 'eye-off' : 'eye');
            lucide.createIcons();
        });
    }

    // Save key
    if (saveApiKeyBtn && customApiKeyInput) {
        saveApiKeyBtn.addEventListener('click', () => {
            const val = customApiKeyInput.value.trim();
            customApiKey = val;
            localStorage.setItem('namaste_coach_api_key', val);
            apiKeyPanel.classList.remove('visible');
            checkAPIKey();
            alert('Custom API Key saved successfully!');
        });
    }

    // Clear key
    if (clearApiKeyBtn && customApiKeyInput) {
        clearApiKeyBtn.addEventListener('click', () => {
            customApiKey = '';
            customApiKeyInput.value = '';
            localStorage.removeItem('namaste_coach_api_key');
            apiKeyPanel.classList.remove('visible');
            checkAPIKey();
            alert('Custom API Key cleared!');
        });
    }

    // Initialize local speech recognition fallback
    initializeSpeechRecognition();
});

// ═══════ Particles ═══════
function spawnParticles() {
    const container = document.getElementById('particle-field');
    if (!container) return;
    for (let i = 0; i < 25; i++) {
        const p = document.createElement('div');
        const size = Math.random() * 2.5 + 1;
        p.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: rgba(0, 210, 255, ${Math.random() * 0.25 + 0.05});
            border-radius: 50%;
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
            animation: particleDrift ${Math.random() * 18 + 14}s linear infinite;
            pointer-events: none;
        `;
        container.appendChild(p);
    }
    if (!document.getElementById('particle-keyframes')) {
        const style = document.createElement('style');
        style.id = 'particle-keyframes';
        style.textContent = `
            @keyframes particleDrift {
                0% { transform: translateY(0) translateX(0); opacity: 0; }
                10% { opacity: 0.8; }
                90% { opacity: 0.8; }
                100% { transform: translateY(-100vh) translateX(30px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

// ═══════ API Key ═══════
async function checkAPIKey() {
    if (customApiKey && customApiKey.trim().startsWith('sk-')) {
        apiDot.className = 'dot-indicator green';
        apiMsg.textContent = 'Custom Key Active';
        if (customApiKeyInput) customApiKeyInput.value = customApiKey;
        return;
    }
    try {
        const res = await fetch('/api/check-key');
        const data = await res.json();
        if (data.status === 'configured') {
            apiDot.className = 'dot-indicator green';
            apiMsg.textContent = 'OpenAI Connected';
        } else {
            apiDot.className = 'dot-indicator red';
            apiMsg.textContent = 'API Key Missing';
        }
    } catch (e) {
        apiDot.className = 'dot-indicator red';
        apiMsg.textContent = 'Server Unreachable';
    }
}

// ═══════ Camera ═══════
async function requestCameraAccess() {
    try {
        let streamCam;
        const isMock = new URLSearchParams(window.location.search).get('mock') === 'true';
        if (isMock) {
            const canvas = document.createElement('canvas');
            canvas.width = 640; canvas.height = 480;
            const ctx = canvas.getContext('2d');
            let angle = 0;
            setInterval(() => {
                ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 640, 480);
                ctx.fillStyle = '#00d2ff'; ctx.beginPath();
                ctx.arc(320 + Math.sin(angle) * 100, 240, 50, 0, Math.PI * 2); ctx.fill();
                angle += 0.05;
            }, 30);
            streamCam = canvas.captureStream(30);
        } else {
            streamCam = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        }
        webcamView.srcObject = streamCam;
        hasCameraPermission = true;
        toggleCamBtn.classList.add('active');
        camStatusLabel.textContent = 'Allowed ✓';
        if (!stream) stream = new MediaStream();
        streamCam.getVideoTracks().forEach(t => stream.addTrack(t));
        checkReadyToStart();
        lucide.createIcons();
    } catch (err) {
        console.warn('Camera fallback:', err.message);
        const canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 480;
        canvas.getContext('2d').fillRect(0, 0, 640, 480);
        const mock = canvas.captureStream(30);
        webcamView.srcObject = mock;
        hasCameraPermission = true;
        toggleCamBtn.classList.add('active');
        camStatusLabel.textContent = 'Mock ✓';
        if (!stream) stream = new MediaStream();
        mock.getVideoTracks().forEach(t => stream.addTrack(t));
        checkReadyToStart();
        lucide.createIcons();
    }
}

// ═══════ Microphone ═══════
async function requestMicrophoneAccess() {
    try {
        let streamMic;
        const isMock = new URLSearchParams(window.location.search).get('mock') === 'true';
        if (isMock) {
            const ac = new (window.AudioContext || window.webkitAudioContext)();
            const dest = ac.createMediaStreamDestination();
            const osc = ac.createOscillator();
            const g = ac.createGain(); g.gain.value = 0.01;
            osc.connect(g); g.connect(dest); osc.start();
            streamMic = dest.stream;
        } else {
            streamMic = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        hasMicPermission = true;
        toggleMicBtn.classList.add('active');
        micStatusLabel.textContent = 'Allowed ✓';
        if (!stream) stream = new MediaStream();
        streamMic.getAudioTracks().forEach(t => stream.addTrack(t));
        setupAudioVisualizer(streamMic);
        checkReadyToStart();
        lucide.createIcons();
    } catch (err) {
        console.warn('Mic fallback:', err.message);
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const dest = ac.createMediaStreamDestination();
        const osc = ac.createOscillator();
        const g = ac.createGain(); g.gain.value = 0.01;
        osc.connect(g); g.connect(dest); osc.start();
        const mock = dest.stream;
        hasMicPermission = true;
        toggleMicBtn.classList.add('active');
        micStatusLabel.textContent = 'Mock ✓';
        if (!stream) stream = new MediaStream();
        mock.getAudioTracks().forEach(t => stream.addTrack(t));
        setupAudioVisualizer(mock);
        checkReadyToStart();
        lucide.createIcons();
    }
}

// ═══════ Ready Check ═══════
function checkReadyToStart() {
    const nameOk = candidateNameInput.value.trim().length > 0;
    const roleOk = roleInput.value.trim().length > 0;
    const permsOk = hasCameraPermission && hasMicPermission;

    if (nameOk && roleOk && permsOk) {
        startBtn.removeAttribute('disabled');
        startBtn.querySelector('span').textContent = 'Launch Interview 🚀';
    } else {
        startBtn.setAttribute('disabled', 'true');
        startBtn.querySelector('span').textContent = 'Fill Details & Allow Permissions';
    }
}

// ═══════ Audio Visualizer ═══════
function setupAudioVisualizer(micStream) {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        audioContext.createMediaStreamSource(micStream).connect(analyser);
        analyser.fftSize = 64;
    } catch (e) { console.error('Audio analyser failed:', e); }
}

function updateWaveformBars() {
    if (!analyser) return;
    const buf = analyser.frequencyBinCount;
    const data = new Uint8Array(buf);
    const render = () => {
        if (!mediaRecorder || mediaRecorder.state !== 'recording') {
            voiceBars.forEach(b => b.style.height = '4px');
            return;
        }
        analyser.getByteFrequencyData(data);
        voiceBars.forEach((b, i) => {
            b.style.height = `${Math.max(4, Math.min(45, (data[i % buf] / 255) * 45))}px`;
        });
        animationFrameId = requestAnimationFrame(render);
    };
    render();
}

// ═══════ Interviewer Config ═══════
function getInterviewerConfig() {
    const g = document.querySelector('input[name="interviewer-gender"]:checked')?.value || 'female';
    return g === 'male'
        ? { gender: 'male', name: 'Arjun Mehta', firstName: 'Arjun', avatarLetter: 'A' }
        : { gender: 'female', name: 'Priya Sharma', firstName: 'Priya', avatarLetter: 'P' };
}

// ═══════ START INTERVIEW ═══════
async function startInterviewSession() {
    const interviewer = getInterviewerConfig();
    sessionConfig = {
        candidateName: candidateNameInput.value.trim() || 'Candidate',
        role: roleInput.value.trim() || 'Software Engineer',
        level: levelInput.value.trim() || 'Mid-Level',
        company: companyInput.value.trim() || 'a tech company',
        jobDescription: jdInput.value.trim(),
        interviewerGender: interviewer.gender,
        interviewerName: interviewer.name,
        interviewerFirstName: interviewer.firstName
    };

    // Update interview screen header
    document.getElementById('interviewer-avatar-letter').textContent = interviewer.avatarLetter;
    document.getElementById('interviewer-display-name').textContent = interviewer.name;
    document.getElementById('interviewer-display-role').textContent = `Senior Interviewer at ${sessionConfig.company}`;

    const avatar = document.getElementById('interviewer-avatar');
    avatar.style.background = interviewer.gender === 'male'
        ? 'linear-gradient(135deg, #00d2ff, #8c52ff)'
        : 'linear-gradient(135deg, #ff6b9d, #8c52ff)';

    onboardingScreen.classList.remove('active');
    interviewScreen.classList.add('active');

    currentQuestionIndex = 1;
    sessionHistory = [];

    // Natural greeting then first question
    const greeting = `Hello ${sessionConfig.candidateName}! I'm ${interviewer.firstName}, and I'll be your interviewer today for the ${sessionConfig.role} role at ${sessionConfig.company}. Let's dive right in!`;
    speakResponse(greeting, () => {
        getNextQuestion();
    });
}

// ═══════ GENERATE QUESTION ═══════
async function getNextQuestion() {
    processingLoader.querySelector('p').textContent = 'Crafting your next question...';
    processingLoader.querySelector('.sub-loader-text').textContent = `${sessionConfig.interviewerFirstName} is thinking...`;
    processingLoader.style.display = 'flex';

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const res = await fetch('/api/generate-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                candidate_name: sessionConfig.candidateName,
                role: sessionConfig.role,
                level: sessionConfig.level,
                company: sessionConfig.company,
                job_description: sessionConfig.jobDescription,
                interviewer_name: sessionConfig.interviewerName,
                history: sessionHistory,
                custom_api_key: customApiKey
            })
        });
        clearTimeout(timeout);
        const data = await res.json();

        currentQuestionText = data.question || `${sessionConfig.candidateName}, tell me about your approach to solving complex problems in ${sessionConfig.role}.`;

    } catch (e) {
        console.error('Question fetch error:', e);
        currentQuestionText = `So ${sessionConfig.candidateName}, walk me through a challenging project you worked on as a ${sessionConfig.role} and what you learned from it.`;
    } finally {
        activeQuestionText.textContent = currentQuestionText;
        questionCounter.textContent = currentQuestionIndex;
        progressBar.style.width = `${(currentQuestionIndex / maxQuestions) * 100}%`;
        processingLoader.style.display = 'none';
        resetAnsweringState();
        speakResponse(currentQuestionText);
    }
}

// ═══════ RECORDING CONTROLS ═══════
function resetAnsweringState() {
    recordActionBtn.querySelector('span').textContent = 'Start Answering';
    recordActionBtn.classList.remove('recording');
    recordActionBtn.classList.add('ready-to-record');
    recordActionBtn.disabled = false;
    submitAnswerBtn.disabled = true;

    recordedFrames = [];
    audioChunks = [];

    recordActionBtn.querySelector('i').setAttribute('data-lucide', 'mic');
    micGlowCircle.classList.remove('active');
    lucide.createIcons();
    document.getElementById('action-hint').textContent = 'Ready. Click "Start Answering" to begin.';
}

function handleRecordToggle() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        startRecordingSpeech();
    } else if (mediaRecorder.state === 'recording') {
        stopRecordingSpeech();
    }
}

function startRecordingSpeech() {
    audioChunks = [];
    recordedFrames = [];
    captureVideoSnapshot();
    frameIntervalId = setInterval(captureVideoSnapshot, 5000);

    browserTranscriptText = '';
    if (browserSpeechRecognition) {
        try {
            browserSpeechRecognition.start();
            console.log('Local speech recognition started');
        } catch (e) {
            console.warn('Recognition start warning:', e);
        }
    }

    recordingTimer.style.display = 'flex';
    timerSeconds = 0;
    timerText.textContent = '00:00';

    timerIntervalId = setInterval(() => {
        timerSeconds++;
        const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
        const s = (timerSeconds % 60).toString().padStart(2, '0');
        timerText.textContent = `${m}:${s}`;

        const hint = document.getElementById('action-hint');
        if (timerSeconds < 10) {
            hint.textContent = `Keep going, ${sessionConfig.candidateName}! Elaborate more. (${timerSeconds}s)`;
        } else if (timerSeconds <= 90) {
            hint.textContent = `Great pacing! (${timerSeconds}s)`;
        } else {
            hint.textContent = `Wrap up your answer soon. (${timerSeconds}s)`;
        }
    }, 1000);

    const audioTrack = stream.getAudioTracks()[0];
    try {
        mediaRecorder = new MediaRecorder(new MediaStream([audioTrack]), recordingOptions);
    } catch (e) {
        mediaRecorder = new MediaRecorder(new MediaStream([audioTrack]));
    }

    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = () => {
        submitAnswerBtn.disabled = false;
        document.getElementById('action-hint').textContent = '✅ Recorded! Hit "Submit Answer" for instant analysis.';
    };

    mediaRecorder.start();

    // Visual: switch to RECORDING state
    recordActionBtn.querySelector('span').textContent = '■ Stop Recording';
    recordActionBtn.classList.remove('ready-to-record');
    recordActionBtn.classList.add('recording');
    recordActionBtn.querySelector('i').setAttribute('data-lucide', 'square');
    micGlowCircle.classList.add('active');
    document.getElementById('action-hint').textContent = `🔴 Recording... Speak your answer, ${sessionConfig.candidateName}.`;
    lucide.createIcons();

    if (audioContext && audioContext.state === 'suspended') audioContext.resume();
    updateWaveformBars();
}

function stopRecordingSpeech() {
    if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
    if (frameIntervalId) clearInterval(frameIntervalId);
    if (timerIntervalId) clearInterval(timerIntervalId);
    recordingTimer.style.display = 'none';

    if (browserSpeechRecognition) {
        try {
            browserSpeechRecognition.stop();
            console.log('Local speech recognition stopped');
        } catch (e) {
            console.warn('Recognition stop warning:', e);
        }
    }

    // Visual: back to ready state
    recordActionBtn.querySelector('span').textContent = 'Re-record';
    recordActionBtn.classList.remove('recording');
    recordActionBtn.classList.add('ready-to-record');
    recordActionBtn.querySelector('i').setAttribute('data-lucide', 'rotate-ccw');
    lucide.createIcons();
}

function captureVideoSnapshot() {
    if (!webcamView || !snapshotCanvas) return;
    const ctx = snapshotCanvas.getContext('2d');
    snapshotCanvas.width = 320;
    snapshotCanvas.height = 240;
    ctx.translate(snapshotCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(webcamView, 0, 0, snapshotCanvas.width, snapshotCanvas.height);
    recordedFrames.push(snapshotCanvas.toDataURL('image/jpeg', 0.4));
}

// ═══════ SUBMIT ANSWER (with timeout + progress) ═══════
async function submitAnswerForAnalysis() {
    submitAnswerBtn.disabled = true;
    recordActionBtn.disabled = true;
    processingLoader.querySelector('p').textContent = '⚡ Analyzing your response...';
    processingLoader.querySelector('.sub-loader-text').textContent = 'Step 1/2: Whisper transcription...';
    processingLoader.style.display = 'flex';

    try {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

        // Validate audio
        if (audioBlob.size < 100) {
            throw new Error('Audio recording is too short or empty. Please try recording again.');
        }

        const formData = new FormData();
        formData.append('audio', audioBlob, 'answer.webm');
        formData.append('candidate_name', sessionConfig.candidateName);
        formData.append('role', sessionConfig.role);
        formData.append('level', sessionConfig.level);
        formData.append('company', sessionConfig.company);
        formData.append('job_description', sessionConfig.jobDescription);
        formData.append('question', currentQuestionText);
        formData.append('interviewer_name', sessionConfig.interviewerName);
        formData.append('browser_transcript', browserTranscriptText.trim());
        formData.append('custom_api_key', customApiKey);

        const codeSandbox = document.getElementById('code-sandbox-editor');
        formData.append('code_sample', codeSandbox ? codeSandbox.value : '');

        // Send max 2 frames to keep it fast
        formData.append('images', JSON.stringify(recordedFrames.slice(0, 2)));

        // Update loader text
        setTimeout(() => {
            const sub = processingLoader.querySelector('.sub-loader-text');
            if (sub) sub.textContent = 'Step 2/2: GPT analyzing your answer...';
        }, 3000);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000); // 45s max

        const res = await fetch('/api/analyze-answer', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.error || `Server error ${res.status}`);
        }

        const feedback = await res.json();

        sessionHistory.push({
            question_num: currentQuestionIndex,
            question: currentQuestionText,
            answer_transcript: feedback.transcript,
            technical_score: feedback.technical_score,
            communication_score: feedback.communication_score,
            body_language_score: feedback.body_language_score,
            filler_words: feedback.filler_words,
            improved_answer: feedback.improved_answer,
            technical_feedback: feedback.technical_feedback,
            communication_feedback: feedback.communication_feedback,
            body_language_feedback: feedback.body_language_feedback
        });

        renderQuestionFeedback(feedback);

    } catch (err) {
        console.error('Submit error:', err);
        if (err.name === 'AbortError') {
            alert('Analysis timed out after 45 seconds. This may be due to OpenAI API load. Please try again.');
        } else {
            alert(`Analysis Error: ${err.message}`);
        }
        resetAnsweringState();
    } finally {
        processingLoader.style.display = 'none';
    }
}

// ═══════ FEEDBACK ═══════
function renderQuestionFeedback(feedback) {
    setGaugeRotation('tech', feedback.technical_score);
    setGaugeRotation('comm', feedback.communication_score);

    transcriptReview.innerHTML = `"${highlightFillers(feedback.transcript, feedback.filler_words)}"`;

    fillersContainer.innerHTML = '';
    if (feedback.filler_words && feedback.filler_words.length > 0) {
        feedback.filler_words.forEach(fw => {
            const s = document.createElement('span');
            s.className = 'pill';
            s.textContent = `"${fw.word}" ×${fw.count}`;
            fillersContainer.appendChild(s);
        });
    } else {
        fillersContainer.innerHTML = '<span style="color: var(--success); font-size: 13px; font-weight: 700;">Zero filler words — outstanding! 🎯</span>';
    }

    techCritique.innerHTML = parseMD(feedback.technical_feedback);
    commCritique.innerHTML = parseMD(feedback.communication_feedback);
    bodyCritique.innerHTML = parseMD(feedback.body_language_feedback);
    expertPhrasing.textContent = feedback.improved_answer;

    feedbackScreen.style.display = 'flex';
    lucide.createIcons();

    speakResponse(`${sessionConfig.candidateName}, you scored ${feedback.technical_score} percent technically and ${feedback.communication_score} on communication. Let's review the details!`);
}

function highlightFillers(transcript, fillerWords) {
    if (!fillerWords || !fillerWords.length) return transcript || '';
    let t = transcript;
    fillerWords.forEach(fw => {
        t = t.replace(new RegExp(`\\b(${fw.word})\\b`, 'gi'),
            '<mark style="background:rgba(255,71,87,0.25);color:#ff6b6b;padding:1px 4px;border-radius:3px;font-weight:700;">$1</mark>');
    });
    return t;
}

function setGaugeRotation(sel, score) {
    document.getElementById(`${sel}-gauge-value`).textContent = `${score}%`;
    document.getElementById(`${sel}-gauge-circle`).style.strokeDashoffset = 251.2 - (251.2 * score) / 100;
}

function parseMD(md) {
    if (!md) return '<p style="color:var(--text-muted)">No details.</p>';
    let h = md.replace(/\n*-\s*(.+)/g, '<li>$1</li>');
    return h.includes('<li>') ? `<ul>${h}</ul>` : `<p>${md}</p>`;
}

// ═══════ NEXT QUESTION ═══════
function proceedToNextQuestion() {
    window.speechSynthesis.cancel();
    feedbackScreen.style.display = 'none';
    const sb = document.getElementById('code-sandbox-editor');
    if (sb) sb.value = '';

    if (currentQuestionIndex < maxQuestions) {
        currentQuestionIndex++;
        getNextQuestion();
    } else {
        finishInterviewSession();
    }
}

// ═══════ RESULTS ═══════
function finishInterviewSession() {
    feedbackScreen.style.display = 'none';
    interviewScreen.classList.remove('active');
    resultsScreen.classList.add('active');

    const subtitle = document.getElementById('results-subtitle');
    if (subtitle) subtitle.textContent = `Well done, ${sessionConfig.candidateName}! Here's your ${sessionConfig.role} interview performance at ${sessionConfig.company}.`;

    if (!sessionHistory.length) {
        questionsSummaryLog.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)"><p>No answers recorded.</p><button onclick="restartSession()" class="btn btn-primary" style="margin-top:16px">Try Again</button></div>';
        return;
    }

    let sT = 0, sC = 0, sB = 0, sF = 0;
    sessionHistory.forEach(s => {
        sT += s.technical_score; sC += s.communication_score; sB += s.body_language_score;
        if (s.filler_words) s.filler_words.forEach(fw => sF += fw.count);
    });

    const n = sessionHistory.length;
    const aT = Math.round(sT / n), aC = Math.round(sC / n), aB = Math.round(sB / n);
    const overall = Math.round((aT + aC + aB) / 3);

    overallTotalScore.textContent = `${overall}%`;
    overallTotalFillers.textContent = sF;
    overallBodyScore.textContent = `${aB}%`;

    overallRank.textContent = overall >= 85 ? "Interview Ready 🔥" : overall >= 70 ? "Competent ✅" : overall >= 50 ? "Keep Practicing 📈" : "Needs Work 💪";

    questionsSummaryLog.innerHTML = '';
    sessionHistory.forEach(h => {
        const d = document.createElement('div');
        d.className = 'log-item';
        d.innerHTML = `
            <div class="log-title" onclick="this.parentElement.classList.toggle('open')">
                <span>Q${h.question_num}: ${h.question.substring(0, 55)}${h.question.length > 55 ? '...' : ''}</span>
                <span class="log-score-tag">${h.technical_score}%</span>
            </div>
            <div class="log-content">
                <div class="log-field"><h5>Your Answer:</h5><p style="font-style:italic">"${h.answer_transcript || 'No voice.'}"</p></div>
                <div class="log-field"><h5>Expert Answer:</h5><p style="color:var(--success);font-size:13px">${h.improved_answer}</p></div>
                <div class="log-field"><h5>Technical Feedback:</h5><div>${parseMD(h.technical_feedback)}</div></div>
            </div>`;
        questionsSummaryLog.appendChild(d);
    });

    renderChart(sessionHistory);
    lucide.createIcons();
}

// ═══════ Chart ═══════
let sessionChart = null;
function renderChart(history) {
    const ctx = document.getElementById('resultsChart').getContext('2d');
    if (sessionChart) sessionChart.destroy();

    sessionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: history.map(h => `Q${h.question_num}`),
            datasets: [
                { label: 'Technical', data: history.map(h => h.technical_score), borderColor: '#00d2ff', backgroundColor: 'rgba(0,210,255,0.08)', tension: 0.4, fill: true, pointRadius: 6, pointHoverRadius: 9, pointBackgroundColor: '#00d2ff' },
                { label: 'Communication', data: history.map(h => h.communication_score), borderColor: '#8c52ff', backgroundColor: 'rgba(140,82,255,0.08)', tension: 0.4, fill: true, pointRadius: 6, pointHoverRadius: 9, pointBackgroundColor: '#8c52ff' },
                { label: 'Body Language', data: history.map(h => h.body_language_score), borderColor: '#2ed573', backgroundColor: 'rgba(46,213,115,0.08)', tension: 0.4, fill: true, pointRadius: 6, pointHoverRadius: 9, pointBackgroundColor: '#2ed573' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#f0f1f5', font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' }, padding: 16, usePointStyle: true } } },
            scales: {
                y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#9ba3b5' } },
                x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#9ba3b5' } }
            }
        }
    });
}

// ═══════ RESTART ═══════
function restartSession() {
    window.speechSynthesis.cancel();
    resultsScreen.classList.remove('active');
    onboardingScreen.classList.add('active');
    if (frameIntervalId) clearInterval(frameIntervalId);
    if (timerIntervalId) clearInterval(timerIntervalId);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    currentQuestionIndex = 1;
    sessionHistory = [];
    lucide.createIcons();
}

// ═══════ TTS — ENERGETIC VOICE SELECTION ═══════
function speakResponse(text, callback) {
    if (!('speechSynthesis' in window)) { if (callback) callback(); return; }

    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);

    // Energetic, charming, positive delivery
    utt.rate = 1.08;   // Slightly faster = energetic and engaging
    utt.volume = 1.0;

    const isFemale = sessionConfig.interviewerGender === 'female';
    utt.pitch = isFemale ? 1.15 : 0.98; // Charming/warm pitch values

    // Refresh voices list dynamically if needed
    const voices = (cachedVoices && cachedVoices.length > 0) ? cachedVoices : window.speechSynthesis.getVoices();
    let picked = null;

    if (isFemale) {
        // Priya's Voice: Priority charming english/female voices
        picked = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Jenny') || v.name.includes('Aria') || v.name.includes('Neerja')));
        if (!picked) picked = voices.find(v => v.name.includes('Google US English'));
        if (!picked) picked = voices.find(v => v.name.includes('Google UK English Female'));
        if (!picked) picked = voices.find(v => v.name.includes('Samantha'));
        if (!picked) picked = voices.find(v => v.name.includes('Microsoft Zira') && v.lang.startsWith('en'));
        if (!picked) picked = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'));
    } else {
        // Arjun's Voice: Priority positive english/male voices
        picked = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Guy') || v.name.includes('Prabhat') || v.name.includes('Daniel') || v.name.includes('James')));
        if (!picked) picked = voices.find(v => v.name.includes('Google US English Male'));
        if (!picked) picked = voices.find(v => v.name.includes('Google UK English Male'));
        if (!picked) picked = voices.find(v => v.name.includes('Microsoft David') && v.lang.startsWith('en'));
        if (!picked) picked = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male'));
    }

    // Final fallback: any good English voice or natural voice
    if (!picked) {
        picked = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Natural')));
    }
    if (!picked) {
        picked = voices.find(v => v.lang.startsWith('en'));
    }

    if (picked) {
        utt.voice = picked;
        console.log(`TTS voice selected: ${picked.name} (${picked.lang})`);
    }

    const avatar = document.querySelector('.avatar-speaker');
    if (avatar) avatar.classList.add('talking');

    utt.onend = () => { if (avatar) avatar.classList.remove('talking'); if (callback) callback(); };
    utt.onerror = (e) => { console.warn('TTS error:', e); if (avatar) avatar.classList.remove('talking'); if (callback) callback(); };

    window.speechSynthesis.speak(utt);
}

// ═══════ Download Report ═══════
function downloadPerformanceReport() {
    if (!sessionHistory.length) return;

    let r = `# Namaste Coach — Interview Report\n**Generated:** ${new Date().toLocaleString()}\n\n---\n\n`;
    r += `## Session\n- **Candidate:** ${sessionConfig.candidateName}\n- **Role:** ${sessionConfig.level} ${sessionConfig.role}\n- **Company:** ${sessionConfig.company}\n- **Interviewer:** ${sessionConfig.interviewerName}\n\n`;

    let sT = 0, sC = 0, sB = 0, sF = 0;
    sessionHistory.forEach(s => { sT += s.technical_score; sC += s.communication_score; sB += s.body_language_score; if (s.filler_words) s.filler_words.forEach(fw => sF += fw.count); });
    const n = sessionHistory.length;

    r += `## Scores\n| Metric | Score |\n|---|---|\n| Overall | ${Math.round((Math.round(sT/n) + Math.round(sC/n) + Math.round(sB/n)) / 3)}% |\n| Technical | ${Math.round(sT/n)}% |\n| Communication | ${Math.round(sC/n)}% |\n| Body Language | ${Math.round(sB/n)}% |\n| Filler Words | ${sF} |\n\n---\n\n`;

    sessionHistory.forEach(h => {
        r += `### Q${h.question_num}: ${h.question}\n**Answer:** "${h.answer_transcript || 'N/A'}"\n**Scores:** Tech ${h.technical_score}% | Comm ${h.communication_score}% | Body ${h.body_language_score}%\n\n`;
        r += `#### Technical\n${h.technical_feedback}\n\n#### Communication\n${h.communication_feedback}\n\n#### Body Language\n${h.body_language_feedback}\n\n#### Expert Answer\n> ${h.improved_answer}\n\n---\n\n`;
    });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([r], { type: 'text/markdown' }));
    a.download = `NamasteCoach_${sessionConfig.candidateName.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
