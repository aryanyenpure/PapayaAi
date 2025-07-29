const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toggle-btn");

const API_KEY = "Api_Key";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

let typingInterval, controller;
const chatHistory = [];
const userData = { message: "", file: null };

// Function to create message element
const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
};



let autoScrollEnabled = true;

const scrollToBottom = () => {
    if (autoScrollEnabled) {
        container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth"
        });
    }
};

// Detect manual user scroll
container.addEventListener("scroll", () => {
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 10;

    if (atBottom) {
        autoScrollEnabled = true;
    } else {
        autoScrollEnabled = false;
    }
});



// Typing effect
const typingEffect = (text, textElement, botMsgDiv) => {
    textElement.textContent = "";
    const words = text.split(" ");
    let wordIndex = 0;

    typingInterval = setInterval(() => {
        if (wordIndex < words.length) {
            textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
            botMsgDiv.classList.add("loading");
            scrollToBottom();
        } else {
            clearInterval(typingInterval);
            botMsgDiv.classList.remove("loading");
            document.body.classList.remove("bot-responding");
        }
    }, 40);
};

// API request and response
const generateResponse = async (botMsgDiv) => {
    const textElement = botMsgDiv.querySelector(".message-text");
    controller = new AbortController();

    // Construct API payload
    let parts = [{ text: userData.message }];
    if (userData.file) {
        parts.push({
            inline_data: {
                mime_type: userData.file.mime_type,
                data: userData.file.data
            }
        });
    }

    chatHistory.push({ role: "user", parts });

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ role: "user", parts }] }),
            signal: controller.signal
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);

        // Extract text response
        const responseParts = data.candidates[0].content.parts;
        let responseText = responseParts.map(part => part.text || "").join("\n").trim();

        typingEffect(responseText, textElement, botMsgDiv);
        chatHistory.push({ role: "model", parts: [{ text: responseText }] });

    } catch (error) {
        textElement.style.color = "#d62939";
        textElement.textContent = error.name === "AbortError" ? "Response generation stopped" : error.message;
        botMsgDiv.classList.remove("loading");
        document.body.classList.remove("bot-responding");
        scrollToBottom();
    } finally {
        userData.file = null;
    }
};

// Handle form submission
const handleFormSubmit = (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();

    if (!userMessage && !userData.file) return;  // Prevent empty messages

    promptInput.value = "";
    userData.message = userMessage;
    document.body.classList.add("bot-responding", "chats-active");
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");

    // Construct user message display
    let userMsgHTML = `<p class="message-text">${userMessage}</p>`;

    if (userData.file) {
        userMsgHTML += userData.file.isImage
            ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment"/>`
            : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`;
    }

    const userMsgDiv = createMsgElement(userMsgHTML, "user-message");
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();

    setTimeout(() => {
        const botMsgHTML = `<img src="PLAI.svg" class="avatar"><p class="message-text">Processing...</p>`;
        const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");
        chatsContainer.appendChild(botMsgDiv);
        scrollToBottom();
        generateResponse(botMsgDiv);
    }, 600);
};

// Handle file input change
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
        fileInput.value = "";
        const base64String = e.target.result.split(",")[1];
        fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
        fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

        userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
    };
});

// Cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
    userData.file = null;
});

// Stop response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
    userData.file = null;
    controller?.abort();
    clearInterval(typingInterval);
    chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
    document.body.classList.add("bot-responding");
});

// Delete chats
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
    chatHistory.length = 0;
    chatsContainer.innerHTML = "";
    document.body.classList.remove("bot-responding", "chats-active");
});

// Handle suggestion click
document.querySelectorAll(".suggestion-item").forEach(item => {
    item.addEventListener("click", () => {
        promptInput.value = item.querySelector(".text").textContent;
        promptForm.dispatchEvent(new Event("submit"));
    });
});

// Show/hide controls for mobile
document.addEventListener("click", ({ target }) => {
    const wrapper = document.querySelector(".prompt-wrapper");
    const shouldHide = target.classList.contains("prompt-input") ||
        (wrapper.classList.contains("hide-controls") &&
            (target.id === "add-file-btn" || target.id === "stop-response-btn"));
    wrapper.classList.toggle("hide-controls", shouldHide);
});

// Toggle theme
themeToggle.addEventListener("click", () => {
    const isLightTheme = document.body.classList.toggle("light-theme");
    localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
    themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";
});

// Set initial theme
const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";

promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());
