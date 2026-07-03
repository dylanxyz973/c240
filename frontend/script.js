// Profile icon on header
document.addEventListener("DOMContentLoaded", () => {

    const avatarBtn = document.getElementById("avatarBtn");
    const dropdownMenu = document.getElementById("dropdownMenu");
    const logoutOpt = document.getElementById("logoutOpt");

    if (avatarBtn && dropdownMenu) {
        avatarBtn.addEventListener("click", (event) => {
            event.stopPropagation();

            const isExpanded = avatarBtn.getAttribute("aria-expanded") === "true";
            avatarBtn.setAttribute("aria-expanded", !isExpanded);

            dropdownMenu.classList.toggle("show");
        });
    }

    if (logoutOpt) {
        logoutOpt.addEventListener("click", (event) => {
            event.preventDefault();
            if (confirm("Are you sure you want to log out?")) {
                window.location.href = "login.html";
            }
        });
    }

});

// BotPress chatbot
window.addEventListener('load', function () {
    function mountInline() {
        try {
            if (window.botpress.fabIframe) window.botpress.fabIframe.remove();
            if (window.botpress.webchatIframe) window.botpress.webchatIframe.remove();
            window.botpress.initialized = false;
            window.botpress.init({
                ...window.botpress,
                configuration: {
                    ...window.botpress.configuration,
                    color: '#C96442',
                    variant: 'soft',
                    themeMode: 'light',
                    radius: 2,
                    fontFamily: 'Inter',
                },
                selector: '#chat-mount',
            });
            window.botpress.on('webchat:ready', function () {
                window.botpress.open();
            });
        } catch (err) {
            console.error('Could not mount Botpress inline:', err);
        }
    }

    // Poll briefly for window.botpress since the generated script is deferred
    var tries = 0;
    var waitForBotpress = setInterval(function () {
        tries++;
        if (window.botpress && window.botpress.initialized) {
            clearInterval(waitForBotpress);
            mountInline();
        } else if (tries > 40) {
            clearInterval(waitForBotpress);
            console.error('Botpress did not initialize in time.');
        }
    }, 250);
});

// Profile form
const form = document.getElementById("profileForm");

// popup function
function showPopup(message) {
    alert(message);
}

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const interests = [...document.querySelectorAll('input[name="interests"]:checked')]
            .map(i => i.value);

        const profile = {
            name: document.getElementById("name").value,
            age: document.getElementById("age").value,
            school: document.getElementById("school").value,
            bio: document.getElementById("bio").value,
            interests: interests
        };

        try {
            const response = await fetch(
                "https://n8ngc.codeblazar.org/webhook/save-profile",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(profile)
                }
            );

            const text = await response.text();
            console.log("RAW RESPONSE:", text);

            let data = {};

            try {
                data = JSON.parse(text);
            } catch (err) {
                // fallback if backend returns plain text
                data = { message: text };
            }
            if (response.ok) {
                // Needed by Find Friends on chat.html
                localStorage.setItem("currentUser", profile.name);

                showPopup(data.message || "Profile saved successfully! 🎉");
                window.location.href = "chat.html";
            } else {
                showPopup(data.message || "Failed to save profile. Please try again.");
            }

        } catch (error) {
            console.error(error);
            showPopup("Network error. Please check your connection.");
        }
    });
}

// Show pop up message
function showPopup(message) {
    document.getElementById("popupMessage").textContent = message;
    document.getElementById("popup").classList.remove("hidden");
}

function closePopup() {
    document.getElementById("popup").classList.add("hidden");
}

// ======================
// FIND FRIENDS
// ======================

async function findFriends() {
    const currentUser = localStorage.getItem("currentUser");

    if (!currentUser) {
        alert("Please create your profile first.");
        return;
    }

    try {
        const response = await fetch(
            "https://n8ngc.codeblazar.org/webhook/find-friends",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: currentUser
                })
            }
        );

        const text = await response.text();
        console.log("Find Friends Response:", text);

        let matches = [];

        try {
            matches = JSON.parse(text);
        } catch {
            alert("No matches returned from workflow.");
            return;
        }

        displayMatches(matches);

    } catch (error) {
        console.error(error);
        alert("Unable to find friends.");
    }
}

function displayMatches(matches) {
    const container = document.getElementById("matches");
    if (!container) return;

    if (!matches || matches.length === 0) {
        container.innerHTML = `<p class="no-matches">No friends found yet.</p>`;
        return;
    }

    container.innerHTML = matches.map(m => `
        <div class="friend-card">
            <div class="friend-top">
                <span class="friend-avatar">${String(m.name || "?").charAt(0).toUpperCase()}</span>
                <h3>${m.name}</h3>
                <span class="match-badge">${m.compatibility}% match</span>
            </div>
            <div class="interest-tags">
                ${String(m.interests || "")
                    .split(",")
                    .filter(i => i.trim())
                    .map(i => `<span class="tag">${i.trim()}</span>`)
                    .join("")}
            </div>
            <button class="say-hi-btn" onclick="sayHi('${m.name}')">Say Hi</button>
        </div>
    `).join("");
}

let chatWith = null;
let pollTimer = null;

function sayHi(friendName) {
    chatWith = friendName;
    document.getElementById("chatTitle").textContent = friendName;
    document.getElementById("chatAvatar").textContent = friendName.charAt(0).toUpperCase();
    document.getElementById("chatPanel").classList.remove("hidden");
    document.getElementById("icebreakerHint")?.classList.add("hidden"); // clear old hint
    loadMessages();
    clearInterval(pollTimer);
    pollTimer = setInterval(loadMessages, 3000);
}

function closeChat() {
    console.log("Close button clicked!");
    clearInterval(pollTimer);
    chatWith = null;
    document.getElementById("chatPanel").classList.add("hidden");
}

async function loadMessages() {
    const me = localStorage.getItem("currentUser");
    try {
        const res = await fetch("https://n8ngc.codeblazar.org/webhook/get-messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userA: me, userB: chatWith })
        });
        const msgs = await res.json();
        renderMessages(msgs, me);
    } catch (e) {
        console.error(e);
    }
}

function renderMessages(msgs, me) {
    const box = document.getElementById("chatMessages");
    box.innerHTML = (msgs || []).map(m => `
        <div class="msg ${m.From === me ? "msg-me" : "msg-them"}">
            ${m.Text}
        </div>
    `).join("");
    box.scrollTop = box.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById("msgInput");
    const text = input.value.trim();
    if (!text || !chatWith) return;
    input.value = "";
    await fetch("https://n8ngc.codeblazar.org/webhook/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            from: localStorage.getItem("currentUser"),
            to: chatWith,
            text
        })
    });
    loadMessages();
}

async function getIcebreaker() {
    if (!chatWith) return;
    const hint = document.getElementById("icebreakerHint");
    hint.classList.remove("hidden");
    hint.textContent = "Lumi is thinking…";
    try {
        const res = await fetch("https://n8ngc.codeblazar.org/webhook/icebreaker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                from: localStorage.getItem("currentUser"),
                to: chatWith
            })
        });
        const data = await res.json();
        hint.textContent = "💡 " + (data.suggestion || "Just say hi — being first is already brave!");
    } catch (e) {
        hint.textContent = "💡 Just say hi — being first is already brave!";
    }
}