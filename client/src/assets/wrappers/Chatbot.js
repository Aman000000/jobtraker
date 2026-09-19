import styled from 'styled-components';

const Wrapper = styled.div`
	position: fixed;
	bottom: 25px;
	right: 25px;
	z-index: 1000;

	.chat-toggle-btn {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: var(--primary-500);
		color: var(--white);
		border: none;
		box-shadow: var(--shadow-3);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.6rem;
		transition: var(--transition);

		&:hover {
			background: var(--primary-700);
			transform: scale(1.08);
		}
	}

	.chat-window {
		position: absolute;
		bottom: 75px;
		right: 0;
		width: 410px;
		height: 560px;
		background: var(--white);
		border-radius: 16px;
		box-shadow: var(--shadow-4);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid var(--grey-100);
		animation: slideUp 0.25s ease-out;

		@media (max-width: 480px) {
			width: 92vw;
			right: -10px;
			height: 80vh;
		}
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.chat-header {
		background: var(--primary-500);
		color: var(--white);
		padding: 0.9rem 1.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;

		.header-title {
			display: flex;
			align-items: center;
			gap: 0.6rem;

			h4 {
				margin: 0;
				font-size: 1.05rem;
				color: var(--white);
				font-weight: 600;
			}

			span {
				font-size: 0.72rem;
				background: rgba(255, 255, 255, 0.22);
				padding: 0.15rem 0.5rem;
				border-radius: 12px;
			}
		}

		.close-btn {
			background: transparent;
			border: none;
			color: var(--white);
			font-size: 1.2rem;
			cursor: pointer;
			display: flex;
			align-items: center;

			&:hover {
				opacity: 0.8;
			}
		}
	}

	.messages-container {
		flex: 1;
		padding: 0.9rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: var(--grey-50);
		scroll-behavior: smooth;
	}

	.message-bubble {
		max-width: 88%;
		padding: 0.7rem 0.95rem;
		border-radius: 14px;
		font-size: 0.88rem;
		line-height: 1.45;
		word-break: break-word;

		&.user {
			align-self: flex-end;
			background: var(--primary-500);
			color: var(--white);
			border-bottom-right-radius: 2px;
		}

		&.bot {
			align-self: flex-start;
			background: var(--white);
			color: var(--grey-900);
			border-bottom-left-radius: 2px;
			box-shadow: var(--shadow-1);
			border: 1px solid var(--grey-200);
			width: 100%;
			max-width: 92%;

			p {
				margin-bottom: 0.4rem;
				&:last-child {
					margin-bottom: 0;
				}
			}

			h1, h2, h3, h4 {
				margin: 0.4rem 0 0.25rem 0;
				font-size: 0.92rem;
				color: var(--primary-700);
				font-weight: 600;
			}

			ul, ol {
				padding-left: 1.1rem;
				margin: 0.35rem 0;
			}

			li {
				margin-bottom: 0.2rem;
			}

			hr {
				margin: 0.5rem 0;
				border: none;
				border-top: 1px solid var(--grey-200);
			}

			blockquote {
				margin: 0.4rem 0;
				padding: 0.3rem 0.6rem;
				background: var(--primary-50);
				border-left: 3px solid var(--primary-500);
				border-radius: 4px;
				font-size: 0.83rem;
			}

			.table-wrapper {
				overflow-x: auto;
				margin: 0.5rem 0;
				border-radius: 6px;
				border: 1px solid var(--grey-200);
			}

			table {
				width: 100%;
				border-collapse: collapse;
				font-size: 0.8rem;

				th, td {
					border: 1px solid var(--grey-200);
					padding: 0.3rem 0.5rem;
					text-align: left;
				}

				th {
					background: var(--grey-100);
					font-weight: 600;
					color: var(--grey-800);
				}
			}
		}
	}

	.quick-prompts {
		padding: 0.5rem 0.75rem;
		background: var(--white);
		border-top: 1px solid var(--grey-100);
		display: flex;
		gap: 0.4rem;
		overflow-x: auto;
		white-space: nowrap;

		.chip {
			background: var(--primary-50);
			color: var(--primary-700);
			border: 1px solid var(--primary-200);
			border-radius: 14px;
			padding: 0.28rem 0.65rem;
			font-size: 0.76rem;
			cursor: pointer;
			transition: var(--transition);

			&:hover {
				background: var(--primary-100);
			}
		}
	}

	.input-form {
		display: flex;
		padding: 0.65rem 0.75rem;
		background: var(--white);
		border-top: 1px solid var(--grey-100);
		gap: 0.5rem;

		input {
			flex: 1;
			border: 1px solid var(--grey-200);
			border-radius: 20px;
			padding: 0.55rem 0.95rem;
			font-size: 0.88rem;
			outline: none;

			&:focus {
				border-color: var(--primary-500);
			}
		}

		button {
			background: var(--primary-500);
			color: var(--white);
			border: none;
			border-radius: 50%;
			width: 36px;
			height: 36px;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			transition: var(--transition);

			&:hover {
				background: var(--primary-700);
			}

			&:disabled {
				background: var(--grey-300);
				cursor: not-allowed;
			}
		}
	}

	.typing-indicator {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 0.2rem 0.4rem;

		span {
			width: 6px;
			height: 6px;
			background: var(--grey-400);
			border-radius: 50%;
			animation: bounce 1.4s infinite ease-in-out both;

			&:nth-child(1) {
				animation-delay: -0.32s;
			}
			&:nth-child(2) {
				animation-delay: -0.16s;
			}
		}
	}

	@keyframes bounce {
		0%, 80%, 100% {
			transform: scale(0);
		}
		40% {
			transform: scale(1);
		}
	}
`;

export default Wrapper;
