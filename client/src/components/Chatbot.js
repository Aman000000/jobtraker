import React, { useState, useRef, useEffect } from 'react';
import { FaRobot, FaTimes, FaPaperPlane } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppContext } from '../context/appContext';
import Wrapper from '../assets/wrappers/Chatbot';

const Chatbot = () => {
	const { getJobs } = useAppContext();

	const [isOpen, setIsOpen] = useState(false);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [messages, setMessages] = useState([
		{
			sender: 'bot',
			text: 'Hello! I am **JobTraker AI**, your career assistant. Ask me to add or update job applications and interviews directly in your database!',
		},
	]);

	const messagesEndRef = useRef(null);
	const targetTextRef = useRef('');
	const currentTextRef = useRef('');
	const tickerRef = useRef(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	useEffect(() => {
		if (isOpen) {
			scrollToBottom();
		}
	}, [messages, isOpen]);

	useEffect(() => {
		return () => {
			if (tickerRef.current) clearInterval(tickerRef.current);
		};
	}, []);

	const handleSend = async (textToSend) => {
		const query = textToSend || input;
		if (!query.trim() || loading) return;

		const userMsg = { sender: 'user', text: query };
		setMessages((prev) => [...prev, userMsg]);
		if (!textToSend) setInput('');
		setLoading(true);

		// Reset stream references
		targetTextRef.current = '';
		currentTextRef.current = '';

		// Append new bot message bubble for live streaming
		setMessages((prev) => [...prev, { sender: 'bot', text: '' }]);

		// Start smooth real-time typing animation loop (12ms tick)
		if (tickerRef.current) clearInterval(tickerRef.current);
		tickerRef.current = setInterval(() => {
			if (currentTextRef.current.length < targetTextRef.current.length) {
				const nextChars = targetTextRef.current.slice(
					currentTextRef.current.length,
					currentTextRef.current.length + 2
				);
				currentTextRef.current += nextChars;

				setMessages((prev) => {
					const newArr = [...prev];
					const lastMsg = newArr[newArr.length - 1];
					if (lastMsg && lastMsg.sender === 'bot') {
						lastMsg.text = currentTextRef.current;
					}
					return newArr;
				});
			}
		}, 12);

		try {
			const response = await fetch('/api/v1/chatbot', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ message: query, history: messages.slice(-8) }),
			});

			if (!response.ok) {
				throw new Error('Network response failed');
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let done = false;
			let buffer = '';

			while (!done) {
				const { value, done: readerDone } = await reader.read();
				done = readerDone;

				if (value) {
					buffer += decoder.decode(value, { stream: true });
					const blocks = buffer.split('\n\n');
					buffer = blocks.pop() || '';

					for (const block of blocks) {
						if (block.startsWith('data: ')) {
							const dataStr = block.replace('data: ', '').trim();
							if (dataStr === '[DONE]') break;
							try {
								const parsed = JSON.parse(dataStr);

								// Auto-refresh jobs list in React app if database was mutated by AI action
								if (parsed.action === 'JOB_MUTATED') {
									getJobs();
								}

								if (parsed.text) {
									targetTextRef.current += parsed.text;
								}
							} catch (err) {
								// Ignore JSON parse errors for incomplete chunks
							}
						}
					}
				}
			}

			// Ensure ticker catches up to final target text length
			await new Promise((resolve) => {
				const checkDone = setInterval(() => {
					if (currentTextRef.current.length >= targetTextRef.current.length) {
						clearInterval(checkDone);
						resolve();
					}
				}, 50);
			});
		} catch (error) {
			console.error('Streaming error:', error);
			if (!targetTextRef.current) {
				targetTextRef.current = '⚠️ Sorry, I encountered an issue fetching the response.';
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<Wrapper>
			{!isOpen && (
				<button className='chat-toggle-btn' onClick={() => setIsOpen(true)} title='Open AI Assistant'>
					<FaRobot />
				</button>
			)}

			{isOpen && (
				<div className='chat-window'>
					<div className='chat-header'>
						<div className='header-title'>
							<FaRobot />
							<h4>JobTraker AI</h4>
							<span>Live Agent</span>
						</div>
						<button className='close-btn' onClick={() => setIsOpen(false)}>
							<FaTimes />
						</button>
					</div>

					<div className='messages-container'>
						{messages.map((msg, index) => (
							<div key={index} className={`message-bubble ${msg.sender}`}>
								{msg.sender === 'bot' ? (
									<ReactMarkdown
										remarkPlugins={[remarkGfm]}
										components={{
											table: ({ node, ...props }) => (
												<div className='table-wrapper'>
													<table {...props} />
												</div>
											),
										}}
									>
										{msg.text || '...'}
									</ReactMarkdown>
								) : (
									msg.text
								)}
							</div>
						))}

						{loading && messages[messages.length - 1]?.text === '' && (
							<div className='message-bubble bot'>
								<div className='typing-indicator'>
									<span></span>
									<span></span>
									<span></span>
								</div>
							</div>
						)}
						<div ref={messagesEndRef} />
					</div>

					<div className='quick-prompts'>
						<button
							className='chip'
							onClick={() => handleSend('Add interview for Capgemini role SDE2 on 27 September')}
						>
							➕ Add Interview
						</button>
						<button className='chip' onClick={() => handleSend('Give me interview preparation tips')}>
							🎯 Interview Prep
						</button>
						<button className='chip' onClick={() => handleSend('Summarize my job applications status')}>
							📊 App Summary
						</button>
					</div>

					<form
						className='input-form'
						onSubmit={(e) => {
							e.preventDefault();
							handleSend();
						}}
					>
						<input
							type='text'
							placeholder='e.g. Add interview for Capgemini role SDE2...'
							value={input}
							onChange={(e) => setInput(e.target.value)}
						/>
						<button type='submit' disabled={loading || !input.trim()}>
							<FaPaperPlane />
						</button>
					</form>
				</div>
			)}
		</Wrapper>
	);
};

export default Chatbot;
