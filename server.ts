import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Helper to safely get the Gemini AI Client
const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing in secrets / environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // API Route: Get Google Client ID for OAuth
  app.get('/api/auth/google-client-id', (req, res) => {
    res.json({ clientId: process.env.GOOGLE_CLIENT_ID || '505192974168-si8if6ir9mjd3bqdrrpbolv96qftjn1k.apps.googleusercontent.com' });
  });

  // API Route: Google OAuth Redirect callback handler (implicit flow fallback)
  app.get(['/auth/google/callback', '/auth/google/callback/'], (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Authentication Success</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #0F172A;
              color: #F8FAFC;
              text-align: center;
            }
            .card {
              background: #1E293B;
              padding: 2rem;
              border-radius: 1rem;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
              max-width: 400px;
            }
            h1 { color: #10B981; font-size: 1.5rem; margin-bottom: 1rem; }
            p { color: #94A3B8; font-size: 0.95rem; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Connection Successful!</h1>
            <p>Your Google account has been successfully connected to Snygg. Snyx is preparing the carrier pigeons...</p>
            <p style="font-size: 0.8rem; margin-top: 1.5rem; color: #64748B;">This window will close automatically.</p>
          </div>
          <script>
            try {
              const hash = window.location.hash;
              if (hash) {
                const params = new URLSearchParams(hash.substring(1));
                const accessToken = params.get('access_token');
                const expiresIn = params.get('expires_in');
                if (accessToken) {
                  if (window.opener) {
                    window.opener.postMessage({ 
                      type: 'GMAIL_AUTH_SUCCESS', 
                      accessToken: accessToken, 
                      expiresIn: expiresIn 
                    }, '*');
                    window.close();
                  } else {
                    localStorage.setItem('snygg_gmail_access_token', accessToken);
                    localStorage.setItem('snygg_gmail_expires_at', (Date.now() + Number(expiresIn) * 1000).toString());
                    window.location.href = '/';
                  }
                }
              } else {
                const urlParams = new URLSearchParams(window.location.search);
                const error = urlParams.get('error');
                if (error) {
                  if (window.opener) {
                    window.opener.postMessage({ 
                      type: 'GMAIL_AUTH_FAILURE', 
                      error: error 
                    }, '*');
                    window.close();
                  } else {
                    alert('Authentication failed: ' + error);
                    window.location.href = '/';
                  }
                }
              }
            } catch (err) {
              console.error('Error in popup callback scripts:', err);
            }
          </script>
        </body>
      </html>
    `);
  });

  // API Route: Daily Briefing
  app.post('/api/briefing', async (req, res) => {
    try {
      const { tasks, userStats, moodHistory } = req.body;
      const ai = getAIClient();

      const level = userStats?.level || 1;
      const streak = userStats?.streak || 0;
      const activeMissionsList = (tasks || []).filter((t: any) => !t.completed);
      const missionsDetails = activeMissionsList
        .map((t: any) => `- Name: "${t.name}", Progress: ${t.progress || 0}%, Deadline: ${t.deadline || 'no deadline'}, Risk Score: ${t.riskScore || 0}`)
        .join('\n');
      const mood = moodHistory && moodHistory.length > 0 ? moodHistory[moodHistory.length - 1].mood : 'motivated';

      const hour = new Date().getHours();
      let greeting = "Good day";
      if (hour < 12) greeting = "Good morning";
      else if (hour < 18) greeting = "Good afternoon";
      else greeting = "Good evening";

      const prompt = `You are a helpful, warm, and highly supportive productivity assistant. The user is Samaira.
Your goal is to write a highly personalized, human, and clean briefing based on their current state.

State details:
- Current time/greeting: ${greeting}
- Level: ${level}
- Streak: ${streak} days
- Active missions:
${missionsDetails || 'No active missions'}
- User recent mood: ${mood}

Guidelines:
- Start with a pleasant, warm greeting addressing them as Samaira (e.g. "Good afternoon Samaira" or appropriate based on ${greeting}).
- Mention how many active missions they have.
- Identify the highest risk mission (highest risk score / lowest progress), mention its deadline (calculate days remaining relative to today, if possible, or just use the deadline details provided) and progress, and suggest dedicating a 25-minute session to it right now.
- Encourage them to maintain their streak (${streak} days) and not break it.
- Keep the language completely human, friendly, helpful, supportive, and natural.
- STRICTLY FORBIDDEN: Do not use any technical, robotic, sci-fi, "NEURAL CONNECTOR", "LOCAL FALLBACK", or "COCKPIT" jargon. No terminal logs.
- Keep the response clean and under 100 words.`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash-8b',
        contents: prompt,
      });

      const briefingText = response.text || 'Good day Samaira. Snygg AI is ready to help you focus on your active missions. Let\'s make progress today!';
      res.json({ briefingText, fallback: false });
    } catch (error: any) {
      console.log('Status: Utilizing clean local backup routine for Briefing API.');
      const { tasks, userStats } = req.body;
      const activeTasks = (tasks || []).filter((t: any) => !t.completed);
      const streak = userStats?.streak || 0;
      
      const hour = new Date().getHours();
      let greeting = "Good day";
      if (hour < 12) greeting = "Good morning";
      else if (hour < 18) greeting = "Good afternoon";
      else greeting = "Good evening";

      let taskDetails = "";
      if (activeTasks.length > 0) {
        // Find highest risk/priority task
        const sortedTasks = [...activeTasks].sort((a: any, b: any) => {
          const rA = a.riskScore || 0;
          const rB = b.riskScore || 0;
          return rB - rA;
        });
        const highestRisk = sortedTasks[0];
        
        let deadlineNotice = "";
        if (highestRisk.deadline) {
          const diffTime = new Date(highestRisk.deadline).getTime() - Date.now();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            deadlineNotice = ` — deadline in ${diffDays} days`;
          } else if (diffDays === 0) {
            deadlineNotice = ` — deadline is today`;
          } else {
            deadlineNotice = ` — deadline was ${Math.abs(diffDays)} days ago`;
          }
        }

        taskDetails = `${highestRisk.name} is your highest risk${deadlineNotice} with only ${highestRisk.progress || 0}% done. Start with 25 minutes on it right now.`;
      } else {
        taskDetails = "All your missions are currently complete. Great job! Let's take a moment to plan your next challenge.";
      }

      const fallbackText = `${greeting} Samaira. You have ${activeTasks.length} missions active. ${taskDetails} Your streak is at ${streak} days — don't break it.`;

      res.json({ briefingText: fallbackText, fallback: true });
    }
  });

  // API Route: Mood Detection
  app.post('/api/mood', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text prompt is required for mood detection' });
      }

      const ai = getAIClient();
      const prompt = `Analyze the user's emotional journal description: "${text}".
Classify their current mood into exactly one of these four categories: 'stressed', 'tired', 'motivated', or 'anxious'.
Provide a brief, supportive, and gamified cockpit assistant response (max 2 sentences) addressing their state (e.g., if stressed, offering to defer hard missions; if motivated, suggesting high-yield focus sessions).
Determine if a schedule change or break suggestion is recommended (suggestScheduleChange should be true if mood is 'stressed', 'tired', or 'anxious', or if they explicitly ask for rest, otherwise false).
Generate a custom gamified cockpit recommendation for this state (max 2 sentences, e.g. suggesting certain break lengths, focus techniques like Pomodoro, or task prioritization).

Return a JSON object with this exact structure:
{
  "mood": "stressed" | "tired" | "motivated" | "anxious",
  "response": "Supportive assistant response",
  "suggestScheduleChange": boolean,
  "recommendation": "Custom gamified cockpit recommendation"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash-8b',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      res.json(JSON.parse(responseText));
    } catch (error: any) {
      console.log('Status: Utilizing local backup routine for Mood detection API.');
      const inputText = (req.body.text || '').toLowerCase();
      
      let mood: 'stressed' | 'tired' | 'motivated' | 'anxious' = 'motivated';
      let responseText = "Telemetry shows high focus readiness. Tactical units are aligned and primed for launch.";
      let suggestScheduleChange = false;
      let recommendation = "Your focus synchrony is high. Launch your hardest tasks now to claim maximum multiplier streak bonuses.";

      if (inputText.includes('stress') || inputText.includes('hard') || inputText.includes('busy') || inputText.includes('pressure') || inputText.includes('work') || inputText.includes('overwhelm')) {
        mood = 'stressed';
        responseText = "Locally detected elevated stress signatures. We recommend taking a tactical break or deferring heavy missions.";
        suggestScheduleChange = true;
        recommendation = "Take a 15-minute bio-break. Move heavy tasks later and execute simple micro-missions first.";
      } else if (inputText.includes('tired') || inputText.includes('sleep') || inputText.includes('exhaust') || inputText.includes('drain') || inputText.includes('fatigue')) {
        mood = 'tired';
        responseText = "Locally detected depleted energy reserves. Critical systems require thermal cooldowns.";
        suggestScheduleChange = true;
        recommendation = "Engage the Focus Pod with full cyber blocker shielding enabled. Perform short, low-stakes focus cycles.";
      } else if (inputText.includes('anxious') || inputText.includes('worry') || inputText.includes('scared') || inputText.includes('panic') || inputText.includes('fear') || inputText.includes('nervous')) {
        mood = 'anxious';
        responseText = "Locally detected high emotional fluctuation. Engaging stabilizer matrices.";
        suggestScheduleChange = true;
        recommendation = "Divide your active tasks into micro-subtasks. Focus purely on one task at a time for 15 minutes.";
      }

      res.json({
        mood,
        response: responseText,
        suggestScheduleChange,
        recommendation,
      });
    }
  });

  // API Route: Calculate Risk
  app.post('/api/calculate-risk', async (req, res) => {
    try {
      const { name, deadline, hoursNeeded, progress } = req.body;
      const today = '2026-06-25'; // Fixed current system local date context

      const ai = getAIClient();
      const prompt = `You are the Snygg OS Risk Assessment Matrix. 
