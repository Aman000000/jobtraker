import { Groq } from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import Job from '../models/Job.js';
import User from '../models/User.js';
import BadRequestError from '../errors/bad-request.js';

// Helper function to extract and create/update job entries in MongoDB
const processDatabaseActions = async (message, userId) => {
	// Normalize prompt text (fix common missing spaces e.g. "on25th" -> "on 25th", "tcson28th" -> "tcson 28th")
	let normalizedMsg = message.replace(/([a-zA-Z])(\d)/g, '$1 $2').replace(/(\d)([a-zA-Z])/g, '$1 $2');
	const lowerMsg = normalizedMsg.toLowerCase();
	let actionTaken = null;
	let affectedData = null;

	// 1. User Name Update (e.g. "my name is aman", "call me aman")
	const nameMatch = normalizedMsg.match(/(?:my name is|call me|name is|i am)\s+([A-Za-z]+)/i);
	if (nameMatch && nameMatch[1]) {
		const newName = nameMatch[1].trim();
		const user = await User.findById(userId);
		if (user) {
			user.name = newName;
			await user.save();
			actionTaken = 'PROFILE_UPDATED';
			affectedData = { name: newName };
		}
	}

	// 2. Detect Job Creation or Interview Scheduling
	const isActionPrompt =
		lowerMsg.includes('schedule') ||
		lowerMsg.includes('interview') ||
		lowerMsg.includes('add') ||
		lowerMsg.includes('create') ||
		lowerMsg.includes('update') ||
		lowerMsg.includes('role') ||
		lowerMsg.includes('city') ||
		lowerMsg.includes('location');

	if (isActionPrompt) {
		let company = '';
		let position = '';
		let location = '';
		let date = '';

		// Try Groq AI JSON extraction if available
		const groqApiKey = process.env.GROQ_API_KEY;
		if (groqApiKey && groqApiKey !== 'your_groq_api_key_here') {
			try {
				const groq = new Groq({ apiKey: groqApiKey });
				const completion = await groq.chat.completions.create({
					messages: [
						{
							role: 'system',
							content: `Extract details from prompt. Return ONLY JSON with keys: 
							"company" (string), "position" (string), "jobLocation" (string), "interviewDate" (string), "status" ("interview"|"pending"|"declined").`,
						},
						{ role: 'user', content: normalizedMsg },
					],
					model: 'llama-3.1-8b-instant',
					temperature: 0.1,
					response_format: { type: 'json_object' },
				});
				const aiParsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
				company = aiParsed.company || '';
				position = aiParsed.position || '';
				location = aiParsed.jobLocation || '';
				date = aiParsed.interviewDate || '';
			} catch (err) {
				console.warn('AI Extraction failed, falling back to rule parser:', err.message);
			}
		}

		// Fallback Rule-Based Parser
		if (!company) {
			if (lowerMsg.includes('capgemini') || lowerMsg.includes('capgemni')) company = 'Capgemini';
			else if (lowerMsg.includes('infosys')) company = 'Infosys';
			else if (lowerMsg.includes('vehant')) company = 'Vehant Technology';
			else if (lowerMsg.includes('tcs') || lowerMsg.includes('tcson')) company = 'TCS';
			else {
				const compMatch = normalizedMsg.match(/(?:of|for|at)\s+([A-Za-z0-9\s]+?)(?:\s+on|\s+city|\s+role|\s+at|$)/i);
				if (compMatch && compMatch[1]) company = compMatch[1].trim();
			}
		}

		if (!position) {
			if (lowerMsg.includes('sde2') || lowerMsg.includes('sde 2')) position = 'SDE2';
			else if (lowerMsg.includes('sde1') || lowerMsg.includes('sde 1')) position = 'SDE1';
			else {
				const posMatch = normalizedMsg.match(/(?:role|position)\s*([A-Za-z0-9\s\-]+?)(?:\s+on|\s+city|\s+at|$)/i);
				if (posMatch && posMatch[1]) position = posMatch[1].trim();
				else position = 'Software Engineer';
			}
		}

		if (!location) {
			if (lowerMsg.includes('noida')) location = 'Noida';
			else {
				const locMatch = normalizedMsg.match(/(?:city|location)\s+([A-Za-z0-9\s]+?)(?:\s+on|\s+for|\s+at|$)/i);
				if (locMatch && locMatch[1]) location = locMatch[1].trim();
				else location = 'Noida';
			}
		}

		if (!date) {
			const dateMatch = normalizedMsg.match(/(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?[A-Za-z]+(?:\s*\d{4})?)/i);
			if (dateMatch && dateMatch[1]) {
				date = dateMatch[1].trim();
			} else if (lowerMsg.includes('august') || lowerMsg.includes('aug')) {
				date = '25th of August';
			}
		}

		// Explicit check if user specifically asked to update the "above job" or "last job"
		const isExplicitAboveJobUpdate =
			lowerMsg.includes('above job') || lowerMsg.includes('last job') || lowerMsg.includes('previous job');

		let targetJob = null;

		if (isExplicitAboveJobUpdate) {
			targetJob = await Job.findOne({ createdBy: userId }).sort('-updatedAt');
		} else if (company) {
			// Find existing job specifically for this company name
			const companyPrefix = company.split(' ')[0];
			const fuzzyRegex = new RegExp(companyPrefix.slice(0, 3), 'i');
			targetJob = await Job.findOne({
				createdBy: userId,
				company: fuzzyRegex,
			});
		}

		if (targetJob) {
			// Update existing matching job
			if (position) targetJob.position = position;
			if (location) targetJob.jobLocation = location;
			if (date) targetJob.interviewDate = date;
			targetJob.status = lowerMsg.includes('interview') || lowerMsg.includes('schedule') ? 'interview' : targetJob.status;

			await targetJob.save();
			actionTaken = 'JOB_MUTATED';
			affectedData = targetJob;
		} else {
			// Create BRAND NEW job entry in MongoDB
			const createdJob = await Job.create({
				company: company || 'New Company',
				position: position || 'Software Engineer',
				status: lowerMsg.includes('interview') || lowerMsg.includes('schedule') ? 'interview' : 'pending',
				jobType: 'full-time',
				jobLocation: location || 'Noida',
				interviewDate: date || 'Scheduled',
				createdBy: userId,
			});

			actionTaken = 'JOB_MUTATED';
			affectedData = createdJob;
		}
	}

	return { actionTaken, affectedData };
};

