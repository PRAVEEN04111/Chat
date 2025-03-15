const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion");
const toggleThemeButton = document.querySelector("#theme-toggle-button");
const deleteChatButton = document.querySelector("#delete-chat-button");
const sendMessageButton = document.querySelector("#send-message-button");
const microphoneButton = document.querySelector("#microphone-button");

// State variables
let userMessage = null;
let isResponseGenerating = false;
let recognition;

// API configuration
// Replace API_KEY with a secure method in production environments
const API_KEY = "AIzaSyDVyHAKBQ003gsCsaHd8pUtvCbqmmYkwJs";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Load theme and chat data from local storage on page load
const loadDataFromLocalstorage = () => {
    const savedChats = localStorage.getItem("saved-chats");
    const isLightMode = localStorage.getItem("themeColor") === "light_mode";

    document.body.classList.toggle("light_mode", isLightMode);
    toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";

    chatContainer.innerHTML = savedChats || "";
    document.body.classList.toggle("hide-header", !!savedChats);

    chatContainer.scrollTo(0, chatContainer.scrollHeight);
};

// Create a new message element and return it
const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
};

// Show typing effect by displaying words one by one
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
    const words = text.split(" ");
    let currentWordIndex = 0;

    const typingInterval = setInterval(() => {
        textElement.innerText += (currentWordIndex === 0 ? "" : " ") + words[currentWordIndex++];
        incomingMessageDiv.querySelector(".icon").classList.add("hide");

        if (currentWordIndex === words.length) {
            clearInterval(typingInterval);
            isResponseGenerating = false;
            incomingMessageDiv.querySelector(".icon").classList.remove("hide");
            localStorage.setItem("saved-chats", chatContainer.innerHTML);
        }
        chatContainer.scrollTo(0, chatContainer.scrollHeight);
    }, 75);
};

// Function to get conversation history from local storage
const getConversationHistory = () => {
    const history = JSON.parse(localStorage.getItem("conversationHistory") || "[]");
    return history;
};

// Function to add a message to the conversation history
const addToConversationHistory = (role, message) => {
    const history = getConversationHistory();
    history.push({ role, parts: [{ text: message }] });
    localStorage.setItem("conversationHistory", JSON.stringify(history));
};

// Fetch response from the API based on user message and conversation history
const generateAPIResponse = async (incomingMessageDiv) => {
    const textElement = incomingMessageDiv.querySelector(".text");
    const history = getConversationHistory();

    let combinedMessage = history.map(item => `${item.role}: ${item.parts[0].text}`).join("\n");
    combinedMessage += `\nUser: ${userMessage}`;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: combinedMessage }] }],
            }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);

        const apiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/\*\*(.*?)\*\*/g, "$1") || "No response received.";
        showTypingEffect(apiResponse, textElement, incomingMessageDiv);
        addToConversationHistory("model", apiResponse);

    } catch (error) {
        isResponseGenerating = false;
        const errorMessage = error.message || "An unexpected error occurred. Please try again later.";
        textElement.innerText = errorMessage;
        textElement.parentElement.closest(".message").classList.add("error");
    } finally {
        incomingMessageDiv.classList.remove("loading");
    }
};

// Show a loading animation while waiting for the API response
const showLoadingAnimation = () => {
    const html = `<div class="message-content">
                    <img class="avatar" src="bot.jpeg" alt="bot.jpeg">
                    <p class="text"></p>
                    <div class="loading-indicator">
                        <div class="loading-bar"></div>
                        <div class="loading-bar"></div>
                        <div class="loading-bar"></div>
                    </div>
                </div>
                <span class="icon material-symbols-rounded copy-icon">content_copy</span>`;

    const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
    chatContainer.appendChild(incomingMessageDiv);

    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    generateAPIResponse(incomingMessageDiv);
};

// Copy message text to the clipboard
const copyMessage = (copyButton) => {
    const messageText = copyButton.parentElement.querySelector(".text").innerText;

    navigator.clipboard.writeText(messageText);
    copyButton.innerText = "done";
    setTimeout(() => (copyButton.innerText = "content_copy"), 1000);
};

// Handle sending outgoing chat messages
const handleOutgoingChat = () => {
    userMessage = typingForm.querySelector(".typing-input").value.trim() || userMessage;
    if (!userMessage || isResponseGenerating) return;

    isResponseGenerating = true;

    const html = `<div class="message-content">
                    <img class="avatar" src="obito.jpeg" alt="obito.jpeg">
                    <p class="text"></p>
                    <span class="icon material-symbols-rounded copy-icon">content_copy</span>
                </div>`;

    const outgoingMessageDiv = createMessageElement(html, "outgoing");
    outgoingMessageDiv.querySelector(".text").innerText = userMessage;
    chatContainer.appendChild(outgoingMessageDiv);

    typingForm.reset();
    document.body.classList.add("hide-header");
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    addToConversationHistory("user", userMessage);
    setTimeout(showLoadingAnimation, 500);
};

// Toggle between light and dark themes
toggleThemeButton.addEventListener("click", () => {
    const isLightMode = document.body.classList.toggle("light_mode");
    localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode");
    toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
});

// Delete all chats from local storage when button is clicked
const clearChatAndHistory = () => {
    localStorage.removeItem("saved-chats");
    localStorage.removeItem("conversationHistory");
    loadDataFromLocalstorage();
};

deleteChatButton.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete all the chats?")) {
        clearChatAndHistory();
    }
});

// Set userMessage and handle outgoing chat when a suggestion is clicked
suggestions.forEach((suggestion) => {
    suggestion.addEventListener("click", () => {
        userMessage = suggestion.querySelector(".text").innerText;
        handleOutgoingChat();
    });
});

// Prevent default form submission and handle outgoing chat
typingForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleOutgoingChat();
});

// Initialize speech recognition
const initializeSpeechRecognition = () => {
    if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
        alert("Speech recognition is not supported in this browser.");
        return;
    }

    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.continuous = true;

    recognition.onstart = () => {
        microphoneButton.classList.add("recording");
    };

    recognition.onend = () => {
        microphoneButton.classList.remove("recording");
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        console.log("Speech recognition result:", transcript);

        typingForm.querySelector(".typing-input").value = transcript;
        userMessage = transcript;

        handleOutgoingChat();
    };

    recognition.onerror = (event) => {
        alert(`Speech recognition error: ${event.error}`);
    };
};

microphoneButton.addEventListener("click", () => {
    if (microphoneButton.classList.contains("recording")) {
        recognition.stop();
        microphoneButton.classList.remove("recording");
    } else {
        recognition.start();
        microphoneButton.classList.add("recording");
    }
});

sendMessageButton.addEventListener("click", handleOutgoingChat);

// Initialize the app
loadDataFromLocalstorage();
initializeSpeechRecognition();