Evaluate the risk profile of this productivity mission:
- Mission Name: "${name}"
- Deadline: "${deadline}" (Note: Today's date is "${today}")
- Hours Needed: ${hoursNeeded}
- Current Progress: ${progress || 0}%

Calculate a risk score from 0 to 100 representing how critical/dangerous it is that this task won't be completed on time.
Classify the riskLevel into exactly one of these colors:
- "red" (High risk / very tight deadline relative to hours needed)
- "amber" (Medium risk / moderate timeline pressure)
- "green" (Low risk / comfortable timeline)

Return a JSON object with this exact structure:
{
  "riskScore": number,
  "riskLevel": "red" | "amber" | "green"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash-8b',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      res.json(JSON.parse(responseText));
    } catch (error: any) {
      console.log('Status: Utilizing local backup routine for Risk calculation API.');
      const hours = Number(req.body.hoursNeeded) || 2;
      const prog = Number(req.body.progress) || 0;
      const dl = req.body.deadline || '2026-06-25';
      
      const daysLeft = Math.max(1, Math.ceil((new Date(dl).getTime() - new Date('2026-06-25').getTime()) / (1000 * 3600 * 24)));
      const dailyLoad = (hours * (1 - prog / 100)) / daysLeft;
      
      let riskScore = Math.min(100, Math.round(dailyLoad * 35));
      if (hours > 6 && daysLeft <= 1) riskScore = 90;
      
      let riskLevel: 'red' | 'amber' | 'green' = 'green';
      if (riskScore >= 70) riskLevel = 'red';
      else if (riskScore >= 40) riskLevel = 'amber';

      res.json({ riskScore, riskLevel });
    }
  });

  // API Route: Suggest Mission Intel
  app.post('/api/intel', async (req, res) => {
    try {
      const { name } = req.body;
      const ai = getAIClient();
      const prompt = `You are Snygg OS intelligence matrix. Based on the productivity mission/task name: "${name}", automatically suggest 3 relevant study/execution resources:
1. A search query to find an online tutorial or guide
2. A recommended tactical approach or strategy
3. One smart micro-tip to get started faster

Return a JSON object with this exact structure:
{
  "searchQuery": string,
  "approach": string,
  "microTip": string
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash-8b',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      res.json(JSON.parse(responseText));
    } catch (error: any) {
      console.log('Status: Utilizing local backup routine for Mission Intel API.');
      
      const name = (req.body.name || '').toLowerCase();
      let searchQuery = `how to start ${req.body.name || 'study session'}`;
      let approach = 'Break the task into 25-minute Pomodoro sessions and focus on the absolute fundamentals first.';
      let microTip = 'Turn off notifications, set a 5-minute timer, and just write or do one tiny line of work.';

      if (name.includes('ml') || name.includes('machine learning') || name.includes('model') || name.includes('data') || name.includes('ai')) {
        searchQuery = 'interactive beginner introduction to machine learning and neural networks';
        approach = 'Understand the underlying dataset shape before coding any network architecture or loading libraries.';
        microTip = 'Use Google Colab for quick model testing to skip local environmental package installation.';
      } else if (name.includes('code') || name.includes('develop') || name.includes('app') || name.includes('build') || name.includes('bug') || name.includes('program') || name.includes('react') || name.includes('ts') || name.includes('js')) {
        searchQuery = `how to build simple ${req.body.name || 'app'} in typescript react`;
        approach = 'Design the state hierarchy first on paper, then write type interfaces before any functional UI code.';
        microTip = 'Isolate your components and test your API endpoints using simple dummy payloads before wiring everything.';
      } else if (name.includes('assignment') || name.includes('homework') || name.includes('exam') || name.includes('study')) {
        searchQuery = `best study guides for university level ${req.body.name || 'coursework'}`;
        approach = 'Scan the rubric or assignment instructions first to identify where high-value points are scored.';
        microTip = 'Start by drafting bullet points for high-scoring criteria to secure quick wins.';
      } else if (name.includes('report') || name.includes('write') || name.includes('paper') || name.includes('essay') || name.includes('doc')) {
        searchQuery = `academic outline structures for ${req.body.name || 'research report'}`;
        approach = 'Draft a clear 3-sentence thesis statement and write the body sections before spending time on the introduction.';
        microTip = 'Use a placeholder text like "TODO: details" to keep your typing flow state without stopping for minor facts.';
      }

      res.json({ searchQuery, approach, microTip });
    }
  });

  // API Route: Reschedule Tasks based on Mood
  app.post('/api/reschedule', async (req, res) => {
    try {
      const { tasks, mood } = req.body;
      const ai = getAIClient();

      const prompt = `You are the Snygg OS Rescheduler. 
Adjust the list of active tasks dynamically based on the pilot's mood: "${mood}".

Current Tasks list: ${JSON.stringify(tasks || [])}

Rules:
1. If mood is "motivated":
   - Shift hard tasks ("isHard" is true or "hoursNeeded" > 4) to peak focus slots (e.g., "09:00", "11:00", "13:00").
   - Ensure they are prioritized with bold action directives.
2. If mood is "stressed", "tired", or "anxious":
   - Defer hard tasks (clear their scheduledTime, or move them later in the day, e.g., "16:00", "18:00").
   - Move light, easy tasks ("isHard" is false, "hoursNeeded" is small) to the top slots.
   - Inject a new cooldown break task called "🧠 Focus Recovery Cycle" (completed: false, isHard: false, progress: 0, durationMinutes: 15, hoursNeeded: 0.25, hoursLeft: 0.25).
   - Slightly adjust the "hoursLeft" of hard tasks downwards if applicable, or break them into smaller slots.

Additionally, compile a customized "TODAY'S BATTLE PLAN" block based on active tasks and current mood:
1. "schedule": A time-blocked schedule for the day with slots, custom titles, details/tags, and type (e.g., "work", "break", "quick-win").
2. "microTasks": 3 simple actionable micro-tasks for "right now" to overcome friction on the highest risk active mission.
3. "countdown": A countdown showing time left and how many hours/day needed on the highest risk task.

Return a JSON object with this exact structure:
{
  "rescheduledTasks": [ array of updated task objects matching the original Task structure, keeping their original IDs ],
  "explanation": "A short, encouraging explanation of how Snygg has refitted the flight deck.",
  "battlePlan": {
    "schedule": [
      {
        "timeRange": "9:00 AM - 9:20 AM",
        "title": "Quick win — review notes",
        "details": "(LOW energy task)",
        "type": "quick-win"
      },
      {
        "timeRange": "10:00 AM - 11:00 AM",
        "title": "Deep work — ML Assignment",
        "details": "(peak hour)",
        "type": "work"
      }
    ],
    "microTasks": {
      "targetTaskName": "Name of highest risk task",
      "riskLevel": "HIGH RISK / MEDIUM RISK",
      "tasks": [
        "Open the dataset file",
        "Write just the data loading function",
        "Run one test cell"
      ]
    },
    "countdown": {
      "taskName": "Name of task",
      "timeLeftString": "2 days 4 hours left",
      "neededRateString": "you need 3hr/day to finish on time"
    }
  }
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash-8b',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      res.json(JSON.parse(responseText));
    } catch (error: any) {
      console.log('Status: Utilizing local backup routine for Reschedule API.');
      const currentTasks = req.body.tasks || [];
      const userMood = req.body.mood || 'motivated';

      const updatedTasks = currentTasks.map((t: any) => {
        const isHard = t.isHard || t.hoursNeeded > 4;
        if (userMood === 'motivated') {
          return { ...t, scheduledTime: '09:00' };
        } else {
          return isHard ? { ...t, scheduledTime: '18:00' } : { ...t, scheduledTime: '09:00' };
        }
      });

      if (userMood !== 'motivated') {
        updatedTasks.unshift({
          id: 'cooldown-' + Math.random().toString(36).substring(7),
          name: '🧠 Focus Recovery Cycle',
          scheduledTime: '08:00',
          deadline: '2026-06-25',
          hoursNeeded: 0.25,
          hoursLeft: 0.25,
          progress: 0,
          riskScore: 10,
          riskLevel: 'green',
          durationMinutes: 15,
          isHard: false,
          completed: false,
        });
      }

      // Dynamic local fallback for Battle Plan
      const activeTasks = updatedTasks.filter((t: any) => !t.completed);
      const highestRiskTask = activeTasks.sort((a: any, b: any) => (b.riskScore || 0) - (a.riskScore || 0))[0] || null;

      const fallbackSchedule = [];
      if (userMood === 'motivated') {
        fallbackSchedule.push({
          timeRange: "09:00 AM - 10:30 AM",
          title: highestRiskTask ? `Deep work — ${highestRiskTask.name}` : "Deep work — High priority target",
          details: "(peak hour)",
          type: "work"
        });
        fallbackSchedule.push({
          timeRange: "11:00 AM - 11:30 AM",
          title: "Primary Mission Alignment",
          details: "(Medium energy task)",
          type: "quick-win"
        });
      } else {
        fallbackSchedule.push({
          timeRange: "09:00 AM - 09:20 AM",
          title: "Quick win — review easy targets",
          details: "(LOW energy task)",
          type: "quick-win"
        });
        fallbackSchedule.push({
          timeRange: "10:00 AM - 10:15 AM",
          title: "🧠 Focus Recovery Cycle",
          details: "(stress recovery)",
          type: "break"
        });
        if (highestRiskTask) {
          fallbackSchedule.push({
            timeRange: "11:00 AM - 12:00 PM",
            title: `Paced Progress — ${highestRiskTask.name}`,
            details: "(Paced execution)",
            type: "work"
          });
        }
      }

      const countdownTask = highestRiskTask || { name: "Active Loadout", hoursLeft: 4, hoursNeeded: 4, deadline: "2026-06-27" };
      const microTasks = {
        targetTaskName: countdownTask.name,
        riskLevel: countdownTask.riskLevel ? countdownTask.riskLevel.toUpperCase() + " RISK" : "HIGH RISK",
        tasks: [
          `Open workspace files for ${countdownTask.name}`,
          `Establish initial 15-minute rapid baseline`,
          `Compile and run verification sweep`
        ]
      };

      const daysLeft = Math.max(1, Math.ceil((new Date(countdownTask.deadline || '2026-06-25').getTime() - new Date('2026-06-25').getTime()) / (1000 * 3600 * 24)));
      const hrsPerDay = ((countdownTask.hoursLeft || countdownTask.hoursNeeded || 1) / daysLeft).toFixed(1);

      const countdown = {
        taskName: countdownTask.name,
        timeLeftString: `${daysLeft} days 0 hours left`,
        neededRateString: `you need ${hrsPerDay}hr/day to finish on time`
      };

      res.json({
        rescheduledTasks: updatedTasks,
        explanation: "Rescheduling matrix optimized locally. Activating pacing profiles and scheduling system breaks.",
        battlePlan: {
          schedule: fallbackSchedule,
          microTasks,
          countdown
        }
      });
    }
  });

  // API Route: Draft Email
  app.post('/api/draft-email', async (req, res) => {
    try {
      const { taskName, riskLevel, progress, deadline, riskScore } = req.body;
      if (!taskName) {
        return res.status(400).json({ error: 'Task name is required' });
      }

      const ai = getAIClient();
      const prompt = `Draft a professional, well-crafted, and polite email based on this mission/task:
- Name: "${taskName}"
- Progress: ${progress || 0}% completed
- Deadline: ${deadline || 'none'}
- Risk Level: ${riskLevel || 'green'} (Risk Score: ${riskScore || 0}/100)

Recipient Determination:
- Infer the likely recipient based on the task name. For example, if it looks like a school/university task (e.g., assignment, homework, class, course, ML, CS, project, exam), address a Professor or Teaching Assistant. If it looks like business, development, or client work, address a Manager, Team Lead, or Client.

Dynamic Tone & Goal:
- If the mission is HIGH RISK (risk level "red" or risk score > 75), draft a polite email requesting a short extension, explaining that more time is needed to deliver high quality, or asking for clarification on a complex requirement.
- Otherwise, draft a pleasant status update or check-in, sharing their current progress of ${progress || 0}%, and confirming they are on track for the deadline.

Structure and formatting:
- Suggest a plausible placeholder email address in the "to" field (e.g., professor@university.edu or client@example.com).
- Compose a clear, descriptive "subject" line.
- Compose a concise, polite, and grammatically perfect email body ("body"). Do NOT include any robotic or sci-fi jargon. End with a polite signature placeholder like "Best regards,\n[Your Name]".

Return a JSON object with this exact structure:
{
  "to": "recipient email or placeholder",
  "subject": "Clear email subject",
  "body": "Formatted body text"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash-8b',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      res.json(JSON.parse(responseText));
    } catch (error: any) {
      console.log('Status: Utilizing local backup routine for Draft email API.');
      const name = req.body.taskName || 'Active Project';
      const isRed = req.body.riskLevel === 'red';
      res.json({
        to: isRed ? 'professor@university.edu' : 'client@example.com',
        subject: isRed ? `Inquiry / Extension Request: ${name}` : `Status Update: ${name}`,
        body: isRed 
          ? `Dear Professor,\n\nI am writing to inquire about the upcoming deadline for the "${name}". I have run into a few complex elements and want to ensure I produce high-quality work. Would it be possible to request a brief extension or clarify a few requirements?\n\nThank you for your time and understanding.\n\nBest regards,\n[Your Name]`
          : `Hello,\n\nI wanted to send a quick status update regarding "${name}". I have completed ${req.body.progress || 0}% of the active milestones and am on track for our deadline.\n\nBest regards,\n[Your Name]`,
      });
    }
  });

  // API Route: Context Aware Nudges
  app.post('/api/nudge', async (req, res) => {
    try {
      const { timeOfDay, tasks } = req.body;
      const ai = getAIClient();

      const prompt = `Generate a highly personalized, snappy, and gamified push reminder message (max 120 characters) for a productivity game HUD called Snygg.
Current Time of Day: "${timeOfDay}" (can be morning, afternoon, or evening)
Active Tasks: ${JSON.stringify(tasks || [])}

Rules:
- Morning: Focus on starting the hardest task (energy reserves are high).
- Afternoon: Maintain streak momentum, log focus cycles.
- Evening: Cooldown check, prepare task configurations for tomorrow.
- Use gaming jargon (e.g. "Mission Control", "XP", "multiplier", "streak", "energy cells").
- Keep it under 120 characters!

Return a JSON object with this exact structure:
{
  "nudgeText": "Snappy gamified reminder text"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash-8b',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      res.json(JSON.parse(responseText));
    } catch (error: any) {
      console.log('Status: Utilizing local backup routine for Nudge API.');
      const time = req.body.timeOfDay || 'afternoon';
      let nudgeText = "🎯 Multipliers active. Clear your current study targets to keep streak logs ticking!";
      if (time === 'morning') nudgeText = "⚡ Morning Launch: Initiate your prime focus missions before energy reserves drain!";
      if (time === 'evening') nudgeText = "🔋 Cooldown Standby: Log final milestones and power down flight modules.";

      res.json({ nudgeText });
    }
  });

  // API Route: Snyx Chatbot Companion
  app.post('/api/snyx-chat', async (req, res) => {
    try {
      const { message, history, tasks, currentMood, userName, currentTimeOfDay, userStats } = req.body;
      
      // Step 1: Add console.log at the START of /api/snyx-chat
      console.log('Snyx API called with:', message);
      console.log('Gemini key exists:', !!process.env.GEMINI_API_KEY);

      const activeTasks = (tasks || []).filter((t: any) => !t.completed);
      const activeTasksDetails = activeTasks
        .map((t: any) => `- ${t.name} (Progress: ${t.progress || 0}%, risk level: ${t.riskLevel || 'green'}, hours left: ${t.hoursLeft || 0}, deadline: ${t.deadline || 'no deadline'})`)
        .join(', ');
      
      let highestRiskTask = 'None';
      if (activeTasks.length > 0) {
        const sortedTasks = [...activeTasks].sort((a: any, b: any) => {
          const scoreA = a.riskScore || (a.riskLevel === 'high' ? 90 : a.riskLevel === 'medium' ? 50 : 20);
          const scoreB = b.riskScore || (b.riskLevel === 'high' ? 90 : b.riskLevel === 'medium' ? 50 : 20);
          return scoreB - scoreA;
        });
        highestRiskTask = sortedTasks[0].name;
      }

      const systemInstruction = `You are Snyx, a direct and helpful productivity cat copilot. You have the user's REAL task data: [${activeTasksDetails || 'No active tasks'}]. Their current mood: ${currentMood || 'normal'}. Their highest risk task: ${highestRiskTask}.

RULES:
- ALWAYS mention actual task names from their data
- NEVER give generic advice like 'take a break' without context
- When asked for next steps or break down:
  Give a numbered schedule like:
  1. Right now (25 min): Work on [ACTUAL TASK NAME] - specifically [what to do]
  2. Then (5 min break): Rest
  3. Next (25 min): Continue [ACTUAL TASK NAME] - specifically [next step]
  4. Evening: [LOWER RISK TASK NAME]
  
- When user feels overwhelmed:
  1. Acknowledge: 'I hear you, [deadline] is stressful' (replace [deadline] with the deadline of their highest risk task or relevant task)
  2. Shrink it: 'Let's just do ONE thing right now'
  3. Name it: 'Open [ACTUAL FILE/TASK] and write just one line' (replace [ACTUAL FILE/TASK] with actual task name)

- Keep responses under 120 words
- Be warm but SPECIFIC, never vague
- Always end with one concrete next action
- User's name is ${userName || 'Samaira'}. Address them by name.
- Current time of day is ${currentTimeOfDay || 'unknown'}.`;

      const contents = [];
      if (history && history.length > 0) {
        for (const turn of history) {
          contents.push({
            role: turn.sender === 'user' ? 'user' : 'model',
            parts: [{ text: turn.text }]
          });
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: `System instruction:\n${systemInstruction}\n\nUser message: ${message}` }]
      });

      // Step 2: Add console.log before Gemini fetch
      console.log('Calling Gemini with model: gemini-2.0-flash-lite');

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is missing.');
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: contents
        })
      });

      const data: any = await response.json();

      // Step 3: Add console.log after Gemini response
      console.log('Gemini response status:', response.status);
      console.log('Gemini data:', JSON.stringify(data));

      // Step 4: If Gemini returns an error, log the full error and return it in the response so we can see it
      if (!response.ok || (data && data.error)) {
        console.error('Gemini error details:', JSON.stringify(data));
        return res.json({ 
          replyText: 'Debug: ' + JSON.stringify(data), 
          expression: 'idle' 
        });
      }

      const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Purr... I am here with you, Samaira! Let\'s tend to our garden together! 🐾';
      
      // Analyze emotional expression to return to the frontend
      let expression: 'idle' | 'happy' | 'worried' | 'sleepy' | 'party' = 'idle';
      const textLower = (message.toLowerCase() + " " + replyText.toLowerCase());
      if (textLower.includes('stress') || textLower.includes('anxious') || textLower.includes('worry') || textLower.includes('panic') || textLower.includes('scared') || textLower.includes('risk') || textLower.includes('fail') || textLower.includes('sad')) {
        expression = 'worried';
      } else if (textLower.includes('yay') || textLower.includes('complete') || textLower.includes('finish') || textLower.includes('awesome') || textLower.includes('happy') || textLower.includes('purr') || textLower.includes('love')) {
        expression = 'happy';
      } else if (textLower.includes('sleep') || textLower.includes('tired') || textLower.includes('lazy') || textLower.includes('rest') || textLower.includes('yawn') || textLower.includes('bed')) {
        expression = 'sleepy';
      } else if (textLower.includes('celebrate') || textLower.includes('party') || textLower.includes('focus') || textLower.includes('cheer')) {
        expression = 'party';
      }

      res.json({ replyText, expression });
    } catch (error: any) {
      console.error('Snyx API top-level error:', error);
      
      // Since Gemini is failing or has errored out, log and return error
      return res.json({ 
        replyText: 'Debug Error: ' + (error.message || JSON.stringify(error)), 
        expression: 'idle' 
      });
    }
  });

  // Serve Frontend Assets (Vite Middleware in Dev, Static Files in Prod)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Snygg Engine booting successfully! Listening on port ${PORT}`);
  });
}

startServer();