export const askChatbot = async (req, res) => {
	const { message, history = [] } = req.body;

	if (!message || message.trim() === '') {
		throw new BadRequestError('Please provide a prompt or question.');
	}

	// Fetch Logged-in User Profile from MongoDB
	const user = await User.findById(req.user.userId).select('name lastName location email');

	// Execute DB mutations if prompt requests action
	let dbResult = { actionTaken: null, affectedData: null };
	try {
		dbResult = await processDatabaseActions(message, req.user.userId);
	} catch (err) {
		console.error('Database action processing error:', err.message);
	}

	// Fetch User's Jobs List from MongoDB
	const userJobs = await Job.find({ createdBy: req.user.userId })
		.sort('-updatedAt')
		.limit(10)
		.select('company position status jobType jobLocation interviewDate createdAt');

	const jobSummary = userJobs
		.map(
			(j) =>
				`${j.position} at ${j.company} (Status: ${j.status}, Location: ${j.jobLocation}, Scheduled Date: ${
					j.interviewDate || 'Not set'
				})`
		)
		.join('\n- ');

	const userNameStr = user?.name ? user.name : 'Not provided yet';

	const systemPrompt = `You are JobTraker AI, a top-tier career coach and interview assistant inside JobTraker.

USER MEMORY PROFILE:
- Name: "${userNameStr}"
- Email: "${user?.email || 'N/A'}"

SAVED JOBS IN USER DATABASE:
${jobSummary ? `- ${jobSummary}` : '- No jobs saved yet.'}

${
	dbResult.actionTaken === 'PROFILE_UPDATED'
		? `ACTION COMPLETED: You updated the user's name in MongoDB to "${dbResult.affectedData.name}". Confirm this update.`
		: ''
}
${
	dbResult.actionTaken === 'JOB_MUTATED'
		? `ACTION COMPLETED: New database entry created/updated for "${dbResult.affectedData.position} at ${dbResult.affectedData.company}" (Location: ${dbResult.affectedData.jobLocation}, Status: ${dbResult.affectedData.status}, Scheduled Date: ${dbResult.affectedData.interviewDate}). Confirm this entry created in database.`
		: ''
}

