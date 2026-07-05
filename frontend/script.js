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

app.get('/reset-password', (req, res) => {
    res.render('reset-password', {
        messages: req.flash('error'),
        question: req.flash('question'),
        username: req.flash('username')
        email : req.flash('email')
    });
});

app.post('/reset-password', (req, res) => {
    const { username, email, securityAnswer, newPassword } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ? AND security_answer = ?';
    if (username && securityAnswer && newPassword) {
        if (newPassword.length < 6) {
            req.flash('error', 'Password should be at least 6 or more characters long');
            req.flash('formData', req.body);
            return res.redirect('/reset-password');
        }
        db.query(sql, [username, email, securityAnswer], (err, results) => {
            if (err) {
                throw err;
            }

            if (results.length > 0) {
                const updateSql = 'UPDATE users SET password = SHA1(?) WHERE username = ?';
                db.query(updateSql, [newPassword, username, email], (err, updateResult) => {
                    if (err) {
                        throw err;
                    }
                    req.flash('success', 'Password reset successful! Please log in.');
                    res.redirect('/login');
                });
            } else {
                req.flash('error', 'Invalid username or security answer.');
                res.redirect('/reset-password');
            }
        });
    }
    else if (username) { // If only username is provided, fetch the security question
        const questionsql = 'SELECT * FROM users WHERE username = ?';
        db.query(questionsql, [username], (err, results) => {
            if (err) {
                throw err;
            }

            if (results.length > 0) {
                req.flash('question', results[0].security_question);
                req.flash('username', username);
                res.redirect('/reset-password');
            } else {
                req.flash('error', 'Username not found.');
                res.redirect('/reset-password');
            }
        });
    }
    else {
        req.flash('error', 'All fields are required.');
        res.redirect('/reset-password');
    }
});

app.get('/login', (req, res) => {
    res.render('login', {
        messages: req.flash('success'),
        errors: req.flash('error')
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }
