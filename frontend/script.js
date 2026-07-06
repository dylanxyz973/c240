const PROFILE_STORAGE_KEY = "userProfile";

function loadStoredProfile() {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!stored) return null;

    try {
        return JSON.parse(stored);
    } catch (err) {
        console.warn("Could not parse stored profile", err);
        return null;
    }
}

function saveStoredProfile(profile) {
    if (!profile) return;
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function loadStoredAuth() {
    return {
        name: localStorage.getItem('loggedInUser') || ''
    };
}

function getCurrentProfileData() {
    const savedProfile = loadStoredProfile() || {};
    const authProfile = loadStoredAuth();

    return {
        name: savedProfile.name || authProfile.name || '',
        age: savedProfile.age || '',
        school: savedProfile.school || '',
        bio: savedProfile.bio || '',
        interests: Array.isArray(savedProfile.interests) ? savedProfile.interests : []
    };
}

function populateProfileForm(profile) {
    if (!profile) return;

    const fields = ["name", "age", "school", "bio"];
    fields.forEach((field) => {
        const input = document.getElementById(field);
        if (input && profile[field] != null) {
            input.value = profile[field];
        }
    });

    document.querySelectorAll('input[name="interests"]').forEach((input) => {
        input.checked = Array.isArray(profile.interests) && profile.interests.includes(input.value);
    });
}

function populateProfileDisplay(profile) {
    const emptyMessage = document.getElementById("emptyProfileMessage");
    const displayName = document.getElementById("displayName");
    const displayAge = document.getElementById("displayAge");
    const displaySchool = document.getElementById("displaySchool");
    const displayBio = document.getElementById("displayBio");
    const displayInterests = document.getElementById("displayInterests");

    const hasProfile = profile && (
        profile.name || profile.age || profile.school || profile.bio ||
        (Array.isArray(profile.interests) && profile.interests.length)
    );

    if (!hasProfile) {
        if (emptyMessage) emptyMessage.classList.remove("hidden");
        if (displayName) displayName.textContent = "-";
        if (displayAge) displayAge.textContent = "-";
        if (displaySchool) displaySchool.textContent = "-";
        if (displayBio) displayBio.textContent = "-";
        if (displayInterests) displayInterests.innerHTML = "";
        return;
    }

    if (emptyMessage) emptyMessage.classList.add("hidden");
    if (displayName) displayName.textContent = profile.name || "-";
    if (displayAge) displayAge.textContent = profile.age || "-";
    if (displaySchool) displaySchool.textContent = profile.school || "-";
    if (displayBio) displayBio.textContent = profile.bio || "-";

    if (displayInterests) {
        if (Array.isArray(profile.interests) && profile.interests.length) {
            displayInterests.innerHTML = profile.interests.map((interest) => `
                <span class="tag">${interest}</span>
            `).join("");
        } else {
            displayInterests.innerHTML = `<span class="tag">No interests selected</span>`;
        }
    }
}

const form = document.getElementById("profileForm");

// Profile icon on header
document.addEventListener("DOMContentLoaded", () => {
    const avatarBtn = document.getElementById("avatarBtn");
    const dropdownMenu = document.getElementById("dropdownMenu");
    const logoutOpt = document.getElementById("logoutOpt");
    const editProfileBtn = document.getElementById("editProfileBtn");
    const storedProfile = getCurrentProfileData();

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

    if (editProfileBtn) {
        populateProfileDisplay(storedProfile);
        editProfileBtn.addEventListener("click", () => {
            window.location.href = "profile.html";
        });
    }

    if (form) {
        populateProfileForm(storedProfile);
    }

});

// BotPress chatbot
window.addEventListener('load', function () {
    function mountInline() {
        try {
            if (window.botpress.fabIframe) window.botpress.fabIframe.remove();
            if (window.botpress.webchatIframe) window.botpress.webchatIframe.remove();
            window.botpress.initialized = false;

            // Prefer an element with id 'chatbot' (user-provided). Fall back to 'chat-mount' if present.
            var containerSelector = null;
            if (document.getElementById('chatbot')) containerSelector = '#chatbot';
            else if (document.getElementById('chat-mount')) containerSelector = '#chat-mount';
            else containerSelector = 'body'; // last resort - attach to body

            // Determine the container element and read an optional data-config-url attribute from it.
            var containerEl = document.querySelector(containerSelector);
            // Optional remote config JSON (shareable config). Prefer the data-config-url attribute on the container.
            var remoteConfigUrl = (containerEl && containerEl.dataset && containerEl.dataset.configUrl) || 'https://files.bpcontent.cloud/2026/05/12/04/20260512040002-DAORQ82T.json';

            var initOptions = {
                ...window.botpress,
                configuration: {
                    ...window.botpress.configuration,
                    color: '#C96442',
                    variant: 'soft',
                    themeMode: 'light',
                    radius: 2,
                    fontFamily: 'Inter',
                },
                selector: containerSelector,
            };

            // If a remote config JSON is provided, pass it through so Botpress uses that configuration
            if (remoteConfigUrl) {
                initOptions.configUrl = remoteConfigUrl;
            }

            window.botpress.init(initOptions);
            window.botpress.on('webchat:ready', function () {
                // Inline chat is mounted into the selected container.
                // Do not call botpress.open() so the chat stays embedded instead of popping up.

                // Remove any floating FAB/popup that the Botpress script may have added.
                function removeFloating() {
                    try {
                        // Known references
                        if (window.botpress && window.botpress.fabIframe) {
                            window.botpress.fabIframe.remove();
                        }
                        if (window.botpress && window.botpress.webchatIframe && window.botpress.webchatIframe !== window.botpress._iframe) {
                            // remove any leftover iframe that is not our inline mount
                            window.botpress.webchatIframe.remove();
                        }

                        // Generic selectors to catch common floating elements
                        var selectors = [
                            '.bp-fab', '.botpress-fab', '.bp-widget', '.botpress-widget', '.webchat-fab', '[data-botpress-fab]'
                        ];
                        selectors.forEach(function (s) {
                            document.querySelectorAll(s).forEach(function (el) { el.remove(); });
                        });

                        // Remove iframes that look like botpress popups
                        document.querySelectorAll('iframe').forEach(function (ifrm) {
                            try {
                                var src = ifrm.getAttribute('src') || '';
                                if (/botpress|bpcontent|bp-webchat/.test(src)) ifrm.remove();
                            } catch (e) { }
                        });
                    } catch (e) {
                        console.warn('Error removing floating botpress elements', e);
                    }
                }

                removeFloating();

                // Watch briefly for DOM nodes that match floating selectors and remove them if they appear
                var observer = new MutationObserver(function (mutations, obs) {
                    var found = false;
                    mutations.forEach(function (m) {
                        m.addedNodes.forEach(function (n) {
                            if (!(n instanceof HTMLElement)) return;
                            var outer = n.outerHTML || '';
                            if (/botpress|bp-fab|bp-widget|botpress-fab|webchat-fab/i.test(outer)) {
                                found = true;
                                try { n.remove(); } catch (e) { }
                            }
                        });
                    });
                    if (found) removeFloating();
                });

                // Observe for a short window (5s) to catch late insertions
                observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
                setTimeout(function () { observer.disconnect(); }, 5000);
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

// Popup function
function showPopup(message) {
    alert(message);
}

if (form) {
    form.addEventListener("submit", async (e) => {
    e.preventDefault();

    console.log("✅ Save Profile button clicked");

    const interests = [
        ...document.querySelectorAll('input[name="interests"]:checked')
    ].map(i => i.value);

    const profile = {
        name: document.getElementById("name").value.trim(),
        age: document.getElementById("age").value,
        school: document.getElementById("school").value.trim(),
        bio: document.getElementById("bio").value.trim(),
        interests: interests
    };

    console.log("📤 Sending profile:", profile);

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

        console.log("Response Status:", response.status);

        const text = await response.text();
        console.log("Raw Response:", text);

        let data;

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
        console.error("Fetch Error:", error);
        showPopup("Network error. Please check the console.");
    }
});
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
let pollTimer = null;

function sayHi(friendName) {
    chatWith = friendName;
    document.getElementById("chatTitle").textContent = friendName;
    document.getElementById("chatAvatar").textContent = friendName.charAt(0).toUpperCase();
    document.getElementById("chatPanel").classList.remove("hidden");
    document.getElementById("icebreakerHint")?.classList.add("hidden");

    sendHello(friendName);

    clearInterval(pollTimer);
    pollTimer = setInterval(loadMessages, 3000);
}

async function sendHello(friendName) {
    await postMessage(friendName, "Hello 👋");
    loadMessages();
}

async function postMessage(to, message) {
    try {
        await fetch("https://n8ngc.codeblazar.org/webhook/say-hi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sender: localStorage.getItem("currentUser"),
                receiver: to,
                message: message
            })
        });
    } catch (e) { console.error(e); }
}

function renderMessages(msgs, me) {
    const box = document.getElementById("chatMessages");
    box.innerHTML = (msgs || []).map(m => `
        <div class="msg ${m.Sender === me ? "msg-me" : "msg-them"}">
            ${m.Message}
        </div>
    `).join("");
    box.scrollTop = box.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById("msgInput");
    const text = input.value.trim();
    if (!text || !chatWith) return;
    input.value = "";
    await postMessage(chatWith, text);
    loadMessages();
}

function closeChat() {
    clearInterval(pollTimer);
    chatWith = null;
    document.getElementById("chatPanel").classList.add("hidden");
}

async function loadMessages() {
    if (!chatWith) return;
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

// a
const checkAuthenticated = (req, res, next)=>{
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Pls log in to view this resource');
        res.redirect('/login');  
    }
};
