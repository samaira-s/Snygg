import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle, Mail, Send, RefreshCw, Clock, Trash2, Calendar, Sprout, Leaf, Sun, HelpCircle, ShieldAlert } from 'lucide-react';
import { type Task, type UserStats, type User } from '../types';
import Markdown from 'react-markdown';
import { audioSynth } from '../lib/audio';
import { getOrRefreshAccessToken } from '../lib/googleAuth';

interface DashboardProps {
  tasks: Task[];
  stats: UserStats;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  accessToken: string | null;
  onXPUnlock: (amount: number) => void;
  onLogin: (useRedirect?: boolean) => Promise<any>;
  user: User | null;
  onRedirectToLoadout: () => void;
  onTokenRefresh?: (token: string) => void;
}

export default function Dashboard({
  tasks,
  stats,
  onUpdateTask,
  onDeleteTask,
  accessToken,
  onXPUnlock,
  onLogin,
  user,
  onRedirectToLoadout,
  onTokenRefresh,
}: DashboardProps) {
  const [briefing, setBriefing] = useState<string>('');
  const [loadingBriefing, setLoadingBriefing] = useState<boolean>(false);
  const [isBriefingFallback, setIsBriefingFallback] = useState<boolean>(false);
  const [draftingEmailTaskId, setDraftingEmailTaskId] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ [taskId: string]: string }>({});

  // Email Draft Approval Modal States
  const [modalEmailTask, setModalEmailTask] = useState<Task | null>(null);
  const [modalTo, setModalTo] = useState<string>('');
  const [modalSubject, setModalSubject] = useState<string>('');
  const [modalBody, setModalBody] = useState<string>('');
  const [modalIsEditing, setModalIsEditing] = useState<boolean>(false);

  // Google Calendar Integration States
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState<boolean>(false);
  const [errorCalendar, setErrorCalendar] = useState<string>('');
  const [schedulingTaskId, setSchedulingTaskId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>('2026-06-25');
  const [scheduleTime, setScheduleTime] = useState<string>('09:00');
  const [scheduleDuration, setScheduleDuration] = useState<number>(1);
  const [syncingAll, setSyncingAll] = useState<boolean>(false);
  const [expandedIntel, setExpandedIntel] = useState<Record<string, boolean>>({});

  // Toast Notification States
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const toggleIntel = (taskId: string) => {
    setExpandedIntel(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const [calendarToken, setCalendarToken] = useState<string | null>(() => {
    return localStorage.getItem('gcal_token');
  });

  const [pendingAuth, setPendingAuth] = useState<{
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);

  const isCalendarAuthorized = !!calendarToken;

  const executeActualCalendarAuth = async (): Promise<string | null> => {
    return new Promise(async (resolve) => {
      let clientId = '505192974168-si8if6ir9mjd3bqdrrpbolv96qftjn1k.apps.googleusercontent.com';
      try {
        const res = await fetch('/api/auth/google-client-id');
        const data = await res.json();
        if (data.clientId) clientId = data.clientId;
      } catch (err) {}

      const checkGoogleLoaded = setInterval(() => {
        const google = (window as any).google;
        if (google?.accounts?.oauth2) {
          clearInterval(checkGoogleLoaded);
          try {
            const tokenClient = google.accounts.oauth2.initTokenClient({
              client_id: clientId,
              scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
              callback: (tokenResponse: any) => {
                if (tokenResponse.error) {
                  showToast('Could not link Google Calendar. Please try again.', 'error');
                  resolve(null);
                  return;
                }
                if (tokenResponse.access_token) {
                  localStorage.setItem('gcal_token', tokenResponse.access_token);
                  localStorage.setItem('gcal_token_time', Date.now().toString());
                  setCalendarToken(tokenResponse.access_token);
                  setErrorCalendar('');
                  fetchCalendarEvents(tokenResponse.access_token);
                  showToast('Successfully linked Google Calendar!', 'success');
                  resolve(tokenResponse.access_token);
                } else {
                  showToast('Could not link Google Calendar. Please try again.', 'error');
                  resolve(null);
                }
              }
            });
            tokenClient.requestAccessToken({ prompt: 'consent' });
          } catch (e) {
            showToast('Could not link Google Calendar. Please try again.', 'error');
            resolve(null);
          }
        }
      }, 100);

      // Safeguard: stop interval after 10 seconds if gsi script doesn't load
      setTimeout(() => {
        clearInterval(checkGoogleLoaded);
      }, 10000);
    });
  };

  const initCalendarAuth = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      setPendingAuth({
        onConfirm: async () => {
          setPendingAuth(null);
          const token = await executeActualCalendarAuth();
          resolve(token);
        },
        onCancel: () => {
          setPendingAuth(null);
          resolve(null);
        }
      });
    });
  };

  const getValidCalendarToken = async (): Promise<string | null> => {
    const token = localStorage.getItem('gcal_token');
    const tokenTimeStr = localStorage.getItem('gcal_token_time');
    
    if (token && tokenTimeStr) {
      const tokenTime = parseInt(tokenTimeStr, 10);
      // Expiry check (1 hour)
      if (Date.now() - tokenTime < 3500 * 1000) {
        return token;
      }
    }

    const confirmed = window.confirm('Your Google Calendar connection is expired or missing. Connect Google Calendar now?');
    if (confirmed) {
      return await initCalendarAuth();
    }
    return null;
  };

  const fetchCalendarEvents = async (passedToken?: string) => {
    const currentToken = passedToken || calendarToken || localStorage.getItem('gcal_token');
    if (!currentToken) {
      return;
    }

    setLoadingCalendar(true);
    setErrorCalendar('');
    try {
      const nowIso = new Date().toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=5&orderBy=startTime&singleEvents=true&timeMin=${nowIso}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      
      if (response.status === 401) {
        console.warn('Google Calendar connection expired.');
        localStorage.removeItem('gcal_token');
        localStorage.removeItem('gcal_token_time');
        setCalendarToken(null);
        setErrorCalendar('Google Calendar session has expired. Please click Connect to link your calendar again.');
        return;
      }

      if (!response.ok) throw new Error('Failed to retrieve Google Calendar feeds.');
      const data = await response.json();
      setCalendarEvents(data.items || []);
    } catch (err: any) {
      console.warn('Calendar API failed or access revoked:', err);
      setErrorCalendar('Unable to retrieve calendar feeds. Check internet or reconnect.');
    } finally {
      setLoadingCalendar(false);
    }
  };

  useEffect(() => {
    fetchCalendarEvents();
  }, [calendarToken]);

  const handleScheduleTaskOnCalendar = async (task: Task, dateStr: string, timeStr: string, durationHours: number) => {
    const currentToken = await getValidCalendarToken();
    if (!currentToken) return;

    const confirmSchedule = window.confirm(
      `Confirm scheduling crop event "${task.name}" on your Google Calendar for ${dateStr} at ${timeStr}?`
    );
    if (!confirmSchedule) return;

    try {
      const startDateTimeStr = `${dateStr}T${timeStr}:00`;
      const startDateObj = new Date(startDateTimeStr);
      
      if (isNaN(startDateObj.getTime())) {
        showToast('Invalid schedule date or time format.', 'error');
        return;
      }

      const endDateObj = new Date(startDateObj.getTime() + durationHours * 60 * 60 * 1000);

      const eventBody = {
        summary: `🌱 Gardening Task: ${task.name}`,
        description: `Snyx Garden Nook Target.\nExpected Work: ${task.hoursLeft} hours left.\nCrop Class: ${task.isHard ? 'Hardy Crop 🌾' : 'Standard'}\nGrowth Stage: ${task.progress}%`,
        start: {
          dateTime: startDateObj.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDateObj.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        reminders: {
          useDefault: true,
        },
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      });

      if (response.status === 401) {
        localStorage.removeItem('gcal_token');
        localStorage.removeItem('gcal_token_time');
        setCalendarToken(null);
        setErrorCalendar('Google Calendar session has expired. Please click Connect to link your calendar again.');
        showToast('Google Calendar session expired. Please connect again.', 'error');
        return;
      }

      if (!response.ok) {
        throw new Error('Google Calendar service rejected the request.');
      }

      showToast(`Scheduled on Google Calendar ✓`, 'success');
      audioSynth.playMilestone();
      onXPUnlock(50);
      setSchedulingTaskId(null);
      fetchCalendarEvents(currentToken);
    } catch (err: any) {
      showToast(`Scheduling failed: ${err.message}`, 'error');
    }
  };

  const handleAddToCalendar = async (task: Task) => {
    const currentToken = await getValidCalendarToken();
    if (!currentToken) return;

    try {
      let dateStr = task.deadline;
      if (!dateStr || isNaN(new Date(dateStr).getTime())) {
        dateStr = new Date().toISOString().split('T')[0];
      }

      // Create event on the mission's deadline date (e.g. 9 AM to 10 AM)
      const startDateStr = `${dateStr}T09:00:00`;
      const endDateStr = `${dateStr}T10:00:00`;
      
      const eventBody = {
        summary: `🌱 Gardening Task: ${task.name}`,
        description: `Hours Needed: ${task.hoursNeeded || task.hoursLeft || 1}\nCurrent Growth Stage: ${task.progress || 0}%`,
        start: {
          dateTime: new Date(startDateStr).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: new Date(endDateStr).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        reminders: {
          useDefault: false,
          overrides: [
            {
              method: 'popup',
              minutes: 1440 // 24 hours before
            }
          ]
        }
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      });

      if (response.status === 401) {
        localStorage.removeItem('gcal_token');
        localStorage.removeItem('gcal_token_time');
        setCalendarToken(null);
        setErrorCalendar('Google Calendar session has expired. Please click Connect to link your calendar again.');
        showToast('Google Calendar session expired. Please connect again.', 'error');
        return;
      }

      if (!response.ok) {
        throw new Error('Google Calendar service rejected the request.');
      }

      onUpdateTask({
        ...task,
        isCalendarSynced: true
      });

      showToast(`Added to Google Calendar ✓`, 'success');
      audioSynth.playMilestone();
      if (typeof onXPUnlock === 'function') {
        onXPUnlock(50);
      }
      fetchCalendarEvents(currentToken);
    } catch (err: any) {
      showToast(`Calendar sync failed: ${err.message}`, 'error');
    }
  };

  const syncAllMissionsToCalendar = async () => {
    const currentToken = await getValidCalendarToken();
    if (!currentToken) return;

    const pendingMissions = tasks.filter(t => !t.completed);
    if (pendingMissions.length === 0) {
      showToast('There are no active crops pending in your garden.', 'error');
      return;
    }

    const confirmSync = window.confirm(
      `Confirm synchronization: Snyx will schedule ${pendingMissions.length} active crop(s) to your Google Calendar. Do you wish to proceed?`
    );
    if (!confirmSync) return;

    setSyncingAll(true);
    let successCount = 0;

    for (const task of pendingMissions) {
      try {
        const todayIso = new Date();
        todayIso.setHours(9, 0, 0, 0);
        const startIso = todayIso.toISOString();
        const endIso = new Date(todayIso.getTime() + (task.hoursLeft || 1) * 60 * 60 * 1000).toISOString();

        const eventBody = {
          summary: `🌱 Gardening Task: ${task.name}`,
          description: `Snyx Garden Target.\nHours Needed: ${task.hoursLeft} hours.\nGrowth Stage: ${task.progress}%`,
          start: {
            dateTime: startIso,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: endIso,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          reminders: { useDefault: true },
        };

        const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventBody),
        });

        if (res.status === 401) {
          localStorage.removeItem('gcal_token');
          localStorage.removeItem('gcal_token_time');
          setCalendarToken(null);
          setErrorCalendar('Google Calendar session has expired. Please click Connect to link your calendar again.');
          showToast('Google Calendar session expired. Please connect again.', 'error');
          break;
        }

        if (res.ok) {
          successCount++;
        }
      } catch (err) {
        console.warn(`Failed to sync crop: ${task.name}`, err);
      }
    }

    setSyncingAll(false);
    if (successCount > 0) {
      showToast(`Synced ${successCount} crops to Calendar ✓`, 'success');
      audioSynth.playMilestone();
      onXPUnlock(successCount * 50);
      fetchCalendarEvents(currentToken);
    } else {
      showToast(`Could not register crops. Please reconnect calendar.`, 'error');
    }
  };

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasksCount = tasks.filter(t => t.completed).length;
  const syncedTasksCount = tasks.filter(t => t.isCalendarSynced).length;

  const getNextActionDetails = (task: Task) => {
    const name = task.name;
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('ml') || nameLower.includes('machine learning') || nameLower.includes('model') || nameLower.includes('data')) {
      return { action: `Open ledger and sort seed data for ${name}`, est: 5 };
    } else if (nameLower.includes('code') || nameLower.includes('develop') || nameLower.includes('app') || nameLower.includes('build') || nameLower.includes('bug') || nameLower.includes('program')) {
      return { action: `Load your workspace in the cottage for ${name}`, est: 5 };
    } else if (nameLower.includes('assignment') || nameLower.includes('homework') || nameLower.includes('exam') || nameLower.includes('study')) {
      return { action: `Open your farm manuals for ${name}`, est: 5 };
    } else if (nameLower.includes('report') || nameLower.includes('write') || nameLower.includes('paper') || nameLower.includes('essay') || nameLower.includes('doc')) {
      return { action: `Lay out parchment paper for ${name}`, est: 10 };
    } else {
      return { action: `Clear distraction-free environment for ${name}`, est: 5 };
    }
  };

  const fetchBriefing = async () => {
    setLoadingBriefing(true);
    try {
      const response = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks,
          userStats: stats,
          moodHistory: JSON.parse(localStorage.getItem('snygg_moods') || '[]'),
        }),
      });
      const data = await response.json();
      if (data.briefingText) {
        setBriefing(data.briefingText);
        setIsBriefingFallback(!!data.fallback);
      } else {
        setBriefing('#### Cozy Cottage Broadcast: The winds are quiet today. Clear weather and fertile fields ahead.');
        setIsBriefingFallback(true);
      }
    } catch (err) {
      console.error(err);
      setBriefing('#### The garden wire is resting. Snyx is checking the mail.');
      setIsBriefingFallback(true);
    } finally {
      setLoadingBriefing(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
  }, [tasks.length]);

  const handleProgressChange = (task: Task, change: number) => {
    const nextProgress = Math.min(100, Math.max(0, task.progress + change));
    const completed = nextProgress === 100;
    
    // Calculate new risk score based on updated progress
    const risk = calculateRisk(task.deadline, nextProgress);
    const riskLevel = risk >= 70 ? 'red' : risk >= 40 ? 'amber' : 'green';

    const updated: Task = {
      ...task,
      progress: nextProgress,
      completed,
      riskScore: risk,
      riskLevel,
      hoursLeft: Math.max(0, Number((task.hoursNeeded * (1 - nextProgress / 100)).toFixed(1))),
    };

    onUpdateTask(updated);

    if (completed && !task.completed) {
      // Play satisfying bird chirp audio
      audioSynth.playTaskComplete();
      
      const bonus = task.isHard ? 300 : 150;
      onXPUnlock(bonus);
    }
  };

  const calculateRisk = (deadlineStr: string, progress: number): number => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const deadlineDate = new Date(deadlineStr);
    deadlineDate.setHours(0,0,0,0);
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let deadlineRisk = 0;
    if (diffDays <= 0) deadlineRisk = 100;
    else if (diffDays === 1) deadlineRisk = 90;
    else if (diffDays === 2) deadlineRisk = 75;
    else if (diffDays <= 4) deadlineRisk = 50;
    else deadlineRisk = 20;

    const progressDeficit = 100 - progress;
    return Math.min(100, Math.round((deadlineRisk * 0.6) + (progressDeficit * 0.4)));
  };

  const triggerEmailDraft = async (task: Task) => {
    setDraftingEmailTaskId(task.id);
    try {
      const response = await fetch('/api/draft-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskName: task.name,
          riskLevel: task.riskLevel,
          progress: task.progress,
          deadline: task.deadline,
          riskScore: task.riskScore
        }),
      });
      const data = await response.json();
      
      const drafted = {
        to: data.to || 'recipient@example.com',
        subject: data.subject || 'Carrier Pigeon Dispatch',
        body: data.body || '',
        approved: false,
        sent: false,
      };

      onUpdateTask({
        ...task,
        draftEmail: drafted,
      });

      // Populate modal and open it
      setModalEmailTask(task);
      setModalTo(drafted.to);
      setModalSubject(drafted.subject);
      setModalBody(drafted.body);
      setModalIsEditing(false);
    } catch (err) {
      console.error(err);
      showToast('Could not draft email. Please try again.', 'error');
    } finally {
      setDraftingEmailTaskId(null);
    }
  };

  const executeActualGmailAuth = (): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('Fetching Google Client ID from backend for Gmail...');
        const clientIdRes = await fetch('/api/auth/google-client-id');
        if (!clientIdRes.ok) {
          throw new Error('Could not fetch Google Client ID from server');
        }
        const { clientId } = await clientIdRes.json();
        
        if (!clientId) {
          throw new Error('Google Client ID is not configured in environment variables');
        }

        // Setup the Google OAuth implicit flow redirect callback URL
        const redirectUri = `${window.location.origin}/auth/google/callback`;
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'token',
          scope: 'https://www.googleapis.com/auth/gmail.send',
          prompt: 'consent'
        });

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        
        const popupWidth = 600;
        const popupHeight = 650;
        const left = window.screenX + (window.innerWidth - popupWidth) / 2;
        const top = window.screenY + (window.innerHeight - popupHeight) / 2;

        console.log('Opening Google OAuth popup for Gmail sending scope...');
        const popup = window.open(
          authUrl,
          'gmail_oauth_popup',
          `width=${popupWidth},height=${popupHeight},left=${left},top=${top}`
        );

        if (!popup) {
          throw new Error('Popup blocker prevented the connection window from opening.');
        }

        let resolved = false;

        const handleMessage = (event: MessageEvent) => {
          const origin = event.origin;
          if (!origin.endsWith('.run.app') && !origin.includes('localhost') && origin !== window.location.origin) {
            return;
          }

          if (event.data?.type === 'GMAIL_AUTH_SUCCESS') {
            const { accessToken, expiresIn } = event.data;
            localStorage.setItem('snygg_gmail_access_token', accessToken);
            localStorage.setItem('snygg_gmail_expires_at', (Date.now() + Number(expiresIn) * 1000).toString());
            
            resolved = true;
            window.removeEventListener('message', handleMessage);
            resolve(accessToken);
          } else if (event.data?.type === 'GMAIL_AUTH_FAILURE') {
            resolved = true;
            window.removeEventListener('message', handleMessage);
            reject(new Error(event.data.error || 'Authentication failed.'));
          }
        };

        window.addEventListener('message', handleMessage);

        const checkClosedInterval = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosedInterval);
            if (!resolved) {
              window.removeEventListener('message', handleMessage);
              reject(new Error('Authentication window was closed by the user.'));
            }
          }
        }, 500);

      } catch (err: any) {
        reject(err);
      }
    });
  };

  const ensureGmailToken = (): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        const storedToken = localStorage.getItem('snygg_gmail_access_token');
        const expiresAt = localStorage.getItem('snygg_gmail_expires_at');
        
        // Use existing token if it's still valid for at least 30 seconds
        if (storedToken && expiresAt && Date.now() < Number(expiresAt) - 30000) {
          resolve(storedToken);
          return;
        }

        setPendingAuth({
          onConfirm: async () => {
            setPendingAuth(null);
            try {
              const token = await executeActualGmailAuth();
              resolve(token);
            } catch (err) {
              reject(err);
            }
          },
          onCancel: () => {
            setPendingAuth(null);
            reject(new Error('User cancelled authentication disclosure.'));
          }
        });
      } catch (err: any) {
        reject(err);
      }
    });
  };

  const getFriendlyGmailErrorMessage = (err: any): string => {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('popup blocker') || msg.includes('prevented')) {
      return 'The connection popup was blocked. Please allow popups for Snygg and try again.';
    }
    if (msg.includes('closed') || msg.includes('canceled') || msg.includes('cancelled')) {
      return 'Sign-in window was closed. Please complete authentication to dispatch carrier pigeons.';
    }
    if (msg.includes('client id') || msg.includes('not configured')) {
      return 'The Google Client ID is not configured. Please define GOOGLE_CLIENT_ID in your environment secrets.';
    }
    if (msg.includes('unauthorized') || msg.includes('expired') || msg.includes('401')) {
      return 'Cozy Carrier Pigeon authorization has expired. Please re-authenticate.';
    }
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Network connection issue. Google services could not be reached.';
    }
    return 'Cozy Carrier Pigeon was unable to dispatch your mail. Please try re-authenticating.';
  };

  const executeSendEmail = async (task: Task, finalTo: string, finalSubject: string, finalBody: string) => {
    setEmailStatus(prev => ({ ...prev, [task.id]: 'FLYING...' }));

    try {
      // 1. Obtain a valid Gmail OAuth Access Token
      const gmailToken = await ensureGmailToken();

      const rawEmailContent = [
        `To: ${finalTo}`,
        `Subject: ${finalSubject}`,
        `Content-Type: text/plain; charset=utf-8`,
        `MIME-Version: 1.0`,
        ``,
        finalBody,
      ].join('\r\n');

      const base64SafeEmail = btoa(unescape(encodeURIComponent(rawEmailContent)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // 2. Try to dispatch the email with Gmail API
      let response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${gmailToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: base64SafeEmail,
        }),
      });

      // 3. Handle Auto-refresh if the token expired during dispatch
      if (response.status === 401) {
        console.warn('Gmail access token is invalid or expired. Performing automatic refresh...');
        localStorage.removeItem('snygg_gmail_access_token');
        localStorage.removeItem('snygg_gmail_expires_at');
        
        const freshToken = await ensureGmailToken();
        response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${freshToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            raw: base64SafeEmail,
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`Gmail API response status: ${response.status}`);
      }

      onUpdateTask({
        ...task,
        draftEmail: {
          to: finalTo,
          subject: finalSubject,
          body: finalBody,
          approved: true,
          sent: true,
        },
      });
      setEmailStatus(prev => ({ ...prev, [task.id]: 'SENT' }));
      showToast('Email sent successfully ✓', 'success');
      onXPUnlock(100); // 100 Seeds bonus for dispatch
      setModalEmailTask(null); // close modal
    } catch (err: any) {
      console.error('Gmail send error:', err);
      setEmailStatus(prev => ({ ...prev, [task.id]: 'FAILED' }));
      const friendlyMessage = getFriendlyGmailErrorMessage(err);
      showToast(friendlyMessage, 'error');
    }
  };

  // Helper to draw custom botanical sprout illustration
  const getBotanySprout = (progress: number) => {
    if (progress < 25) {
      return (
        <svg className="w-10 h-10 text-[#7C3AED]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {/* Sprouted seedling seed */}
          <path d="M12 22v-4" />
          <path d="M12 18c0-3.3 2.7-6 6-6" />
          <circle cx="12" cy="18" r="2" fill="currentColor" />
        </svg>
      );
    } else if (progress < 50) {
      return (
        <svg className="w-10 h-10 text-[#7C3AED]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {/* Sprout shoot */}
          <path d="M12 22V14" />
          <path d="M12 14c-2.5-1.5-4-4-4-7 3 0 5.5 1.5 7 4" />
          <path d="M12 17c2-1.5 3.5-3.5 3.5-6 1.5.5 2.5 1.5 3 3" />
        </svg>
      );
    } else if (progress < 75) {
      return (
        <svg className="w-10 h-10 text-[#F59E8B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {/* Flower bud */}
          <path d="M12 22V10" />
          <path d="M12 10a4 4 0 0 1 8-4M4 14a8 8 0 0 1 8-8" />
          <circle cx="12" cy="8" r="3" fill="#F59E8B" />
        </svg>
      );
    } else {
      return (
        <svg className="w-10 h-10 text-[#F59E8B] animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animationDuration: '4s' }}>
          {/* Full blooming flower */}
          <path d="M12 22V12" />
          <circle cx="12" cy="8" r="4" fill="#EC4899" />
          <circle cx="12" cy="4" r="2" fill="#F59E8B" />
          <circle cx="12" cy="12" r="2" fill="#F59E8B" />
          <circle cx="8" cy="8" r="2" fill="#F59E8B" />
          <circle cx="16" cy="8" r="2" fill="#F59E8B" />
        </svg>
      );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: AI briefing + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Morning Briefing Card */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#F0EEFF] p-5 flex flex-col justify-between shadow-[0_8px_30px_rgb(240,238,255,0.6)] text-left">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-[#F0EEFF] pb-2">
              <h2 className="text-xs font-black text-[#7C3AED] tracking-widest uppercase flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#7C3AED]" /> COZY MORNING BRIEFING
              </h2>
              <button
                onClick={fetchBriefing}
                disabled={loadingBriefing}
                className="text-[#7C3AED] hover:text-[#6D28D9] transition-transform hover:rotate-180 duration-500 p-1 cursor-pointer"
                title="Refresh Briefing"
              >
                <RefreshCw className={`w-4 h-4 ${loadingBriefing ? 'animate-spin text-[#7C3AED]' : ''}`} />
              </button>
            </div>
            {loadingBriefing ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3 text-[#7C3AED]">
                <RefreshCw className="w-8 h-8 animate-spin text-[#F59E8B]" />
                <div className="text-center">
                  <p className="text-xs font-black tracking-widest uppercase animate-pulse">Snyx is compiling your custom briefing...</p>
                  <p className="text-[9px] text-slate-400 font-extrabold uppercase">Please wait while Snyx compiles your daily growth guide</p>
                </div>
              </div>
            ) : (
              <div className="text-[#1E1B2E]/80 text-xs leading-relaxed space-y-2 font-medium border-l-2 border-[#7C3AED] pl-3 italic">
                <Markdown>{briefing || 'Preparing the morning ledger...'}</Markdown>
              </div>
            )}
          </div>
          <p className="text-[9px] font-black mt-4 text-right text-[#7C3AED] uppercase">
            <span>Morning Post Synced</span>
          </p>
        </div>

        {/* Stats Card */}
        <div className="rounded-2xl bg-white border border-[#F0EEFF] p-5 flex flex-col justify-between shadow-[0_8px_30px_rgb(240,238,255,0.6)] text-left">
          <h2 className="text-xs font-black text-[#7C3AED] tracking-widest uppercase flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#7C3AED]" /> DAILY ACTIVITY LEDGER
          </h2>
          <div className="grid grid-cols-1 gap-3">
            <div className="p-3 bg-[#F8F7FF] rounded-xl border border-[#F0EEFF] flex justify-between items-center">
              <div>
                <div className="text-2xl font-black text-[#1E1B2E]">{completedTasksCount}</div>
                <div className="text-[9px] uppercase font-black text-slate-400">Tasks Completed</div>
              </div>
              <span className="text-lg">🧺</span>
            </div>
            <div className="p-3 bg-[#F8F7FF] rounded-xl border border-[#F0EEFF] flex justify-between items-center">
              <div>
                <div className="text-2xl font-black text-[#7C3AED]">{stats.focusScore}%</div>
                <div className="text-[9px] uppercase font-black text-slate-400">Focus Efficiency</div>
              </div>
              <span className="text-lg">☀️</span>
            </div>
            <div className="p-3 bg-[#F8F7FF] rounded-xl border border-[#F0EEFF] flex justify-between items-center">
              <div>
                <div className="text-xl font-black text-[#F59E8B]">{syncedTasksCount}</div>
                <div className="text-[9px] uppercase font-black text-slate-400">CALENDAR SYNC</div>
              </div>
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                syncedTasksCount > 0 ? 'bg-[#7C3AED]/10 border-[#7C3AED]/30 text-[#7C3AED]' : 'bg-gray-100 border-gray-300 text-gray-400'
              }`}>
                {syncedTasksCount > 0 ? 'CALENDAR SYNC ACTIVE 🕊️' : 'COOP IDLE'}
              </span>
            </div>
            <div className="p-3 bg-[#F8F7FF] rounded-xl border border-[#F0EEFF] flex justify-between items-center">
              <div>
                <div className="text-lg font-black text-[#1E1B2E]">{activeTasks.length} active</div>
                <div className="text-[9px] uppercase font-black text-slate-400">Active Tasks</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-black text-[#F59E8B]">+{stats.level * 1000 - stats.xp} Seeds</div>
                <div className="text-[9px] uppercase font-black text-slate-400">To Next Level</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* RECOMMENDED TARGET ACTION - The "Daily Cultivation Pathway" */}
      {activeTasks.length > 0 && (() => {
        const sortedByRisk = [...activeTasks].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
        const topTask = sortedByRisk[0];
        const details = getNextActionDetails(topTask);
        return (
          <div className="rounded-2xl border border-[#7C3AED]/30 bg-[#7C3AED]/5 p-5 shadow-[0_8px_30px_rgb(240,238,255,0.4)] flex flex-col sm:flex-row justify-between items-center gap-4 text-left">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-[#7C3AED] border-2 border-white flex items-center justify-center text-white font-bold shrink-0 animate-pulse text-lg">
                🌱
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#7C3AED] flex items-center gap-2">
                  <span>DAILY CULTIVATION PATHWAY 🐾</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-ping" />
                </h4>
                <p className="text-[#1E1B2E] text-sm font-black mt-1">
                  ▶ PLANTING FOCUS: {details.action} — estimated {details.est} min
                </p>
                <p className="text-[10px] text-[#1E1B2E]/60 font-semibold mt-0.5">
                  Tend this crop first to ensure a gorgeous full bloom! ({topTask.riskScore}% risk load)
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const element = document.getElementById(`task-${topTask.id}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  element.classList.add('ring-4', 'ring-[#7C3AED]/40', 'duration-500');
                  setTimeout(() => {
                    element.classList.remove('ring-4', 'ring-[#7C3AED]/40');
                  }, 3000);
                }
              }}
              className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-[10px] font-black text-white uppercase tracking-wider rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 shadow-md"
            >
              Locate Seed
            </button>
          </div>
        );
      })()}

      {/* Google Calendar coop card */}
      <div className="rounded-2xl bg-white border border-[#F0EEFF] p-5 space-y-4 shadow-[0_8px_30px_rgb(240,238,255,0.6)] text-left">
        <div className="flex items-center justify-between border-b border-[#F0EEFF] pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#F59E8B]" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-[#7C3AED]">Cottage Calendar Pigeon coop</h3>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase">WORKSPACE TIME SLOTS & RESERVES</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isCalendarAuthorized ? (
              <>
                <button
                  onClick={() => fetchCalendarEvents()}
                  disabled={loadingCalendar}
                  className="px-3 py-1.5 bg-white border border-[#F0EEFF] text-[#7C3AED] rounded-xl text-xs font-black uppercase hover:border-[#7C3AED] hover:bg-[#F0EEFF] transition-all cursor-pointer shadow-xs"
                >
                  {loadingCalendar ? 'RECALLING FEEDS...' : 'REFRESH FEEDS'}
                </button>
                <button
                  onClick={syncAllMissionsToCalendar}
                  disabled={syncingAll}
                  className="px-3 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  {syncingAll ? 'SENDING...' : 'SEND ALL SEEDS'}
                </button>
              </>
            ) : (
              <button
                onClick={() => initCalendarAuth()}
                className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
              >
                CONNECT GOOGLE CALENDAR
              </button>
            )}
          </div>
        </div>

        {!isCalendarAuthorized ? (
          <div className="py-6 text-center space-y-2">
            <p className="text-xs text-[#1E1B2E]/75 max-w-md mx-auto leading-relaxed font-semibold">
              Unlock the cottage schedule engine. Link your Google Calendar to view upcoming real-world tasks, reserve garden time slots, and sync your Snyx cockpit missions seamlessly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left: Next scheduled slots */}
            <div className="bg-[#F8F7FF] border border-[#F0EEFF] rounded-xl p-4 space-y-3">
              <h4 className="text-[10px] uppercase font-black tracking-widest text-[#7C3AED]">📅 PIGEON POST SLOTS</h4>
              
              {loadingCalendar ? (
                <div className="space-y-2 py-2">
                  <div className="h-3 bg-[#F0EEFF] rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-[#F0EEFF] rounded animate-pulse w-3/4" />
                </div>
              ) : errorCalendar ? (
                <div className="text-[10px] text-red-500 font-bold italic">{errorCalendar}</div>
              ) : calendarEvents.length === 0 ? (
                <p className="text-xs text-slate-400 font-bold italic">No upcoming events</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {calendarEvents.map((evt, idx) => {
                    const startStr = evt.start?.dateTime || evt.start?.date || '';
                    const dateFormatted = startStr ? new Date(startStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'All-Day';
                    return (
                      <div key={evt.id || idx} className="flex items-start justify-between p-2 rounded-lg bg-white border border-[#F0EEFF] hover:border-[#7C3AED]/30 transition-all">
                        <div className="text-left space-y-0.5">
                          <p className="text-xs font-black text-[#1E1B2E] leading-tight truncate max-w-[180px]">{evt.summary || 'No Title'}</p>
                          <p className="text-[10px] text-[#7C3AED] font-extrabold">{dateFormatted}</p>
                        </div>
                        {evt.location && (
                          <span className="text-[9px] text-slate-500 max-w-[80px] truncate uppercase font-bold bg-[#F8F7FF] px-1 py-0.5 rounded" title={evt.location}>
                            📍 {evt.location.split(',')[0]}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Sync Status and quick instructions */}
            <div className="bg-[#F8F7FF] border border-[#F0EEFF] rounded-xl p-4 flex flex-col justify-between">
              <div className="space-y-2 text-left">
                <h4 className="text-[10px] uppercase font-black tracking-widest text-[#F59E8B]">📅 AUTONOMOUS CALENDAR SYNC</h4>
                <p className="text-xs text-[#1E1B2E]/70 leading-relaxed font-semibold">
                  Schedule active tasks dynamically. Simply click <span className="text-[#F59E8B] font-bold">ADD TO CALENDAR</span> on any task card below to lock in a dedicated focus time block on your primary Google Calendar!
                </p>
              </div>
              <div className="pt-4 border-t border-[#F0EEFF] flex items-center justify-between text-[9px] font-black text-slate-400 mt-4 uppercase tracking-wider">
                <span>CO-PILOT STATUS: <span className="text-[#7C3AED] font-black">READY</span></span>
                {user?.email && <span className="text-[#7C3AED] truncate max-w-[160px] lowercase">{user.email}</span>}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Active Crops Deck */}
      <div className="space-y-4 text-left">
        <div className="flex justify-between items-end border-b border-[#F0EEFF] pb-2 flex-wrap gap-2">
          <h3 className="text-xl font-black text-[#1E1B2E] flex items-center gap-2">
            🐾 Active Tasks
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onRedirectToLoadout}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 text-[#7C3AED] rounded-xl text-xs font-bold uppercase transition-all cursor-pointer border border-[#7C3AED]/20 shadow-xs"
            >
              <span>+ Add Mission</span>
            </button>
            <span className="text-[10px] font-black bg-[#7C3AED]/10 px-2.5 py-1 rounded-xl text-[#7C3AED] uppercase tracking-wider">
              {activeTasks.length} IN PROGRESS
            </span>
          </div>
        </div>

        {activeTasks.length === 0 ? (
          <div className="rounded-2xl border border-[#F0EEFF] bg-white p-8 text-center space-y-2 shadow-[0_8px_30px_rgb(240,238,255,0.6)]">
            <CheckCircle className="w-8 h-8 text-[#7C3AED] mx-auto" />
            <h4 className="text-sm font-black text-[#7C3AED] uppercase tracking-widest">All tasks are fully completed! 🎉</h4>
            <p className="text-xs text-[#1E1B2E]/60 max-w-xs mx-auto font-medium">No tasks need attention. Create a new task in Today's Schedule or take a rest in the Focus Nook!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {activeTasks.map(task => {
               const riskColor = 
                 task.riskLevel === 'red' 
                   ? '#EF4444' 
                   : task.riskLevel === 'amber'
                     ? '#F59E8B'
                     : '#10B981';

               const glowStyle =
                 task.riskLevel === 'red' 
                   ? 'shadow-[0_12px_30px_rgba(239,68,68,0.08)] border-l-4 border-l-red-500 border-red-100 hover:border-red-300' 
                   : task.riskLevel === 'amber'
                     ? 'shadow-[0_12px_30px_rgba(245,158,139,0.08)] border-l-4 border-l-[#F59E8B] border-[#FFDCD3] hover:border-[#F59E8B]'
                     : 'shadow-[0_12px_30px_rgba(16,185,129,0.08)] border-l-4 border-l-[#10B981] border-emerald-100 hover:border-[#10B981]';

               // Live ticking simulation countdown label
               const cardToday = new Date('2026-06-25');
               const cardDl = new Date(task.deadline);
               const cardDiff = cardDl.getTime() - cardToday.getTime();
               const cardDaysLeft = Math.max(1, Math.ceil(cardDiff / (1000 * 3600 * 24)));
               const cardHrsPerDay = ((task.hoursLeft || task.hoursNeeded || 1) / cardDaysLeft).toFixed(1);

               return (
                 <div
                   key={task.id}
                   id={`task-${task.id}`}
                   className={`bg-white rounded-2xl p-6 relative overflow-hidden group flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(124,58,237,0.08)] shimmer-hover border border-slate-100 ${glowStyle}`}
                 >
                   <div>
                     {/* Header: Name + Risk Index */}
                     <div className="flex justify-between items-center mb-4">
                       <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-full border ${
                         task.riskLevel === 'red' 
                           ? 'bg-red-50 border-red-100 text-red-600' 
                           : task.riskLevel === 'amber' 
                           ? 'bg-[#FFF0EC] border-[#FFDCD3] text-[#F59E8B]' 
                           : 'bg-[#ECFDF5] border-emerald-100 text-[#10B981]'
                       }`}>
                         {task.riskLevel === 'red' ? 'Needs Water 🚨' : task.riskLevel === 'amber' ? 'Growing 🌿' : 'Thriving 🌸'}
                       </span>
                       
                       <span className="text-[9px] font-extrabold text-[#7C3AED] bg-[#F0EEFF] px-2 py-0.5 rounded-md uppercase tracking-wider">
                         {task.isHard ? 'HARDY' : 'STANDARD'}
                       </span>
                     </div>

                     <div className="flex items-center gap-4 justify-between mb-4">
                       <div className="text-left flex-1">
                         <h4 className="text-base font-black text-[#1E1B2E] leading-tight mb-1">{task.name}</h4>
                         {/* Live Countdown Badge */}
                         <div className="inline-flex items-center gap-1 text-[10px] bg-slate-50 border border-slate-100 text-slate-500 px-2 py-0.5 rounded-lg font-bold">
                           <Clock className="w-3 h-3 text-[#7C3AED]" />
                           <span>T-minus {task.hoursLeft} hours left</span>
                         </div>
                       </div>
                       
                       {/* SVG Circular Progress Indicator (replaces old flat bar) */}
                       <div className="relative w-14 h-14 shrink-0 flex items-center justify-center bg-white rounded-full shadow-xs">
                         <svg className="w-full h-full transform -rotate-90">
                           <circle
                             cx="28"
                             cy="28"
                             r="22"
                             className="stroke-slate-100"
                             strokeWidth="4.5"
                             fill="transparent"
                           />
                           <circle
                             cx="28"
                             cy="28"
                             r="22"
                             className="transition-all duration-700 ease-out"
                             stroke={riskColor}
                             strokeWidth="4.5"
                             fill="transparent"
                             strokeDasharray={2 * Math.PI * 22}
                             strokeDashoffset={2 * Math.PI * 22 * (1 - task.progress / 100)}
                             strokeLinecap="round"
                           />
                         </svg>
                         <span className="absolute text-[10px] font-black text-[#1E1B2E]">{task.progress}%</span>
                       </div>
                     </div>

                     {/* Deadline Countdown Alert banner */}
                     <div className="mb-4 px-3 py-2 bg-[#F8F7FF] border border-[#F0EEFF] rounded-xl text-[10px] text-[#1E1B2E]/70 flex items-center gap-1.5 leading-snug font-medium text-left">
                       <span>⚠️ <b>{cardDaysLeft} days</b> until harvest — snyx advises <b>{cardHrsPerDay} hrs/day</b></span>
                     </div>

                     {/* Collapsible Almanac Guide Packet */}
                     <div className="mt-3 border border-[#F0EEFF] rounded-xl bg-white overflow-hidden transition-all duration-300">
                       <button
                         onClick={() => toggleIntel(task.id)}
                         className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-[#7C3AED] hover:bg-[#F0EEFF] transition-all cursor-pointer"
                       >
                         <span className="flex items-center gap-1.5 font-black uppercase">
                           <Leaf className="w-3.5 h-3.5 text-[#10B981]" />
                           ALMANAC CROP INTEL
                         </span>
                         <span className="text-[#7C3AED]/70 text-[9px] font-extrabold uppercase">
                           {expandedIntel[task.id] ? 'CLOSE ▴' : 'OPEN ▾'}
                         </span>
                       </button>

                       {expandedIntel[task.id] && (
                         <div className="p-3 border-t border-[#F0EEFF] text-left space-y-3 text-[10px] leading-relaxed text-[#1E1B2E]/80 bg-[#F8F7FF]">
                           {task.intel ? (
                             <>
                               <div>
                                 <span className="text-[8px] uppercase font-black tracking-widest text-[#F59E8B] block mb-0.5">📖 CROP RESEARCH TOPIC</span>
                                 <p className="bg-white border border-[#F0EEFF] rounded px-2 py-1 text-[#1E1B2E] font-mono text-[10px]">
                                   {task.intel.searchQuery}
                                 </p>
                               </div>
                               <div>
                                 <span className="text-[8px] uppercase font-black tracking-widest text-[#10B981] block mb-0.5">📋 OPTIMIZED ACTION PLAN</span>
                                 <p className="text-[#1E1B2E]/80 pl-1.5 border-l-2 border-[#10B981] font-medium">
                                   {task.intel.approach}
                                 </p>
                               </div>
                               <div>
                                 <span className="text-[8px] uppercase font-black tracking-widest text-[#7C3AED] block mb-0.5">😸 SNYX'S ADVICE</span>
                                 <p className="text-[#1E1B2E]/80 pl-1.5 border-l-2 border-[#7C3AED] font-medium">
                                   {task.intel.microTip}
                                 </p>
                               </div>
                             </>
                           ) : (
                             <div className="text-center py-2 space-y-2">
                               <p className="text-[9px] text-[#1E1B2E]/40 font-bold">[ Almanac entry is currently locked ]</p>
                               <button
                                 onClick={async () => {
                                   try {
                                     const res = await fetch('/api/intel', {
                                       method: 'POST',
                                       headers: { 'Content-Type': 'application/json' },
                                       body: JSON.stringify({ name: task.name }),
                                     });
                                     const intelData = await res.json();
                                     const updatedTask = { ...task, intel: intelData };
                                     onUpdateTask(updatedTask);
                                   } catch (e) {
                                     console.error("Failed to fetch almanac:", e);
                                   }
                                 }}
                                 className="px-3 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[9px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition-all shadow-sm"
                               >
                                 CONSULT SNYXY ALMANAC
                               </button>
                             </div>
                           )}
                         </div>
                       )}
                     </div>
                   </div>

                   {/* Actions Area */}
                   <div className="space-y-3 pt-3 border-t border-[#F0EEFF] mt-4 text-left">
                     <div className="flex items-center justify-between gap-2 flex-wrap">
                       <div className="flex gap-1.5">
                         <button
                           onClick={() => handleProgressChange(task, -10)}
                           className="px-2.5 py-1 text-[10px] font-extrabold border border-[#F0EEFF] hover:border-[#7C3AED] rounded-lg text-[#1E1B2E]/70 transition-all cursor-pointer bg-white"
                         >
                           -10%
                         </button>
                         <button
                           onClick={() => handleProgressChange(task, 10)}
                           className="px-2.5 py-1 text-[10px] font-extrabold bg-[#7C3AED] hover:bg-[#6D28D9] border border-[#7C3AED] rounded-lg text-white transition-all cursor-pointer shadow-sm"
                         >
                           +10%
                         </button>
                       </div>

                       <div className="flex items-center gap-2">
                         {/* Gemini autonomous draft email trigger button */}
                         {!task.draftEmail ? (
                            <button
                              onClick={() => triggerEmailDraft(task)}
                              disabled={draftingEmailTaskId === task.id}
                              className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#F0EEFF] text-[#7C3AED] rounded-xl text-xs font-bold uppercase hover:border-[#7C3AED] hover:bg-[#F0EEFF] transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                              title="Draft carrier pigeon email via AI"
                            >
                              <Mail className="w-3.5 h-3.5 text-[#7C3AED]" />
                             {draftingEmailTaskId === task.id ? 'DRAFTING...' : 'PIGEON POST'}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setModalEmailTask(task);
                                setModalTo(task.draftEmail.to);
                                setModalSubject(task.draftEmail.subject);
                                setModalBody(task.draftEmail.body);
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer shadow-xs ${
                                task.draftEmail.sent
                                  ? 'bg-emerald-50 border border-emerald-100 text-[#10B981]'
                                  : 'bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#7C3AED]'
                              }`}
                            >
                              <Mail className="w-3.5 h-3.5" />
                              {task.draftEmail.sent ? 'SENT DRAFT' : 'VIEW DRAFT'}
                            </button>
                          )}

                         {!isCalendarAuthorized ? (
                            <button
                              onClick={() => handleAddToCalendar(task)}
                              className="flex items-center gap-1.5 px-3 py-1 bg-[#ECFDF5] border border-emerald-100 text-[#10B981] hover:bg-[#D1FAE5] rounded-xl text-xs font-bold uppercase transition-all cursor-pointer shadow-xs"
                              title="Connect Google Calendar first"
                            >
                              <Calendar className="w-3.5 h-3.5 text-[#10B981]" />
                              Connect Calendar
                            </button>
                          ) : task.isCalendarSynced ? (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-[#ECFDF5] border border-emerald-100 text-[#10B981] rounded-lg text-xs font-bold uppercase tracking-wider">
                              <CheckCircle className="w-3.5 h-3.5 text-[#10B981]" />
                              SOWN ON CALENDAR
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAddToCalendar(task)}
                              className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#F0EEFF] text-[#10B981] rounded-xl text-xs font-bold uppercase hover:border-[#10B981] hover:bg-[#ECFDF5] transition-all cursor-pointer shadow-xs"
                              title="Add to Google Calendar"
                            >
                              <Calendar className="w-3.5 h-3.5 text-[#10B981]" />
                              SOW
                            </button>
                          )}

                         <button
                           onClick={() => onDeleteTask(task.id)}
                           className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                     </div>

                     {/* Inline Google Calendar Scheduler */}
                    {schedulingTaskId === task.id && (
                      <div className="mt-3 bg-[#F8F7FF] border border-[#F0EEFF] rounded-xl p-3.5 text-left space-y-3.5 animate-fade-in relative z-10">
                        <h5 className="font-black text-[10px] uppercase tracking-widest text-[#F59E8B] flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#F59E8B]" /> CHOOSE SOWING TIME
                        </h5>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="block text-[8px] uppercase tracking-wider text-slate-400 mb-1">Target Date</label>
                            <input
                              type="date"
                              value={scheduleDate}
                              onChange={(e) => setScheduleDate(e.target.value)}
                              className="w-full bg-white border border-[#F0EEFF] text-[#1E1B2E] px-2 py-1 rounded focus:outline-none focus:border-[#7C3AED] text-[11px]"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] uppercase tracking-wider text-slate-400 mb-1">Start Time</label>
                            <input
                              type="time"
                              value={scheduleTime}
                              onChange={(e) => setScheduleTime(e.target.value)}
                              className="w-full bg-white border border-[#F0EEFF] text-[#1E1B2E] px-2 py-1 rounded focus:outline-none focus:border-[#7C3AED] text-[11px]"
                            />
                          </div>
                        </div>

                        <div className="text-xs">
                          <label className="block text-[8px] uppercase tracking-wider text-slate-400 mb-1">Duration (Hours)</label>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={scheduleDuration}
                            onChange={(e) => setScheduleDuration(Number(e.target.value))}
                            className="w-full bg-white border border-[#F0EEFF] text-[#1E1B2E] px-2 py-1 rounded focus:outline-none focus:border-[#7C3AED] text-[11px]"
                          />
                        </div>

                        <div className="flex gap-2 pt-1 justify-between items-center">
                          <button
                            onClick={() => setSchedulingTaskId(null)}
                            className="text-[10px] text-gray-500 hover:text-red-500 transition-colors font-bold"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleScheduleTaskOnCalendar(task, scheduleDate, scheduleTime, scheduleDuration)}
                            className="px-3 py-1 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-sm"
                          >
                            SOW ON CALENDAR
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Dynamic Email Draft Modal */}
      {modalEmailTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#F0EEFF] shadow-2xl p-6 text-left relative">
            <button
              onClick={() => setModalEmailTask(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
            >
              &times;
            </button>
            <div className="flex items-center gap-2 mb-4 border-b border-[#F0EEFF] pb-3">
              <Mail className="w-5 h-5 text-[#7C3AED]" />
              <div>
                <h3 className="text-sm font-black text-[#1E1B2E] uppercase tracking-wider">
                  Gmail Escalation Desk
                </h3>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase">CO-PILOT EMAIL DISPATCH</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Draft Mode: {modalIsEditing ? '🔓 EDITABLE' : '🔒 READ-ONLY'}
                </span>
                <button
                  onClick={() => setModalIsEditing(!modalIsEditing)}
                  className={`px-3 py-1 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs ${
                    modalIsEditing 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100' 
                      : 'bg-[#F8F7FF] border-[#F0EEFF] text-[#7C3AED] hover:border-[#7C3AED]'
                  }`}
                >
                  {modalIsEditing ? '🔒 Lock & Lock Draft' : '✏️ Edit Draft'}
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">To (Recipient)</label>
                <input
                  type="email"
                  value={modalTo}
                  onChange={(e) => setModalTo(e.target.value)}
                  disabled={!modalIsEditing}
                  placeholder="recipient@example.com"
                  className={`w-full bg-[#F8F7FF] border text-[#1E1B2E] px-3 py-2 rounded-xl focus:outline-none focus:border-[#7C3AED] text-xs font-semibold transition-all ${
                    modalIsEditing ? 'border-[#7C3AED] bg-white' : 'border-[#F0EEFF] opacity-75 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={modalSubject}
                  onChange={(e) => setModalSubject(e.target.value)}
                  disabled={!modalIsEditing}
                  className={`w-full bg-[#F8F7FF] border text-[#1E1B2E] px-3 py-2 rounded-xl focus:outline-none focus:border-[#7C3AED] text-xs font-semibold transition-all ${
                    modalIsEditing ? 'border-[#7C3AED] bg-white' : 'border-[#F0EEFF] opacity-75 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Message Body</label>
                <textarea
                  value={modalBody}
                  onChange={(e) => setModalBody(e.target.value)}
                  disabled={!modalIsEditing}
                  rows={8}
                  className={`w-full bg-[#F8F7FF] border text-[#1E1B2E] px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#7C3AED] text-xs font-sans leading-relaxed resize-none transition-all ${
                    modalIsEditing ? 'border-[#7C3AED] bg-white' : 'border-[#F0EEFF] opacity-75 cursor-not-allowed'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 mt-6 border-t border-[#F0EEFF] pt-4">
              <button
                onClick={() => {
                  onUpdateTask({ ...modalEmailTask, draftEmail: undefined });
                  setModalEmailTask(null);
                }}
                className="text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors uppercase tracking-widest cursor-pointer"
              >
                Discard Draft
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setModalEmailTask(null)}
                  className="px-4 py-2 border border-[#F0EEFF] text-gray-500 hover:bg-gray-50 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => executeSendEmail(modalEmailTask, modalTo, modalSubject, modalBody)}
                  disabled={emailStatus[modalEmailTask.id] === 'FLYING...'}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {emailStatus[modalEmailTask.id] === 'FLYING...' ? 'Sending...' : 'Send via Gmail'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google OAuth Disclosure Warning Modal */}
      {pendingAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#F0EEFF] shadow-2xl p-6 text-left relative overflow-hidden">
            {/* Top illustrative strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7C3AED] via-[#9061F9] to-[#C084FC]"></div>
            
            <button
              onClick={() => pendingAuth.onCancel()}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
            >
              &times;
            </button>
            
            <div className="flex items-center gap-2 mb-4 border-b border-[#F0EEFF] pb-3 mt-1">
              <ShieldAlert className="w-5 h-5 text-[#7C3AED]" />
              <div>
                <h3 className="text-sm font-black text-[#1E1B2E] uppercase tracking-wider">
                  Google Account Connection
                </h3>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase">OAuth Access Disclosure</p>
              </div>
            </div>

            <div className="space-y-4 text-[#1E1B2E]">
              <p className="text-xs font-semibold leading-relaxed text-slate-700">
                Snygg is requesting access to your Google Calendar and Gmail to sync your tasks and send emails on your behalf. This app is currently in development mode - when Google's verification screen appears, click 'Advanced' then 'Go to Snygg' to continue. Your data is safe and only used within this app.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 border-t border-[#F0EEFF] pt-4">
              <button
                onClick={() => pendingAuth.onCancel()}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => pendingAuth.onConfirm()}
                className="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99]"
              >
                I understand, continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Floating Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border border-[#F0EEFF] bg-white shadow-xl animate-fade-in pointer-events-auto text-[#1E1B2E]">
          <span className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-[#7C3AED]' : 'bg-red-500'}`} />
          <p className="text-xs font-black tracking-widest uppercase">{toast.message}</p>
        </div>
      )}
    </div>
  );
}
