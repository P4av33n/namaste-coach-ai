# Namaste Coach AI — Personalized Interview Simulator

An advanced AI-powered technical interview simulator designed to conduct natural, personalized, and context-aware interviews. Built for the OpenAI × NamasteDev Hackathon, this tool overhauls standard rigid interview prep with a dynamic, immersive experience.

## 🚀 Key Features

*   **Custom Persona-based Onboarding:** Users can enter their Name, Target Role, Experience Level, Target Company, and optional Job Description. No rigid dropdown constraints.
*   **Warm & Natural Flow:** The AI interviewer (choose between **Priya Sharma** and **Arjun Mehta**) greets the candidate by name at the start and addresses them naturally throughout the conversation.
*   **Adaptive Contextual Engine:** Questions adapt automatically to the difficulty of your previous answer and align with the specific job description and company profile.
*   **Energetic & Charming Speech:** Integrated Text-to-Speech (TTS) engine with preloaded regional voice optimization, realistic pacing, and live talk-state avatar animation.
*   **Real-time Waveform & Pacing Timer:** Visual mic activity bars and pacing feedback system to help candidates gauge their response lengths.
*   **Code Sandbox:** Write and submit code snippets directly along with the audio answers for fully-evaluated technical assessment.
*   **Performance Analytics:** Detailed scores for Technical capability, Communication clarity, and body language (with visual snapshots), coupled with a downloadable Markdown performance summary dossier.

---

## 🛠️ Architecture & Tech Stack

- **Backend:** Flask (Python), OpenAI APIs (GPT-4o-mini for questions/evaluations, Whisper-1 for speech-to-text)
- **Frontend:** Vanilla JS, Tailwind-inspired Glassmorphism with CSS Mesh Aurora grids
- **State & Speech:** Web Speech Synthesis for high-fidelity interactive playback, MediaRecorder API for instant streaming

---

## 💻 Tech Setup & Installation

1. Clone or download the repository:
   ```bash
   git clone <your-repoic-url>
   cd hackathon
   ```

2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Configure your API key. Create a `.env` file in the root folder:
   ```env
   OPENAI_API_KEY=your_actual_openai_api_key
   ```

4. Run the server:
   ```bash
   python app.py
   ```
   Open `http://localhost:5000` in your web browser.

---

## 🏆 Submission Deliverables

- **Demo Link:** Hosted deployment platform (e.g. Render / Railway)
- **Demo Video:** Walkthrough showing onboarding config, camera feed permissions, real-time question generation, recording submission, and results dashboard.
