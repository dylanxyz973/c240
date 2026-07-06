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
            showConfirmPopup("We'll miss you! Ready to log out?", () => {
                window.location.href = "login.html";
            });
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
    const popup = document.getElementById("popup");
    const popupMessage = document.getElementById("popupMessage");
    const popupOkBtn = document.getElementById("popupOkBtn");
    const popupConfirmBtn = document.getElementById("popupConfirmBtn");
    const popupCancelBtn = document.getElementById("popupCancelBtn");

    if (!popup || !popupMessage) return;

    popupMessage.textContent = message;

    if (popupOkBtn) {
        popupOkBtn.textContent = "OK";
        popupOkBtn.classList.remove("hidden");
    }
    if (popupConfirmBtn) {
        popupConfirmBtn.textContent = "Yes";
        popupConfirmBtn.classList.add("hidden");
    }
    if (popupCancelBtn) {
        popupCancelBtn.textContent = "No";
        popupCancelBtn.classList.add("hidden");
    }

    popup.classList.remove("hidden");
}

function showConfirmPopup(message, onConfirm) {
    const popup = document.getElementById("popup");
    const popupMessage = document.getElementById("popupMessage");
    const popupOkBtn = document.getElementById("popupOkBtn");
    const popupConfirmBtn = document.getElementById("popupConfirmBtn");
    const popupCancelBtn = document.getElementById("popupCancelBtn");

    if (!popup || !popupMessage) return;

    popupMessage.textContent = message;

    if (popupOkBtn) {
        popupOkBtn.textContent = "OK";
        popupOkBtn.classList.add("hidden");
    }
    if (popupConfirmBtn) {
        popupConfirmBtn.textContent = "Yes";
        popupConfirmBtn.classList.remove("hidden");
        popupConfirmBtn.onclick = () => {
            popup.classList.add("hidden");
            onConfirm();
        };
    }
    if (popupCancelBtn) {
        popupCancelBtn.classList.remove("hidden");
        popupCancelBtn.onclick = () => popup.classList.add("hidden");
    }

    popup.classList.remove("hidden");
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

function closePopup() {
    const popup = document.getElementById("popup");
    if (popup) popup.classList.add("hidden");
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

let allMatches = [];

function displayMatches(matches) {
    allMatches = matches || [];
    const toolbar = document.getElementById("matchesToolbar");

    if (allMatches.length === 0) {
        if (toolbar) toolbar.classList.add("hidden");
        renderMatchCards([]);
        return;
    }

    if (toolbar) toolbar.classList.remove("hidden");
    buildInterestChips();
    renderMatchCards(allMatches);
}

function buildInterestChips() {
    const chipBox = document.getElementById("interestChips");
    if (!chipBox) return;

    const interests = new Set();
    allMatches.forEach(m =>
        String(m.interests || "").split(",").forEach(i => {
            const t = i.trim();
            if (t) interests.add(t);
        })
    );

    chipBox.innerHTML =
        `<button class="chip chip-active" data-tag="all" onclick="selectChip(this)">All</button>` +
        [...interests].map(i =>
            `<button class="chip" data-tag="${i}" onclick="selectChip(this)">${i}</button>`
        ).join("");
}

function selectChip(btn) {
    document.querySelectorAll("#interestChips .chip")
        .forEach(c => c.classList.remove("chip-active"));
    btn.classList.add("chip-active");
    applyFilters();
}

function applyFilters() {
    const q = (document.getElementById("friendSearch")?.value || "").trim().toLowerCase();
    const activeChip = document.querySelector("#interestChips .chip-active");
    const tag = activeChip ? activeChip.dataset.tag : "all";

    let list = allMatches;

    if (tag !== "all") {
        list = list.filter(m =>
            String(m.interests || "").toLowerCase().includes(tag.toLowerCase()));
    }
    if (q) {
        list = list.filter(m =>
            String(m.name || "").toLowerCase().includes(q));
    }

    renderMatchCards(list);
}

function renderMatchCards(matches) {
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

async function sayHi(friendName) {
    chatWith = friendName;

    document.getElementById("chatTitle").textContent = friendName;
    document.getElementById("chatAvatar").textContent =
        friendName.charAt(0).toUpperCase();
    document.getElementById("chatPanel").classList.remove("hidden");

    const box = document.getElementById("chatMessages");

    // Clear old messages when opening a new chat
    box.innerHTML = "";

    try {
        const response = await fetch(
            "https://n8ngc.codeblazar.org/webhook/say-hi",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    sender: localStorage.getItem("currentUser"),
                    receiver: friendName,
                    message: "Hello 👋"
                })
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        // Show the hello message immediately
        box.innerHTML += `
            <div class="msg msg-me">
                Hello 👋
            </div>
        `;
        box.scrollTop = box.scrollHeight;

        console.log("Hi sent!");
    } catch (err) {
        console.error("Failed to send hi:", err);
        alert("Failed to send hi.");
    }
}

function closeChat() {
    chatWith = null;
    document.getElementById("chatPanel").classList.add("hidden");
}

async function getIcebreaker() {
    if (!chatWith) return;

    const hint = document.getElementById("icebreakerHint");
    hint.classList.remove("hidden");
    hint.textContent = "Lumi is thinking…";

    try {
        const res = await fetch(
            "https://n8ngc.codeblazar.org/webhook/icebreaker",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    from: localStorage.getItem("currentUser"),
                    to: chatWith
                })
            }
        );

        const data = await res.json();

        hint.textContent =
            "💡 " +
            (data.suggestion ||
                "Just say hi — being first is already brave!");
    } catch (e) {
        hint.textContent =
            "💡 Just say hi — being first is already brave!";
    }
}

// a
const checkAuthenticated = (req, res, next)=>{
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Pls log in to view this resource');
        res.redirect('/login');  
    }
};
