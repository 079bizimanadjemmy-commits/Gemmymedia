import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('ai-chat-toggle');
    const box = document.getElementById('ai-chat-box');
    const input = document.getElementById('ai-input');
    const sendBtn = document.getElementById('ai-send');
    const messagesContainer = document.getElementById('ai-messages');

    toggle.onclick = () => {
        box.style.display = box.style.display === 'flex' ? 'none' : 'flex';
        if (box.style.display === 'flex') {
            input.focus();
        }
    };

    const addMessage = (text, sender) => {
        const msg = document.createElement('div');
        msg.className = `message message-${sender}`;
        msg.textContent = text;
        messagesContainer.appendChild(msg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    const handleSend = async () => {
        const text = input.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        input.value = '';

        // Get current user and content for context
        const username = window.currentUser ? window.currentUser.username : 'Guest';
        const contentContext = window.all_content ? JSON.stringify(window.all_content.slice(0, 20)) : 'No content data available';

        try {
            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: text,
                config: {
                    systemInstruction: `You are GemmyMedia AI assistant. The current user is ${username}. 
                    Available content for recommendation: ${contentContext}.
                    
                    Your goals:
                    1. Provide personalized recommendations based on the user's name and available content.
                    2. Provide detailed descriptions of movies, series, and games.
                    3. Help users find narrated films by VJ Junior, VJ Sankara, and others.
                    4. Mention our dedicated Streaming section for watching films online.
                    5. Be polite, helpful, and use a friendly tone.
                    6. If the user is a guest, encourage them to sign up for a better experience.`
                }
            });

            addMessage(response.text, 'ai');
        } catch (error) {
            console.error('AI Error:', error);
            addMessage("Sorry, I'm having trouble connecting right now.", 'ai');
        }
    };

    sendBtn.onclick = handleSend;
    input.onkeypress = (e) => {
        if (e.key === 'Enter') handleSend();
    };
});
