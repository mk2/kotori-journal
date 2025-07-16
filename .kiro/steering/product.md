# Product Overview

Kotori Journal is a terminal-based journal application with AI-powered analysis and daily report generation. It allows users to quickly record daily thoughts and events through a CLI interface, with integrated Claude AI for analysis, summaries, and advice.

## Key Features

- Terminal-based journaling with rich CLI UI using Ink (React for CLI)
- Category management for organizing entries
- AI integration with Claude for questions, summaries, and advice
- Automatic daily report generation in Markdown format
- Search functionality by keywords and dates
- Server mode with Web UI and API endpoints
- Auto-save functionality to protect against data loss
- Chrome extension for browser history processing

## AI Triggers

- Questions: Include `？` in entries
- Summaries: Use `要約して` or `まとめて`
- Advice: Use `アドバイスして` or `助言をください`

## Data Storage

- Daily reports saved as `YYYY/MM/DD.md` in `kotori-journal-data/`
- Configuration stored in JSON files
- Temporary files in `.temp/` for auto-save