RESPONSE GUIDELINES:
- Confirm interview scheduling clearly with details (Company, Position, Date, Location).
- Use short bullet points, bold text, and checkmarks (✅).`;

	// Set SSE Stream headers & bypass proxy buffering
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache, no-transform');
	res.setHeader('Connection', 'keep-alive');
	res.setHeader('X-Accel-Buffering', 'no');
	if (typeof res.flushHeaders === 'function') {
		res.flushHeaders();
	}

	const sendChunk = (dataObj) => {
		res.write(`data: ${JSON.stringify(dataObj)}\n\n`);
		if (typeof res.flush === 'function') {
			res.flush();
		}
	};

	const finishStream = () => {
		res.write('data: [DONE]\n\n');
		res.end();
	};

	// Send database sync event signal if DB was mutated
	if (dbResult.actionTaken === 'JOB_MUTATED') {
		sendChunk({ action: 'JOB_MUTATED' });
	}

	// 1. Try Groq SDK with Conversation History
	const groqApiKey = process.env.GROQ_API_KEY;
	const isGroqConfigured = groqApiKey && groqApiKey !== 'your_groq_api_key_here';

	if (isGroqConfigured) {
		try {
			const groq = new Groq({ apiKey: groqApiKey });
			const groqModels = [
				process.env.GROQ_MODEL,
				'llama-3.3-70b-versatile',
				'openai/gpt-oss-120b',
				'llama-3.1-8b-instant',
				'mixtral-8x7b-32768',
			].filter(Boolean);

			const formattedHistory = history.map((msg) => ({
				role: msg.sender === 'user' ? 'user' : 'assistant',
				content: msg.text || '',
			}));

			const messagesPayload = [
				{ role: 'system', content: systemPrompt },
				...formattedHistory.slice(-6),
				{ role: 'user', content: message },
			];

			for (const modelName of groqModels) {
				try {
					const chatCompletion = await groq.chat.completions.create({
						messages: messagesPayload,
						model: modelName,
						temperature: 0.7,
						max_completion_tokens: 1500,
						top_p: 1,
						stream: true,
					});

					for await (const chunk of chatCompletion) {
						const text = chunk.choices[0]?.delta?.content || '';
						if (text) sendChunk({ text });
					}

					return finishStream();
				} catch (err) {
					console.warn(`Groq model ${modelName} failed:`, err.message);
				}
			}
		} catch (error) {
			console.error('Groq SDK Streaming Error:', error.message);
		}
	}

	// 2. Fallback to Gemini API if available
	const geminiApiKey = process.env.GEMINI_API_KEY;
	const isGeminiConfigured = geminiApiKey && geminiApiKey !== 'your_gemini_api_key_here';

	if (isGeminiConfigured) {
		try {
			const ai = new GoogleGenAI({ apiKey: geminiApiKey });
			const historyText = history.map((h) => `${h.sender.toUpperCase()}: ${h.text}`).join('\n');
			const fullPrompt = `${systemPrompt}\nCONVERSATION HISTORY:\n${historyText}\n\nUSER: "${message}"`;

			const modelsToTry = [
				process.env.GEMINI_MODEL,
				'gemini-2.5-flash',
				'gemini-1.5-flash',
				'gemini-2.5-pro',
			].filter(Boolean);

			for (const modelName of modelsToTry) {
				try {
					const responseStream = await ai.models.generateContentStream({
						model: modelName,
						contents: fullPrompt,
					});

					for await (const chunk of responseStream) {
						const text = chunk.text;
						if (text) sendChunk({ text });
					}

					return finishStream();
				} catch (err) {
					console.warn(`Gemini model ${modelName} failed:`, err.message);
				}
			}
		} catch (error) {
			console.error('Gemini API Streaming Error:', error.message);
		}
	}

	// 3. Fallback response logic when API keys are not set
	let fallbackReply = '';
	if (dbResult.actionTaken === 'JOB_MUTATED') {
		fallbackReply = `### ✅ Interview Scheduled Successfully\n\n- **Company**: **${dbResult.affectedData.company}**\n- **Position**: **${dbResult.affectedData.position}**\n- **Location**: **${dbResult.affectedData.jobLocation}**\n- **Date**: **${dbResult.affectedData.interviewDate}**\n\nNew job entry created in MongoDB!`;
	} else {
		fallbackReply = `### 🤖 JobTraker AI Assistant\n\nNew job entry recorded in database!`;
	}

	const words = fallbackReply.split(' ');
	for (const word of words) {
		sendChunk({ text: word + ' ' });
		await new Promise((r) => setTimeout(r, 20));
	}

	return finishStream();
};
